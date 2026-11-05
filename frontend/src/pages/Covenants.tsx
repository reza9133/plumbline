import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { RefreshCw, Search } from 'lucide-react';
import { useAllCovenants, useDemo } from '../chain/hooks';
import { setDemo } from '../chain/client';
import { STATES, type CovenantState } from '../chain/types';
import { CovenantCard } from '../components/CovenantCard';
import { EmptyState, ErrorPanel } from '../components/ui';
import { Skeleton, PlumbSpinner } from '../components/Spinners';
import { STATE_STYLE } from '../components/ui';
import { sameAddress } from '../lib/format';
import { useWallet } from '../wallet/WalletProvider';

type Sort = 'new' | 'bond' | 'ending';

export default function Covenants() {
  const { data, isLoading, isError, error, refetch, isFetching } = useAllCovenants();
  const demo = useDemo();
  const { account } = useWallet();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState('');
  const state = (params.get('state') ?? 'ALL') as CovenantState | 'ALL';
  const mine = params.get('mine') === '1';
  const [sort, setSort] = useState<Sort>('new');

  const list = useMemo(() => {
    let rows = data ?? [];
    if (state !== 'ALL') rows = rows.filter((c) => c.state === state);
    if (mine && account) rows = rows.filter((c) => sameAddress(c.publisher, account));
    const needle = q.trim().toLowerCase();
    if (needle)
      rows = rows.filter((c) =>
        `${c.id} ${c.title} ${c.url} ${c.publisher} ${c.beneficiary}`.toLowerCase().includes(needle),
      );
    const sorted = [...rows];
    if (sort === 'bond') sorted.sort((a, b) => (b.bond > a.bond ? 1 : b.bond < a.bond ? -1 : 0));
    if (sort === 'ending') sorted.sort((a, b) => (a.endsAt || Infinity) - (b.endsAt || Infinity));
    return sorted;
  }, [data, state, mine, account, q, sort]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { ALL: data?.length ?? 0 };
    for (const s of STATES) c[s] = (data ?? []).filter((x) => x.state === s).length;
    return c;
  }, [data]);

  const setState = (s: string) => {
    const next = new URLSearchParams(params);
    if (s === 'ALL') next.delete('state');
    else next.set('state', s);
    setParams(next, { replace: true });
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">Registry</p>
          <h1 className="text-4xl font-semibold sm:text-5xl">Covenants</h1>
          <p className="mt-2 max-w-xl text-muted">
            Every bonded promise on this contract, newest first. Open one to read its tenets, its readings and
            what is at stake.
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn" onClick={() => void refetch()} aria-label="Refresh">
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <Link to="/create" className="btn-primary">
            New covenant
          </Link>
        </div>
      </header>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            className="input pl-9"
            placeholder="Search title, page, address or number"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search covenants"
          />
        </div>
        <select
          className="input w-auto"
          value={sort}
          onChange={(e) => setSort(e.target.value as Sort)}
          aria-label="Sort"
        >
          <option value="new">Newest first</option>
          <option value="bond">Largest bond</option>
          <option value="ending">Ending soonest</option>
        </select>
        {account && (
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              className="h-4 w-4 accent-[rgb(var(--c-cyan))]"
              checked={mine}
              onChange={(e) => {
                const next = new URLSearchParams(params);
                if (e.target.checked) next.set('mine', '1');
                else next.delete('mine');
                setParams(next, { replace: true });
              }}
            />
            Only mine
          </label>
        )}
      </div>

      <div className="mb-8 flex flex-wrap gap-2" role="tablist" aria-label="Filter by state">
        {(['ALL', ...STATES] as const).map((s) => {
          const on = state === s;
          return (
            <button
              key={s}
              role="tab"
              aria-selected={on}
              onClick={() => setState(s)}
              className={`chip cursor-pointer px-3.5 py-1.5 text-sm transition ${on ? 'border-brass bg-brass/15 text-brass' : 'border-line text-muted hover:border-cyan/50 hover:text-ink'}`}
            >
              {s === 'ALL' ? 'All' : STATE_STYLE[s].label}{' '}
              <span className="font-mono text-xs opacity-70">{counts[s] ?? 0}</span>
            </button>
          );
        })}
      </div>

      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="col-span-full grid place-items-center py-6">
            <PlumbSpinner size={44} label="Reading the registry" />
          </div>
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-44" />
          ))}
        </div>
      )}
      {isError && (
        <ErrorPanel
          error={error}
          onRetry={() => void refetch()}
          extra={
            !demo && (
              <button className="btn btn-sm" onClick={() => setDemo(true)}>
                Preview with demo data
              </button>
            )
          }
        />
      )}
      {!isLoading && !isError && list.length === 0 && (
        <EmptyState
          title={data && data.length > 0 ? 'Nothing matches' : 'No covenants yet'}
          action={
            <Link to="/create" className="btn-primary">
              Create the first one
            </Link>
          }
        >
          {data && data.length > 0
            ? 'Try another filter or clear the search.'
            : 'This contract has no covenants so far. Be the first to put a bond behind a promise.'}
        </EmptyState>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((c) => (
          <CovenantCard key={c.id} c={c} />
        ))}
      </div>
    </div>
  );
}
