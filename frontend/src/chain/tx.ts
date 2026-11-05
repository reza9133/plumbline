import { CONTRACT_ADDRESS } from '../config';
import type { Eip1193Provider } from '../wallet/eip6963';

export type WriteArg = string | number | boolean;

export interface WriteRequest {
  fn: 'create_covenant' | 'add_tenet' | 'activate' | 'cancel' | 'top_up' | 'inspect' | 'mature' | 'collect';
  args: WriteArg[];
  value?: bigint;
}

export type TxStage = 'wallet' | 'submitted' | 'consensus' | 'decided';

export interface TxProgress {
  stage: TxStage;
  hash?: string;
  /** The network's status name while consensus runs: PENDING, PROPOSING, COMMITTING, REVEALING, ACCEPTED … */
  status?: string;
}

export interface TxOutcome {
  ok: boolean;
  hash: string;
  status: string;
  /** The value the contract method returned, when it can be read from the receipt. */
  returned?: unknown;
  /** A short message for people when the call was refused. */
  failure?: string;
  /** Raw detail for the "technical details" fold. */
  detail?: string;
}

const DECIDED = new Set([
  'ACCEPTED',
  'FINALIZED',
  'UNDETERMINED',
  'CANCELED',
  'LEADER_TIMEOUT',
  'VALIDATORS_TIMEOUT',
]);
const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const id = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(id);
      reject(new DOMException('aborted', 'AbortError'));
    });
  });

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null;

const replacer = (_k: string, v: unknown) => (typeof v === 'bigint' ? v.toString() : v);
const dump = (v: unknown): string => {
  try {
    return JSON.stringify(v ?? null, replacer) ?? '';
  } catch {
    return String(v);
  }
};

const FAIL = /ERROR|REVERT|FAIL/i;
const PASS = /RETURN|SUCCESS/i;

function leaderOf(receipt: unknown): Obj | undefined {
  if (!isObj(receipt)) return undefined;
  const cd = receipt.consensus_data;
  const direct = isObj(cd) ? cd.leader_receipt : undefined;
  const fromData = isObj(receipt.data) ? receipt.data.leader_receipt : undefined;
  const list = [direct, fromData, receipt.leader_receipt].find(Array.isArray) as unknown[] | undefined;
  const first = list?.[0];
  return isObj(first) ? first : undefined;
}

/** Reads the outcome of a decided transaction without relying on one exact receipt shape (see scripts/receipt.mjs). */
export function outcomeOf(receipt: unknown): { ok: boolean; known: boolean; status: string; detail: string } {
  const r = isObj(receipt) ? receipt : {};
  const named = String(r.statusName ?? r.status_name ?? '');
  const leader = leaderOf(receipt);
  const lr = leader?.result;
  const direct = [
    r.txExecutionResultName,
    r.resultName,
    leader?.execution_result,
    isObj(lr) ? lr.status : undefined,
  ];
  for (const v of direct) {
    if (typeof v !== 'string' || !v) continue;
    if (FAIL.test(v))
      return {
        ok: false,
        known: true,
        status: `${named || 'decided'} / ${v}`,
        detail: dump(leader ?? receipt).slice(0, 1600),
      };
    if (PASS.test(v)) return { ok: true, known: true, status: `${named || 'decided'} / ${v}`, detail: '' };
  }
  const text = dump(receipt);
  if (/FINISHED_WITH_ERROR|"execution_result"\s*:\s*"ERROR"/.test(text))
    return { ok: false, known: true, status: `${named || 'decided'} / error`, detail: text.slice(0, 1600) };
  if (/FINISHED_WITH_RETURN|"execution_result"\s*:\s*"SUCCESS"/.test(text))
    return { ok: true, known: true, status: `${named || 'decided'} / success`, detail: '' };
  return {
    ok: false,
    known: false,
    status: `unreadable receipt (${Object.keys(r).slice(0, 8).join(', ') || 'empty'})`,
    detail: text.slice(0, 1600),
  };
}

