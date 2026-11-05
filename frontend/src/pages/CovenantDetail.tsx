import { lazy, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  Clock,
  ExternalLink,
  Hourglass,
  Plus,
  ScanSearch,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import { useCovenant, useReadings } from '../chain/hooks';
import type { Covenant, Reading } from '../chain/types';
import {
  Address,
  Countdown,
  EmptyState,
  ErrorPanel,
  GenAmount,
  KindBadge,
  StateBadge,
  useNow,
} from '../components/ui';
import { PageLoader, PlumbSpinner } from '../components/Spinners';
import { SceneGuard } from '../three/webgl';
import { useTheme } from '../theme/ThemeProvider';
import { useWallet } from '../wallet/WalletProvider';
import { useTx } from '../tx/TxProvider';
import { planActivate, planAddTenet, planCancel, planInspect, planMature, planTopUp } from '../tx/plans';
import { actionsFor, inspectorStake } from '../lib/actions';
import { describeToken, LIMITS, splitBond, validateTenet } from '../lib/rules';
import { formatDate, formatDuration, parseGen, relativeTime, sameAddress, shortHash } from '../lib/format';
import { tenetTones } from '../lib/tones';
import { StateDiagram } from '../components/StateDiagram';

const PlumbWall = lazy(() => import('../three/PlumbWall'));

const TONE_LABEL = {
  idle: 'Not read yet',
  held: 'Held',
  weak: 'Softened',
  missing: 'Not found / unsure',
  bad: 'Broken',
} as const;
const TONE_CLASS = {
  idle: 'text-muted border-line',
  held: 'text-ok border-ok/50 bg-ok/10',
  weak: 'text-warn border-warn/50 bg-warn/10',
  missing: 'text-muted border-muted/50 bg-surface2/60',
  bad: 'text-bad border-bad/60 bg-bad/10',
} as const;

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-line/40 py-2 last:border-0">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="text-right text-sm font-semibold">{children}</dd>
    </div>
  );
}

function Wall({ c }: { c: Covenant }) {
  const { theme } = useTheme();
  const { tones, wallHard } = tenetTones(c);
  return (
    <div className="card relative aspect-[16/9] overflow-hidden">
      <SceneGuard
        fallback={
          <div className="grid h-full place-items-center text-sm text-muted">
            3D view unavailable on this device
          </div>
        }
      >
        <PlumbWall
          tones={tones}
          dim={theme === 'dim'}
          wallHard={wallHard}
          matured={c.state === 'MATURED'}
          broken={c.state === 'BROKEN'}
        />
      </SceneGuard>
      <div className="pointer-events-none absolute bottom-3 left-3 flex flex-wrap gap-1.5 text-[11px] font-bold">
        {(['held', 'weak', 'missing', 'bad'] as const).map((t) => (
          <span key={t} className={`chip bg-bg/70 ${TONE_CLASS[t]}`}>
            {TONE_LABEL[t]}
          </span>
        ))}
      </div>
      {wallHard && (
        <span className="chip absolute right-3 top-3 border-bad/60 bg-bad/15 text-bad">
          page-level evidence
        </span>
      )}
    </div>
  );
}

