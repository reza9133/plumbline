import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Circle, ExternalLink, Loader2, XCircle } from 'lucide-react';
import { explainError, sendWrite, type TxProgress, type WriteRequest } from '../chain/tx';
import { useWallet } from '../wallet/WalletProvider';
import { useToast } from '../components/Toast';
import { Modal, useNow } from '../components/ui';
import { ConsensusSpinner } from '../components/Spinners';
import { MochiHead } from '../components/Mochi';
import { explorerTx } from '../config';
import { formatDuration, shortHash } from '../lib/format';

export interface StepResult {
  id: string;
  hash?: string;
  returned?: unknown;
}

export interface TxStep {
  id: string;
  label: string;
  /** Builds the request; may read from the chain or from earlier steps' results. */
  build: (previous: StepResult[]) => WriteRequest | Promise<WriteRequest>;
}

export interface TxPlan {
  title: string;
  steps: TxStep[];
  doneHref?: string;
  doneLabel?: string;
  /** Shown while the network works; reading a page with an AI takes minutes. */
  slowNote?: string;
}

export interface TxRun {
  ok: boolean;
  results: StepResult[];
  error?: string;
}

interface TxApi {
  run(plan: TxPlan): Promise<TxRun>;
  busy: boolean;
}
const TxContext = createContext<TxApi | null>(null);

type StepState = 'wait' | 'run' | 'ok' | 'fail';
interface View {
  plan: TxPlan;
  states: StepState[];
  current: number;
  progress: TxProgress | null;
  startedAt: number;
  finished: boolean;
  error?: string;
  detail?: string;
  failedHash?: string;
}

const STATUS_TEXT: Record<string, string> = {
  PENDING: 'Queued. A validator will pick it up in a moment.',
  ACTIVATED: 'Queued. A validator will pick it up in a moment.',
  PROPOSING: 'The leader validator is running the contract.',
  COMMITTING: 'Validators are committing their own results.',
  REVEALING: 'Validators are revealing their votes.',
  ACCEPTED: 'Accepted by the validators.',
  FINALIZED: 'Finalized.',
  UNDETERMINED: 'The validators could not agree.',
};

export function TxProvider({ children }: { children: ReactNode }) {
  const wallet = useWallet();
  const qc = useQueryClient();
  const toast = useToast();
  const [view, setView] = useState<View | null>(null);
  const busy = useRef(false);
  const [busyState, setBusyState] = useState(false);

  const run = useCallback(
    async (plan: TxPlan): Promise<TxRun> => {
      if (busy.current) return { ok: false, results: [], error: 'Another transaction is already running.' };
      let ctx;
      try {
        ctx = await wallet.ensureReady();
      } catch (e) {
        return { ok: false, results: [], error: e instanceof Error ? e.message : String(e) };
      }
      busy.current = true;
      setBusyState(true);
      const states: StepState[] = plan.steps.map(() => 'wait');
      const update = (patch: Partial<View>) => setView((v) => (v ? { ...v, ...patch } : v));
      setView({
        plan,
        states: [...states],
        current: 0,
        progress: null,
        startedAt: Date.now(),
        finished: false,
      });
      const results: StepResult[] = [];
      try {
        for (let i = 0; i < plan.steps.length; i++) {
          const step = plan.steps[i] as TxStep;
          states[i] = 'run';
          update({ states: [...states], current: i, progress: null });
          let outcome;
          try {
            const req = await step.build(results);
            outcome = await sendWrite(ctx, req, (p) => update({ progress: p }));
          } catch (e) {
            states[i] = 'fail';
            const error = explainError(e);
            update({ states: [...states], finished: true, error });
            return { ok: false, results, error };
          }
          if (!outcome.ok) {
            states[i] = 'fail';
            update({
              states: [...states],
              finished: true,
              error: outcome.failure,
              detail: outcome.detail,
              failedHash: outcome.hash,
            });
            return { ok: false, results, error: outcome.failure };
          }
          states[i] = 'ok';
          results.push({ id: step.id, hash: outcome.hash, returned: outcome.returned });
          update({ states: [...states] });
        }
        update({ finished: true });
        void qc.invalidateQueries();
        toast.push({ kind: 'ok', text: `${plan.title}: done.` });
        return { ok: true, results };
      } finally {
        busy.current = false;
        setBusyState(false);
        void qc.invalidateQueries();
      }
    },
    [wallet, qc, toast],
  );

  const api = useMemo(() => ({ run, busy: busyState }), [run, busyState]);
  return (
    <TxContext.Provider value={api}>
      {children}
      {view && <TxOverlay view={view} onClose={() => setView(null)} />}
    </TxContext.Provider>
  );
}

