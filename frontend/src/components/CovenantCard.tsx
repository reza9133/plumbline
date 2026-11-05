import { Link } from 'react-router-dom';
import { ArrowUpRight, Link2, ShieldCheck } from 'lucide-react';
import type { Covenant } from '../chain/types';
import { Countdown, GenAmount, StateBadge, TiltCard } from './ui';
import { LIMITS } from '../lib/rules';

function host(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export function CovenantCard({ c }: { c: Covenant }) {
  const bondShown = c.bond > 0n ? c.bond : c.slashed;
  return (
    <TiltCard max={5} className="h-full">
      <Link
        to={`/covenants/${c.id}`}
        className="card flex h-full flex-col gap-3 p-5 transition hover:border-cyan/50"
        data-testid="covenant-card"
      >
        <div className="flex items-start justify-between gap-3">
          <span className="font-mono text-xs text-muted">#{c.id}</span>
          <StateBadge state={c.state} />
        </div>
        <h3 className="text-balance text-xl font-semibold leading-snug">{c.title}</h3>
        <p className="flex items-center gap-1.5 truncate text-sm text-muted">
          <Link2 className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{host(c.url)}</span>
        </p>
        <div className="mt-auto flex items-end justify-between gap-3 pt-2">
          <div>
            <p className="label mb-0.5">
              {c.state === 'BROKEN'
                ? 'Slashed'
                : c.state === 'MATURED' || c.state === 'CANCELLED'
                  ? 'Was locked'
                  : 'Bond'}
            </p>
            <GenAmount
              wei={bondShown > 0n ? bondShown : c.bond}
              className="text-lg font-semibold text-brass"
            />
          </div>
          <div className="text-right text-xs text-muted">
            {c.state === 'ACTIVE' && (
              <p>
                ends in <Countdown to={c.endsAt} doneText="now" />
              </p>
            )}
            {c.state === 'WARNED' && (
              <p className="font-semibold text-warn">
                cure by <Countdown to={c.cureBy} doneText="over" />
              </p>
            )}
            <p className="mt-0.5 flex items-center justify-end gap-1">
              {c.bound && (
                <ShieldCheck className="h-3.5 w-3.5 text-ok" aria-label="Bound to publisher address" />
              )}
              {c.readings} reading{c.readings === 1 ? '' : 's'} · {c.tenets.length}/{LIMITS.maxTenets} tenets
            </p>
          </div>
        </div>
        <ArrowUpRight className="absolute right-4 top-4 hidden h-4 w-4 text-muted opacity-0 transition group-hover:opacity-100" />
      </Link>
    </TiltCard>
  );
}