function ReadingRow({ r, n }: { r: Reading; n: number }) {
  const tokens = r.detail
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
  return (
    <li className="relative pl-8">
      <span
        className={`absolute left-0 top-1.5 grid h-5 w-5 place-items-center rounded-full border-2 bg-bg ${r.kind === 'CLEAN' ? 'border-ok' : r.kind === 'BREACH' ? 'border-bad' : r.kind === 'DRIFT' ? 'border-warn' : 'border-muted'}`}
      />
      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-2">
          <KindBadge kind={r.kind} />
          {r.hard && <span className="chip border-bad/50 text-bad">hard evidence</span>}
          <span className="ml-auto text-xs text-muted" title={formatDate(r.at)}>
            reading {n} · {relativeTime(r.at)}
          </span>
        </div>
        {r.note && <p className="mt-2 text-sm italic text-ink/80">“{r.note}”</p>}
        {tokens.length > 0 && (
          <ul className="mt-2 space-y-1 text-sm">
            {tokens.map((t) => {
              const d = describeToken(t);
              return (
                <li key={t} className="flex items-start gap-2">
                  <span
                    className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${d.hard ? 'bg-bad' : 'bg-warn'}`}
                  />
                  <span>
                    <code className="mr-1.5 text-xs text-muted">{t}</code>
                    {d.label}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        <p className="mt-2 flex flex-wrap items-center gap-x-4 text-xs text-muted">
          <span>
            by <Address value={r.by} />
          </span>
          {r.digest && (
            <span title={r.digest}>
              page fingerprint <code>{shortHash(r.digest)}</code>
            </span>
          )}
        </p>
      </div>
    </li>
  );
}

function AddTenet({ c }: { c: Covenant }) {
  const tx = useTx();
  const [text, setText] = useState('');
  const [anchor, setAnchor] = useState('');
  const errs = text || anchor ? validateTenet({ text, anchor }, c.tenets) : {};
  const bad = !text || Object.keys(errs).length > 0;
  return (
    <form
      className="mt-4 space-y-3 rounded-xl border border-dashed border-line p-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (bad) return;
        const r = await tx.run(planAddTenet(c.id, { text, anchor }));
        if (r.ok) {
          setText('');
          setAnchor('');
        }
      }}
    >
      <p className="label mb-0">
        Add a tenet ({c.tenets.length}/{LIMITS.maxTenets})
      </p>
      <div>
        <textarea
          className="input min-h-[72px]"
          maxLength={400}
          placeholder="The promise in plain words, e.g. “We never sell personal data.”"
          value={text}
          onChange={(e) => setText(e.target.value)}
          aria-label="Tenet text"
        />
        {errs.text && <p className="mt-1 text-xs font-semibold text-bad">{errs.text}</p>}
      </div>
      <div>
        <input
          className="input"
          maxLength={120}
          placeholder="Anchor (optional): exact words that must stay on the page"
          value={anchor}
          onChange={(e) => setAnchor(e.target.value)}
          aria-label="Anchor"
        />
        {errs.anchor && <p className="mt-1 text-xs font-semibold text-bad">{errs.anchor}</p>}
      </div>
      <button className="btn btn-sm" disabled={bad || tx.busy}>
        <Plus className="h-4 w-4" /> Add tenet
      </button>
    </form>
  );
}

function TopUp({ c }: { c: Covenant }) {
  const tx = useTx();
  const [v, setV] = useState('');
  const wei = parseGen(v);
  return (
    <form
      className="flex gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        if (wei && wei > 0n) {
          const r = await tx.run(planTopUp(c.id, wei));
          if (r.ok) setV('');
        }
      }}
    >
      <input
        className="input"
        inputMode="decimal"
        placeholder="Amount in GEN"
        value={v}
        onChange={(e) => setV(e.target.value)}
        aria-label="Top-up amount in GEN"
      />
      <button className="btn" disabled={!wei || wei <= 0n || tx.busy}>
        Top up
      </button>
    </form>
  );
}

function ActionPanel({ c }: { c: Covenant }) {
  const now = useNow();
  const { account, openModal, status } = useWallet();
  const tx = useTx();
  const a = actionsFor(c, account, now);
  const stake = inspectorStake(c, now);
  const wait = (t?: number) =>
    t && t > now ? (
      <>
        {' '}
        Available in <Countdown to={t} />.
      </>
    ) : null;

  return (
    <section className="card-pad" aria-label="Actions">
      <h2 className="mb-1 text-2xl font-semibold">What you can do</h2>
      {status !== 'connected' && (
        <p className="mb-3 text-sm text-muted">
          Connect a wallet to act on this covenant.{' '}
          <button className="link" onClick={openModal}>
            Connect
          </button>
        </p>
      )}
      {a.isPublisher && (
        <p className="mb-3 chip border-brass/50 bg-brass/10 text-brass">You are the publisher</p>
      )}
      {a.isBeneficiary && (
        <p className="mb-3 chip border-cyan/50 bg-cyan/10 text-cyan">You are the beneficiary</p>
      )}

      <div className="space-y-4">
        {a.activate.visible && (
          <div>
            <button
              className="btn-primary w-full"
              disabled={!a.activate.enabled || tx.busy}
              onClick={() => void tx.run(planActivate(c.id))}
            >
              <ScanSearch className="h-4 w-4" /> Activate (strict reading)
            </button>
            <p className="mt-1.5 text-xs text-muted">
              {a.activate.enabled ? (
                'The page is read once. The covenant goes live only if every anchor, date and tenet checks out.'
              ) : (
                <>
                  {a.activate.reason}
                  {wait(a.activate.availableAt)}
                </>
              )}
            </p>
          </div>
        )}
        {a.inspect.visible && (
          <div>
            <button
              className="btn-primary w-full"
              disabled={!a.inspect.enabled || tx.busy}
              onClick={() => void tx.run(planInspect(c.id))}
            >
              <ScanSearch className="h-4 w-4" /> Inspect the page now
            </button>
            <p className="mt-1.5 text-xs text-muted">
              {a.inspect.enabled ? (
                stake.note
              ) : (
                <>
                  {a.inspect.reason}
                  {wait(a.inspect.availableAt)}
                </>
              )}
            </p>
          </div>
        )}
        {a.mature.visible && (
          <div>
            <button
              className="btn w-full"
              disabled={!a.mature.enabled || tx.busy}
              onClick={() => void tx.run(planMature(c.id))}
            >
              <Hourglass className="h-4 w-4" /> Mature (term is over)
            </button>
            {!a.mature.enabled && (
              <p className="mt-1.5 text-xs text-muted">
                {a.mature.reason}
                {wait(a.mature.availableAt)}
              </p>
            )}
          </div>
        )}
        {a.topUp.visible && (
          <div>
            <p className="label">Top up the bond</p>
            {a.topUp.enabled ? <TopUp c={c} /> : <p className="text-xs text-muted">{a.topUp.reason}</p>}
          </div>
        )}
        {a.cancel.visible && (
          <div>
            <button
              className="btn-danger w-full"
              disabled={!a.cancel.enabled || tx.busy}
              onClick={() => void tx.run(planCancel(c.id))}
            >
              <Ban className="h-4 w-4" /> Cancel this draft
            </button>
            {!a.cancel.enabled && <p className="mt-1.5 text-xs text-muted">{a.cancel.reason}</p>}
          </div>
        )}
        {c.state === 'BROKEN' || c.state === 'MATURED' || c.state === 'CANCELLED' ? (
          <p className="text-sm text-muted">
            This covenant is over. Credits from it are paid out from{' '}
            <Link className="link" to="/dashboard">
              My account
            </Link>
            .
          </p>
        ) : null}
      </div>
      {a.addTenet.visible &&
        (a.addTenet.enabled ? (
          <AddTenet c={c} />
        ) : (
          <p className="mt-3 text-xs text-muted">{a.addTenet.reason}</p>
        ))}
    </section>
  );
}

export default function CovenantDetail() {
  const { id: raw } = useParams();
  const id = raw !== undefined && /^\d+$/.test(raw) ? Number(raw) : null;
  const cov = useCovenant(id);
  const rd = useReadings(id);
  const { account } = useWallet();
  const now = useNow();

  const c = cov.data;
  const split = useMemo(() => (c ? splitBond(c.bond) : null), [c]);

  if (id === null)
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState
          title="That is not a covenant number"
          action={
            <Link className="btn" to="/covenants">
              Back to the registry
            </Link>
          }
        />
      </div>
    );
  if (cov.isLoading) return <PageLoader text="Reading covenant" />;
  if (cov.isError || !c) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <ErrorPanel
          error={cov.error ?? new Error('No such covenant.')}
          onRetry={() => void cov.refetch()}
          extra={
            <Link className="btn btn-sm" to="/covenants">
              Back to the registry
            </Link>
          }
        />
      </div>
    );
  }

  const tones = tenetTones(c).tones;
  const readings = rd.data ?? [];
  const termDone =
    c.activeSince && c.endsAt
      ? Math.min(1, Math.max(0, (now - c.activeSince) / (c.endsAt - c.activeSince)))
      : 0;
  const hostName = (() => {
    try {
      return new URL(c.url).host;
    } catch {
      return c.url;
    }
  })();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <Link
        to="/covenants"
        className="mb-5 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> All covenants
      </Link>

      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-3">
            <span className="font-mono text-sm text-muted">Covenant #{c.id}</span>
            <StateBadge state={c.state} />
            {c.bound && (
              <span className="chip border-ok/50 bg-ok/10 text-ok">
                <ShieldCheck className="h-3.5 w-3.5" /> bound to publisher
              </span>
            )}
          </div>
          <h1 className="text-balance text-4xl font-semibold sm:text-5xl">{c.title}</h1>
          <a
            href={c.url}
            target="_blank"
            rel="noreferrer"
            className="link mt-2 inline-flex max-w-full items-center gap-1.5 break-all text-sm"
          >
            {hostName}
            <span className="text-muted">{c.url.replace(/^https?:\/\/[^/]+/, '').slice(0, 60)}</span>{' '}
            <ExternalLink className="h-3.5 w-3.5 shrink-0" />
          </a>
        </div>
        <div className="card-pad !py-3 text-right">
          <p className="label mb-0.5">{c.state === 'BROKEN' ? 'Slashed' : 'Bond locked'}</p>
          <GenAmount
            wei={c.state === 'BROKEN' ? c.slashed : c.bond}
            className="text-3xl font-semibold text-brass"
            decimals={6}
          />
          {c.topped > 0n && (
            <p className="text-xs text-muted">
              incl. <GenAmount wei={c.topped} /> topped up
            </p>
          )}
        </div>
      </header>

      {c.state === 'WARNED' && (
        <div
          className="mb-6 flex flex-wrap items-center gap-4 rounded-2xl border border-warn/50 bg-warn/10 p-4"
          role="alert"
        >
          <AlertTriangle className="h-6 w-6 shrink-0 text-warn" />
          <div className="flex-1 text-sm">
            <p className="font-display text-lg font-semibold">A warning is open</p>
            <p>
              Hard evidence was found {relativeTime(c.warnedAt)}. The publisher has until{' '}
              <b>{formatDate(c.cureBy)}</b> to repair the page
              {c.cureBy > now ? (
                <>
                  {' '}
                  (<Countdown to={c.cureBy} /> left)
                </>
              ) : (
                ' (the cure time is over: the next hard reading breaks the covenant)'
              )}
              . Finder: <Address value={c.finder} />
            </p>
          </div>
        </div>
      )}
      {c.endedNote && (
        <p className="mb-6 rounded-xl border border-line bg-surface2/50 px-4 py-3 text-sm">
          <b>Outcome:</b> {c.endedNote}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <Wall c={c} />

          <section className="card-pad" aria-label="Tenets">
            <h2 className="mb-4 text-2xl font-semibold">Tenets</h2>
            {c.tenets.length === 0 ? (
              <p className="text-sm text-muted">
                No tenets yet. The publisher adds up to six before activating.
              </p>
            ) : (
              <ol className="space-y-3">
                {c.tenets.map((t, i) => {
                  const tone = tones[i]?.tone ?? 'idle';
                  return (
                    <li key={i} className="flex gap-4 rounded-xl border border-line/60 bg-bg/40 p-4">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brass/15 font-display text-lg font-semibold text-brass">
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold">{t.text}</p>
                        {t.anchor && (
                          <p className="mt-1 text-sm text-muted">
                            Anchor: <code className="break-all">“{t.anchor}”</code>
                          </p>
                        )}
                      </div>
                      <span className={`chip h-fit shrink-0 ${TONE_CLASS[tone]}`}>{TONE_LABEL[tone]}</span>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>

          <section aria-label="Readings">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-2xl font-semibold">Readings</h2>
              <p className="text-sm text-muted">
                {c.readings} total · newest {Math.min(readings.length, LIMITS.logSize)} shown
              </p>
            </div>
            {rd.isLoading && (
              <div className="grid place-items-center py-8">
                <PlumbSpinner label="Loading readings" />
              </div>
            )}
            {!rd.isLoading && readings.length === 0 && (
              <EmptyState title="No readings yet">
                A reading is made when the covenant is activated and every time somebody inspects it.
              </EmptyState>
            )}
            <ol className="relative space-y-4 before:absolute before:bottom-2 before:left-[9px] before:top-2 before:w-px before:bg-line">
              {[...readings].reverse().map((r, i) => (
                <ReadingRow key={`${r.at}-${i}`} r={r} n={c.readings - i} />
              ))}
            </ol>
          </section>
        </div>

        <aside className="space-y-6">
          <ActionPanel c={c} />

          <section className="card-pad" aria-label="Facts">
            <h2 className="mb-2 text-2xl font-semibold">Terms</h2>
            <dl>
              <Fact label="Publisher">
                <Address value={c.publisher} you={sameAddress(account, c.publisher)} />
              </Fact>
              <Fact label="Beneficiary">
                <Address value={c.beneficiary} you={sameAddress(account, c.beneficiary)} />
              </Fact>
              <Fact label="Term">{formatDuration(c.term)}</Fact>
              {c.endsAt > 0 && (
                <Fact label="Ends">
                  {formatDate(c.endsAt)}
                  {c.state === 'ACTIVE' && (
                    <span className="block text-xs font-normal text-muted">
                      in <Countdown to={c.endsAt} doneText="over" />
                    </span>
                  )}
                </Fact>
              )}
              <Fact label="Cure time">{formatDuration(c.cureSecs)}</Fact>
              <Fact label="Gap between readings">{formatDuration(c.minGap)}</Fact>
              <Fact label="Freshness limit">{c.maxAge ? formatDuration(c.maxAge) : 'off'}</Fact>
              <Fact label="Publisher address on page">{c.bound ? 'required' : 'not required'}</Fact>
              <Fact label="Created">{formatDate(c.created)}</Fact>
            </dl>
            {c.state === 'ACTIVE' && c.endsAt > 0 && (
              <div className="mt-4">
                <div className="h-2 overflow-hidden rounded-full bg-surface2">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan to-brass transition-all"
                    style={{ width: `${termDone * 100}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-muted">
                  {Math.round(termDone * 100)}% of the term has passed
                </p>
              </div>
            )}
          </section>

          <section className="card-pad" aria-label="Record">
            <h2 className="mb-2 text-2xl font-semibold">Track record</h2>
            <dl>
              <Fact label="Readings">{c.readings}</Fact>
              <Fact label="Clean · drift">
                {c.clean} · {c.drift}
              </Fact>
              <Fact label="Breach · unreadable">
                {c.breach} · {c.unreadable}
              </Fact>
              <Fact label="Page changed between readings">{c.changes}×</Fact>
              <Fact label="Warnings · cures">
                {c.warnings} · {c.cures}/{LIMITS.maxCures}
              </Fact>
              {c.last && (
                <Fact label="Last reading">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {relativeTime(c.last.at)}
                  </span>
                </Fact>
              )}
            </dl>
            <p className="mt-3 text-xs text-muted">
              Nobody is obliged to inspect. A covenant nobody reads matures clean, so look at the readings
              before trusting a record.
            </p>
          </section>

          {split && c.state !== 'NEW' && c.state !== 'CANCELLED' && (
            <section className="card-pad" aria-label="If broken">
              <h2 className="mb-2 flex items-center gap-2 text-2xl font-semibold">
                <Wallet className="h-5 w-5 text-brass" />
                {c.state === 'BROKEN' ? 'How it was paid' : 'If it breaks'}
              </h2>
              <dl>
                <Fact label="Finder (5%)">
                  <GenAmount
                    wei={c.state === 'BROKEN' ? (c.slashed * LIMITS.finderBps) / LIMITS.bps : split.finder}
                  />
                </Fact>
                <Fact label="Closer (10%)">
                  <GenAmount
                    wei={c.state === 'BROKEN' ? (c.slashed * LIMITS.closerBps) / LIMITS.bps : split.closer}
                  />
                </Fact>
                <Fact label="Beneficiary (85%)">
                  <GenAmount wei={c.state === 'BROKEN' ? c.slashed - c.bounty : split.beneficiary} />
                </Fact>
              </dl>
            </section>
          )}
        </aside>
      </div>

      <section className="card-pad mt-8" aria-label="Life cycle">
        <h2 className="mb-3 text-2xl font-semibold">Where this covenant is</h2>
        <StateDiagram active={c.state} className="w-full" />
      </section>
    </div>
  );
}
