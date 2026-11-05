import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Crosshair, Eye, Hourglass, RefreshCw } from 'lucide-react';
import { useAllCovenants } from '../chain/hooks';
import type { Covenant } from '../chain/types';
import { Countdown, EmptyState, ErrorPanel, GenAmount, StateBadge, useNow } from '../components/ui';
import { MochiSays } from '../components/Mochi';
import { PlumbSpinner } from '../components/Spinners';
import { actionsFor, inspectorStake } from '../lib/actions';
import { useTx } from '../tx/TxProvider';
import { planInspect, planMature } from '../tx/plans';
import { useWallet } from '../wallet/WalletProvider';
import { useDemo } from '../chain/hooks';

interface Row {
  c: Covenant;
  priority: number;
  kind: 'confirm' | 'inspect' | 'mature' | 'wait';
}

export default function Inspect() {
  const { data, isLoading, isError, error, refetch, isFetching } = useAllCovenants();
  const now = useNow();
  const tx = useTx();
  const { account } = useWallet();
  const demo = useDemo();

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    for (const c of data ?? []) {
      if (c.state !== 'ACTIVE' && c.state !== 'WARNED') continue;
      const a = actionsFor(c, account, now);
      if (c.state === 'WARNED' && now >= c.cureBy && a.inspect.enabled)
        out.push({ c, priority: 0, kind: 'confirm' });
      else if (a.mature.enabled && c.state === 'ACTIVE') out.push({ c, priority: 3, kind: 'mature' });
      else if (a.inspect.enabled) out.push({ c, priority: c.state === 'WARNED' ? 2 : 1, kind: 'inspect' });
      else out.push({ c, priority: 4, kind: 'wait' });
    }
    return out.sort((x, y) => x.priority - y.priority || y.c.id - x.c.id);
  }, [data, account, now]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">Inspector desk</p>
          <h1 className="text-4xl font-semibold sm:text-5xl">Keep promises honest</h1>
          <p className="mt-2 max-w-2xl text-muted">
            Anyone can read the page of a live covenant. Validators fetch it independently, an AI inspector
            reads it, and plain code decides what counts as hard evidence.
          </p>
        </div>
        <button className="btn" onClick={() => void refetch()}>
          <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </header>

      <MochiSays title="Be honest about the incentive">
        <p>
          An inspection pays only if it catches something: 5% of the bond to whoever opens the warning, 10% to
          whoever confirms it after the cure time. A clean reading earns nothing, and a reading costs gas and
          takes a minute or two. Inspect when you have a reason to doubt, or when a warning is waiting to be
          confirmed.
        </p>
      </MochiSays>

      {isLoading && (
        <div className="grid place-items-center py-16">
          <PlumbSpinner size={52} label="Loading live covenants" />
        </div>
      )}
      {isError && <ErrorPanel error={error} onRetry={() => void refetch()} />}
      {!isLoading && !isError && rows.length === 0 && (
        <EmptyState
          title="Nothing under watch"
          action={
            <Link to="/create" className="btn-primary">
              Create a covenant
            </Link>
          }
        >
          No covenant is active or warned right now.
        </EmptyState>
      )}

      <div className="mt-6 grid gap-3">
        {rows.map(({ c, kind }) => {
          const stake = inspectorStake(c, now);
          const a = actionsFor(c, account, now);
          return (
            <div key={c.id} className="card flex flex-wrap items-center gap-4 p-4" data-testid="inspect-row">
              <div className="min-w-[200px] flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <span className="font-mono text-xs text-muted">#{c.id}</span>
                  <StateBadge state={c.state} />
                  {kind === 'confirm' && (
                    <span className="chip border-bad/60 bg-bad/10 text-bad">
                      <Crosshair className="h-3.5 w-3.5" /> confirm the warning
                    </span>
                  )}
                </div>
                <Link to={`/covenants/${c.id}`} className="text-lg font-semibold hover:text-cyan">
                  {c.title}
                </Link>
                <p className="mt-1 text-xs text-muted">{stake.note}</p>
              </div>
              <div className="text-sm">
                <p className="label mb-0.5">Bond</p>
                <GenAmount wei={c.bond} className="font-semibold text-brass" />
                {stake.kind !== 'none' && (
                  <p className="text-xs text-muted">
                    you could earn up to <GenAmount wei={(c.bond * stake.bps) / 10_000n} />
                  </p>
                )}
              </div>
              <div className="text-sm">
                <p className="label mb-0.5">{c.state === 'WARNED' ? 'Cure time' : 'Term'}</p>
                <p className="font-mono">
                  <Countdown to={c.state === 'WARNED' ? c.cureBy : c.endsAt} doneText="over" />
                </p>
              </div>
              <div className="flex flex-col gap-2">
                {kind === 'mature' ? (
                  <button
                    className="btn btn-sm"
                    disabled={tx.busy || demo}
                    onClick={() => void tx.run(planMature(c.id))}
                  >
                    <Hourglass className="h-4 w-4" /> Mature
                  </button>
                ) : (
                  <button
                    className="btn-primary btn-sm"
                    disabled={!a.inspect.enabled || tx.busy || demo}
                    onClick={() => void tx.run(planInspect(c.id))}
                  >
                    <Eye className="h-4 w-4" /> Inspect
                  </button>
                )}
                {!a.inspect.enabled && a.inspect.availableAt && a.inspect.availableAt > now && (
                  <p className="text-center text-[11px] text-muted">
                    in <Countdown to={a.inspect.availableAt} />
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