export function useTx(): TxApi {
  const ctx = useContext(TxContext);
  if (!ctx) throw new Error('useTx must be used inside <TxProvider>');
  return ctx;
}

function TxOverlay({ view, onClose }: { view: View; onClose: () => void }) {
  const navigate = useNavigate();
  const now = useNow();
  const elapsed = Math.max(0, now - Math.floor(view.startedAt / 1000));
  const failed = view.states.includes('fail');
  const success = view.finished && !failed;
  const p = view.progress;
  const stage = !p
    ? 'Preparing the request…'
    : p.stage === 'wallet'
      ? 'Confirm the request in your wallet.'
      : p.stage === 'submitted'
        ? 'Submitted. Waiting for the network to pick it up.'
        : (STATUS_TEXT[p.status ?? ''] ?? `Network status: ${p.status ?? '…'}`);
  const hash = p?.hash ?? view.failedHash;
  const [showDetail, setShowDetail] = useState(false);
  useEffect(() => setShowDetail(false), [view.finished]);

  return (
    <Modal open onClose={() => (view.finished ? onClose() : undefined)} title={view.plan.title} wide>
      <div className="flex flex-col items-center text-center">
        <p className="eyebrow mb-1">{view.plan.title}</p>
        {!view.finished && (
          <>
            <div className="my-4">
              <ConsensusSpinner />
            </div>
            <p className="font-display text-xl font-semibold">{stage}</p>
            <p className="mt-1 font-mono text-xs text-muted">elapsed {formatDuration(elapsed)}</p>
            {view.plan.slowNote && elapsed > 8 && (
              <p className="mt-3 max-w-md text-sm text-muted">{view.plan.slowNote}</p>
            )}
          </>
        )}
        {success && (
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="my-4 flex flex-col items-center gap-3"
          >
            <MochiHead size={120} className="animate-float" />
            <CheckCircle2 className="h-10 w-10 text-ok" />
            <p className="font-display text-2xl font-semibold">Done</p>
          </motion.div>
        )}
        {failed && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="my-4 flex flex-col items-center gap-2"
          >
            <AlertTriangle className="h-10 w-10 text-warn" />
            <p className="font-display text-2xl font-semibold">Nothing was changed</p>
            <p className="max-w-md text-sm text-muted">{view.error}</p>
          </motion.div>
        )}
      </div>

      <ol className="mx-auto mt-5 max-w-md space-y-2">
        {view.plan.steps.map((s, i) => {
          const st = view.states[i];
          return (
            <li
              key={s.id}
              className="flex items-center gap-3 rounded-xl border border-line/60 bg-bg/50 px-3 py-2 text-sm"
            >
              {st === 'ok' && <CheckCircle2 className="h-5 w-5 shrink-0 text-ok" />}
              {st === 'run' && <Loader2 className="h-5 w-5 shrink-0 animate-spin text-cyan" />}
              {st === 'wait' && <Circle className="h-5 w-5 shrink-0 text-muted/50" />}
              {st === 'fail' && <XCircle className="h-5 w-5 shrink-0 text-bad" />}
              <span className={st === 'wait' ? 'text-muted' : 'font-semibold'}>{s.label}</span>
            </li>
          );
        })}
      </ol>

      {hash && (
        <p className="mt-4 text-center text-xs text-muted">
          Transaction{' '}
          <a
            href={explorerTx(hash)}
            target="_blank"
            rel="noreferrer"
            className="link inline-flex items-center gap-1 font-mono"
          >
            {shortHash(hash)} <ExternalLink className="h-3 w-3" />
          </a>
        </p>
      )}
      {view.detail && (
        <div className="mt-3 text-center">
          <button className="text-xs text-muted underline" onClick={() => setShowDetail((s) => !s)}>
            {showDetail ? 'Hide' : 'Show'} technical details
          </button>
          {showDetail && (
            <pre className="mt-2 max-h-40 overflow-auto rounded-lg bg-surface2/60 p-3 text-left text-[11px] leading-5">
              {view.detail}
            </pre>
          )}
        </div>
      )}
      {view.finished && (
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {success && view.plan.doneHref && (
            <button
              className="btn-primary"
              onClick={() => {
                onClose();
                navigate(view.plan.doneHref as string);
              }}
            >
              {view.plan.doneLabel ?? 'Continue'}
            </button>
          )}
          <button className="btn" onClick={onClose}>
            {success ? 'Close' : 'Back'}
          </button>
        </div>
      )}
    </Modal>
  );
}
