import { CHAIN, CONTRACT_ADDRESS } from '../config';
import {
  parseAmount,
  parseCovenantList,
  parseCovenantText,
  parseReadings,
  parseRecord,
  parseSolvency,
  parseStats,
} from './parse';
import { demoSource } from './demo';
import { PAGE } from './paging';
import type { Covenant, DataSource } from './types';

interface ReadClient {
  readContract(args: { address: string; functionName: string; args?: unknown[] }): Promise<unknown>;
}

let readerPromise: Promise<ReadClient> | null = null;

/** genlayer-js is large, so it is only loaded when the first read happens. */
function reader(): Promise<ReadClient> {
  readerPromise ??= (async () => {
    const [{ createClient }, { studionet }] = await Promise.all([
      import('genlayer-js'),
      import('genlayer-js/chains'),
    ]);
    return createClient({ chain: studionet, endpoint: CHAIN.rpc }) as unknown as ReadClient;
  })().catch((e) => {
    readerPromise = null;
    throw e;
  });
  return readerPromise;
}

async function view(functionName: string, args: unknown[] = []): Promise<string> {
  const client = await reader();
  const result = await client.readContract({ address: CONTRACT_ADDRESS, functionName, args });
  return typeof result === 'string' ? result : String(result ?? '');
}

export const liveSource: DataSource = {
  kind: 'live',
  stats: async () => parseStats(await view('stats')),
  solvency: async () => parseSolvency(await view('solvency')),
  list: async (offset, limit) => parseCovenantList(await view('list_covenants', [offset, limit])),
  covenant: async (id) => parseCovenantText(await view('get_covenant', [id])),
  readings: async (id) => parseReadings(await view('readings_of', [id])),
  covenantsOf: async (who, offset, limit) =>
    parseCovenantList(await view('covenants_of', [who, offset, limit])),
  credit: async (who) => parseAmount(await view('credit_of', [who])),
  record: async (who) => parseRecord(await view('record_of', [who])),
};

// ---- demo switch ---------------------------------------------------------------------------------------------------
const DEMO_KEY = 'plumbline.demo';
const listeners = new Set<() => void>();
let demoOn = false;

try {
  const url = new URL(window.location.href);
  const q = url.searchParams.get('demo');
  if (q === '1') window.localStorage.setItem(DEMO_KEY, '1');
  if (q === '0') window.localStorage.removeItem(DEMO_KEY);
  demoOn = window.localStorage.getItem(DEMO_KEY) === '1';
} catch {
  demoOn = false;
}

export const isDemo = () => demoOn;
export const subscribeDemo = (fn: () => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
export function setDemo(on: boolean) {
  demoOn = on;
  try {
    if (on) window.localStorage.setItem(DEMO_KEY, '1');
    else window.localStorage.removeItem(DEMO_KEY);
  } catch {
    /* storage can be blocked; the switch still works for this visit */
  }
  listeners.forEach((fn) => fn());
}

export const currentSource = (): DataSource => (demoOn ? demoSource : liveSource);

/** Every covenant, newest first, read page by page (capped so a huge registry cannot freeze the page). */
export async function fetchAllCovenants(source: DataSource, cap = 400): Promise<Covenant[]> {
  const out: Covenant[] = [];
  for (let offset = 0; offset < cap; offset += PAGE) {
    const page = await source.list(offset, PAGE);
    out.push(...page);
    if (page.length < PAGE) break;
  }
  return out;
}
