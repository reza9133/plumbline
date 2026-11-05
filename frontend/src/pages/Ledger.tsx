import { motion } from 'framer-motion';
import { CheckCircle2, XCircle } from 'lucide-react';
import { useSolvency, useStats } from '../chain/hooks';
import { ErrorPanel, GenAmount, SectionTitle, Stat } from '../components/ui';
import { PlumbSpinner } from '../components/Spinners';

const pct = (part: bigint, total: bigint) => (total === 0n ? 0 : Number((part * 10000n) / total) / 100);

export default function Ledger() {
  const stats = useStats();
  const sol = useSolvency();
  const s = sol.data;
  const t = stats.data;
  const parts = s
    ? [
        {
          k: 'Locked in live bonds',
          v: s.locked,
          c: 'bg-brass',
          d: 'Bonds of draft, active and warned covenants.',
        },
        {
          k: 'Credited, not yet collected',
          v: s.owed,
          c: 'bg-cyan',
          d: 'Slashes, bounties and returned bonds waiting for collect().',
        },
        { k: 'Paid out', v: s.paid, c: 'bg-magenta', d: 'Everything collected so far.' },
      ]
    : [];
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <SectionTitle eyebrow="The books" title="Every wei is accounted for">
        The contract keeps four totals and proves they add up: everything ever deposited is either paid out,
        owed and waiting, or locked as a bond.
      </SectionTitle>

      {(sol.isError || stats.isError) && (
        <ErrorPanel
          error={sol.error ?? stats.error}
          onRetry={() => {
            void sol.refetch();
            void stats.refetch();
          }}
        />
      )}
      {(sol.isLoading || stats.isLoading) && (
        <div className="grid place-items-center py-16">
          <PlumbSpinner size={52} label="Reading the books" />
        </div>
      )}

      {s && (
        <>
          <div
            className={`card-pad mb-6 flex flex-wrap items-center gap-4 ${s.balanced ? 'border-ok/40' : 'border-bad/50'}`}
          >
            {s.balanced ? (
              <CheckCircle2 className="h-9 w-9 text-ok" />
            ) : (
              <XCircle className="h-9 w-9 text-bad" />
            )}
            <div className="flex-1">
              <p className="font-display text-2xl font-semibold">
                {s.balanced ? 'Balanced' : 'Not balanced'}
              </p>
              <p className="text-sm text-muted">
                deposited = paid + owed + locked, and locked equals the sum of live bonds (
                <GenAmount wei={s.liveBonds} />
                ).
              </p>
            </div>
            <p className="font-display text-3xl font-semibold text-brass">
              <GenAmount wei={s.deposited} decimals={4} />
            </p>
          </div>

          <div className="card-pad">
            <p className="label mb-3">Where the deposits are</p>
            <div
              className="flex h-10 overflow-hidden rounded-xl bg-surface2"
              role="img"
              aria-label="Share of deposits that are locked, owed or paid"
            >
              {parts.map((p, i) => (
                <motion.div
                  key={p.k}
                  className={p.c}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct(p.v, s.deposited)}%` }}
                  transition={{ delay: i * 0.12, duration: 0.7 }}
                  title={p.k}
                />
              ))}
            </div>
            <ul className="mt-4 grid gap-3 sm:grid-cols-3">
              {parts.map((p) => (
                <li key={p.k} className="text-sm">
                  <p className="flex items-center gap-2 font-semibold">
                    <span className={`h-3 w-3 rounded-sm ${p.c}`} />
                    {p.k}
                  </p>
                  <GenAmount wei={p.v} className="text-lg font-semibold" />
                  <p className="text-xs text-muted">
                    {pct(p.v, s.deposited)}% · {p.d}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      {t && (
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          <Stat label="Covenants" value={t.covenants} />
          <Stat label="Readings" value={t.readings} />
          <Stat label="Warnings · cures" value={`${t.warned} · ${t.cured}`} hint="warnings opened · cured" />
          <Stat label="Broken" value={t.broken} accent />
          <Stat label="Matured" value={t.matured} />
          <Stat label="Cancelled" value={t.cancelled} />
          <Stat label="Locked" value={<GenAmount wei={t.locked} decimals={3} />} />
          <Stat label="Owed" value={<GenAmount wei={t.owed} decimals={3} />} />
        </div>
      )}
    </div>
  );
}