/** The contract's own message from a refused call ("Only the publisher can do that."), when it can be found. */
export function failureMessage(receipt: unknown): string | undefined {
  const leader = leaderOf(receipt);
  const candidates: unknown[] = [];
  if (leader) {
    const res = leader.result;
    if (isObj(res)) candidates.push(res.payload, res.message);
    else candidates.push(res);
    const gv = leader.genvm_result;
    if (isObj(gv)) candidates.push(gv.stderr, gv.stdout);
    candidates.push(leader.stderr);
  }
  for (const c of candidates) {
    if (typeof c !== 'string' || !c.trim()) continue;
    const quoted =
      /UserError\(["']([^"']{3,300})["']/.exec(c) ??
      /(?:Error|Exception)[^"'\n]*["']([A-Z][^"']{6,300})["']/.exec(c);
    if (quoted?.[1]) return quoted[1];
    const lines = c
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    const last = lines[lines.length - 1];
    if (last) return last.slice(0, 300);
  }
  return undefined;
}

function returnedValue(receipt: unknown): unknown {
  const res = leaderOf(receipt)?.result;
  if (isObj(res) && 'payload' in res && (res.status === 'return' || res.status === undefined))
    return res.payload;
  return undefined;
}

export class UserRejectedError extends Error {
  constructor() {
    super('You rejected the request in your wallet.');
    this.name = 'UserRejectedError';
  }
}

/** Plain-language text for errors thrown while talking to the wallet or the network. */
export function explainError(e: unknown): string {
  if (e instanceof UserRejectedError) return e.message;
  const err = isObj(e) ? e : {};
  const code = typeof err.code === 'number' ? err.code : undefined;
  const msg = typeof err.message === 'string' ? err.message : String(e);
  if (code === 4001 || /user (rejected|denied)/i.test(msg)) return 'You rejected the request in your wallet.';
  if (code === -32002) return 'Your wallet already has a pending request. Open it and answer first.';
  if (/insufficient funds/i.test(msg))
    return 'The account does not have enough GEN for this amount plus fees.';
  if (/Failed to fetch|NetworkError|fetch failed/i.test(msg))
    return 'The network could not be reached. Check your connection and try again.';
  return msg.length > 300 ? msg.slice(0, 300) + '…' : msg;
}

interface TxClient {
  writeContract(a: {
    address: string;
    functionName: string;
    args: unknown[];
    value?: bigint;
  }): Promise<string>;
  getTransaction(a: { hash: string }): Promise<unknown>;
}

export interface SendContext {
  provider: Eip1193Provider;
  account: string;
}

/** Sends one contract write through the connected wallet and follows it until the network has decided. */
export async function sendWrite(
  ctx: SendContext,
  req: WriteRequest,
  onProgress: (p: TxProgress) => void,
  signal?: AbortSignal,
): Promise<TxOutcome> {
  const [{ createClient }, { studionet }] = await Promise.all([
    import('genlayer-js'),
    import('genlayer-js/chains'),
  ]);
  const client = createClient({
    chain: studionet,
    account: ctx.account as `0x${string}`,
    provider: ctx.provider as never,
  }) as unknown as TxClient;

  onProgress({ stage: 'wallet' });
  let hash: string;
  try {
    hash = await client.writeContract({
      address: CONTRACT_ADDRESS,
      functionName: req.fn,
      args: req.args,
      ...(req.value && req.value > 0n ? { value: req.value } : {}),
    });
  } catch (e) {
    const code = isObj(e) && typeof e.code === 'number' ? e.code : undefined;
    if (code === 4001) throw new UserRejectedError();
    throw e;
  }
  onProgress({ stage: 'submitted', hash });

  const started = Date.now();
  let receipt: unknown = null;
  let status = 'PENDING';
  for (;;) {
    if (Date.now() - started > 20 * 60_000)
      throw new Error(
        'The network took longer than 20 minutes to decide. Check the transaction in the explorer.',
      );
    try {
      receipt = await client.getTransaction({ hash });
      const name = isObj(receipt) ? String(receipt.statusName ?? '') : '';
      if (name) status = name;
    } catch {
      /* a transient read error: keep waiting */
    }
    onProgress({ stage: 'consensus', hash, status });
    if (DECIDED.has(status)) break;
    await sleep(2500, signal);
  }
  onProgress({ stage: 'decided', hash, status });

  const out = outcomeOf(receipt);
  const accepted = status === 'ACCEPTED' || status === 'FINALIZED';
  if (accepted && out.ok) return { ok: true, hash, status, returned: returnedValue(receipt) };
  if (!accepted) {
    const why =
      status === 'UNDETERMINED'
        ? 'The validators could not agree on the page reading, so nothing changed. Try again in a moment.'
        : `The network ended this transaction as ${status}. Nothing changed.`;
    return { ok: false, hash, status, failure: why, detail: out.detail };
  }
  return {
    ok: false,
    hash,
    status: out.status,
    failure:
      failureMessage(receipt) ??
      (out.known
        ? 'The contract refused this call. Nothing changed.'
        : 'The receipt could not be read; check the transaction in the explorer.'),
    detail: out.detail,
  };
}
