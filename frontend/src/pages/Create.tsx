import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, Plus, Trash2 } from 'lucide-react';
import { useCovenantsOf, useDemo, useRecord } from '../chain/hooks';
import { useWallet } from '../wallet/WalletProvider';
import { useTx } from '../tx/TxProvider';
import { planCreate, resolveCreatedId } from '../tx/plans';
import { Field, GenAmount } from '../components/ui';
import { DurationInput } from '../components/DurationInput';
import { MochiSays } from '../components/Mochi';
import {
  canonicalPage,
  charLength,
  LIMITS,
  splitBond,
  validateDraft,
  validateTenet,
  type TenetDraft,
} from '../lib/rules';
import { formatDuration, parseGen } from '../lib/format';

const STEPS = ['The promise', 'The rules', 'Tenets', 'Bond & review'] as const;

export default function Create() {
  const navigate = useNavigate();
  const tx = useTx();
  const demo = useDemo();
  const wallet = useWallet();
  const mine = useCovenantsOf(wallet.account);
  const record = useRecord(wallet.account);

  const [step, setStep] = useState(0);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [beneficiary, setBeneficiary] = useState('');
  const [bound, setBound] = useState(true);
  const [term, setTerm] = useState(14 * 86400);
  const [cure, setCure] = useState(2 * 86400);
  const [gap, setGap] = useState(86400);
  const [freshOn, setFreshOn] = useState(false);
  const [maxAge, setMaxAge] = useState(90 * 86400);
  const [tenets, setTenets] = useState<TenetDraft[]>([{ text: '', anchor: '' }]);
  const [bondText, setBondText] = useState('0.05');
  const [activate, setActivate] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const bond = parseGen(bondText);
  const draft = {
    title,
    url,
    beneficiary,
    publisher: wallet.account,
    term,
    cure,
    gap,
    maxAge: freshOn ? maxAge : 0,
    bond,
  };
  const errors = validateDraft(draft);
  const tenetErrors = tenets.map((t, i) =>
    validateTenet(
      t,
      tenets.filter((_, j) => j < i),
    ),
  );
  const filled = tenets.filter((t) => t.text.trim());
  const tenetsOk =
    filled.length >= 1 &&
    tenets.every((t, i) => !t.text.trim() || Object.keys(tenetErrors[i] ?? {}).length === 0) &&
    tenets.every((t) => t.text.trim() || !t.anchor.trim());

  const dup = useMemo(() => {
    if (!url || !mine.data) return null;
    const key = canonicalPage(url);
    return key
      ? (mine.data.find(
          (c) =>
            (c.state === 'NEW' || c.state === 'ACTIVE' || c.state === 'WARNED') &&
            canonicalPage(c.url) === key,
        ) ?? null)
      : null;
  }, [url, mine.data]);
  const tooMany = (record.data?.live ?? 0) >= LIMITS.maxOpen;

  const stepErrors: Record<number, (keyof typeof errors)[]> = {
    0: ['title', 'url', 'beneficiary'],
    1: ['term', 'cure', 'gap', 'maxAge'],
    3: ['bond'],
  };
  const stepOk = (s: number) =>
    (s === 2 ? tenetsOk : !(stepErrors[s] ?? []).some((k) => errors[k])) && (s !== 0 || !dup);
  const allOk = [0, 1, 2, 3].every(stepOk) && !tooMany;
  const show = (k: keyof typeof errors) => (touched[k] ? errors[k] : undefined);
  const touch = (k: string) => setTouched((t) => ({ ...t, [k]: true }));

  const split = bond ? splitBond(bond) : null;

  const submit = async () => {
    if (!allOk || bond === null || demo) return;
    let account = wallet.account;
    if (!account) {
      try {
        account = (await wallet.ensureReady()).account;
      } catch {
        return;
      }
    }
    const final = { ...draft, publisher: account, bond, bound };
    if (Object.keys(validateDraft(final)).length) return;
    const r = await tx.run(planCreate(final, filled, account, activate));
    if (r.ok) {
      const id = await resolveCreatedId(r.results, account, url).catch(() => null);
      navigate(id !== null ? `/covenants/${id}` : '/dashboard');
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <p className="eyebrow mb-2">New covenant</p>
      <h1 className="text-4xl font-semibold sm:text-5xl">Put a bond behind a promise</h1>
      <p className="mt-2 max-w-2xl text-muted">
        Four short steps. Nothing is sent to the chain until the last one, and the contract re-checks every
        rule you see here.
      </p>

      <ol className="my-8 grid grid-cols-4 gap-2" aria-label="Steps">
        {STEPS.map((s, i) => (
          <li key={s}>
            <button
              onClick={() => setStep(i)}
              className={`w-full rounded-xl border px-2 py-2.5 text-left text-xs font-bold transition sm:px-3 sm:text-sm ${i === step ? 'border-brass bg-brass/15 text-brass' : i < step ? 'border-ok/40 text-ok' : 'border-line text-muted'}`}
              aria-current={i === step ? 'step' : undefined}
            >
              <span className="mr-1.5 inline-grid h-5 w-5 place-items-center rounded-full border border-current text-[11px]">
                {i < step && stepOk(i) ? <Check className="h-3 w-3" /> : i + 1}
              </span>
              <span className="hidden sm:inline">{s}</span>
            </button>
          </li>
        ))}
      </ol>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.2 }}
          className="card-pad space-y-5"
        >
          {step === 0 && (
            <>
              <Field
                label="Title"
                error={show('title')}
                hint={`${charLength(title)}/${LIMITS.maxTitle} characters`}
              >
                <input
                  className="input"
                  value={title}
                  maxLength={80}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={() => touch('title')}
                  placeholder="We never sell personal data"
                />
              </Field>
              <Field
                label="Page that must keep the promise"
                error={
                  show('url') ??
                  (dup ? `You already have a live covenant on this page (#${dup.id}).` : undefined)
                }
                hint="One public http(s) link. http/https, www., trailing slash, #fragment and tracking parameters do not make a different page."
              >
                <input
                  className="input font-mono"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onBlur={() => touch('url')}
                  placeholder="https://example.org/promise"
                  inputMode="url"
                />
              </Field>
              <Field
                label="Beneficiary"
                error={show('beneficiary')}
                hint="Receives the bond if the covenant breaks. Fixed forever, never you. A beneficiary you control makes the bond worthless, so name someone independent."
              >
                <input
                  className="input font-mono"
                  value={beneficiary}
                  onChange={(e) => setBeneficiary(e.target.value)}
                  onBlur={() => touch('beneficiary')}
                  placeholder="0x…"
                  spellCheck={false}
                />
              </Field>
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line/70 p-4">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 accent-[rgb(var(--c-cyan))]"
                  checked={bound}
                  onChange={(e) => setBound(e.target.checked)}
                />
                <span className="text-sm">
                  <b>Bind the page to my address.</b> The page must contain your account address (any letter
                  case) for the whole life of the covenant. It proves you control the page; removing it is a
                  breach.
                  {bound && wallet.account && (
                    <span className="mt-1 block font-mono text-xs text-muted">
                      Put this on the page: {wallet.account.toLowerCase()}
                    </span>
                  )}
                  {bound && !wallet.account && (
                    <span className="mt-1 block text-xs text-muted">
                      Connect your wallet to see the exact address to publish.
                    </span>
                  )}
                </span>
              </label>
            </>
          )}

          {step === 1 && (
            <>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field
                  label="Term"
                  error={show('term')}
                  hint="How long the covenant is watched after activation (1 minute to 366 days)."
                >
                  <DurationInput
                    value={term}
                    onChange={(v) => {
                      setTerm(v);
                      touch('term');
                    }}
                    label="Term"
                  />
                </Field>
                <Field
                  label="Cure time"
                  error={show('cure')}
                  hint="Time to repair the page after a warning (1 minute to 30 days)."
                >
                  <DurationInput
                    value={cure}
                    onChange={(v) => {
                      setCure(v);
                      touch('cure');
                    }}
                    label="Cure time"
                  />
                </Field>
                <Field
                  label="Gap between readings"
                  error={show('gap')}
                  hint="Smallest distance between two readings (1 minute to 7 days)."
                >
                  <DurationInput
                    value={gap}
                    onChange={(v) => {
                      setGap(v);
                      touch('gap');
                    }}
                    label="Gap"
                  />
                </Field>
                <div>
                  <label className="mb-2 flex cursor-pointer items-center gap-2 text-sm font-semibold">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-[rgb(var(--c-cyan))]"
                      checked={freshOn}
                      onChange={(e) => setFreshOn(e.target.checked)}
                    />{' '}
                    Require a fresh date on the page
                  </label>
                  {freshOn ? (
                    <Field
                      label="Newest date may be at most"
                      error={show('maxAge')}
                      hint="A page with no date counts as stale. Dates have day resolution, so use a day or more."
                    >
                      <DurationInput
                        value={maxAge}
                        onChange={(v) => {
                          setMaxAge(v);
                          touch('maxAge');
                        }}
                        label="Freshness"
                      />
                    </Field>
                  ) : (
                    <p className="text-xs text-muted">Off: the date on the page is not checked.</p>
                  )}
                </div>
              </div>
              <MochiSays>
                <p>
                  Short cure times are harsh: one bad reading, then a short wait, then a second one breaks the
                  bond. Give a human enough time to notice and fix the page. Pages whose text changes on every
                  visit (clocks, rotating ads) can make validators disagree, so pick a stable page.
                </p>
              </MochiSays>
            </>
          )}

          {step === 2 && (
            <>
              <p className="text-sm text-muted">
                A tenet is one promise in plain words (the AI checks it). The anchor is optional exact wording
                that must stay on the page (plain string matching, case and spacing aside). Up to{' '}
                {LIMITS.maxTenets}.
              </p>
              {tenets.map((t, i) => (
                <div key={i} className="space-y-3 rounded-xl border border-line/70 p-4">
                  <div className="flex items-center justify-between">
                    <p className="label mb-0">Tenet {i + 1}</p>
                    {tenets.length > 1 && (
                      <button
                        className="btn-ghost btn-sm text-bad"
                        onClick={() => setTenets((s) => s.filter((_, j) => j !== i))}
                        aria-label={`Remove tenet ${i + 1}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <Field
                    label="Promise"
                    error={t.text ? tenetErrors[i]?.text : undefined}
                    hint={`${charLength(t.text)}/${LIMITS.maxTenet} characters`}
                  >
                    <textarea
                      className="input min-h-[76px]"
                      value={t.text}
                      maxLength={400}
                      onChange={(e) =>
                        setTenets((s) => s.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))
                      }
                      placeholder="The company never sells personal data to third parties."
                    />
                  </Field>
                  <Field
                    label="Anchor (optional)"
                    error={tenetErrors[i]?.anchor}
                    hint="Exact words on the page, e.g. “never sell personal data”. If they disappear, that is hard evidence."
                  >
                    <input
                      className="input"
                      value={t.anchor}
                      maxLength={120}
                      onChange={(e) =>
                        setTenets((s) => s.map((x, j) => (j === i ? { ...x, anchor: e.target.value } : x)))
                      }
                    />
                  </Field>
                </div>
              ))}
              {tenets.length < LIMITS.maxTenets && (
                <button className="btn" onClick={() => setTenets((s) => [...s, { text: '', anchor: '' }])}>
                  <Plus className="h-4 w-4" /> Add another tenet
                </button>
              )}
            </>
          )}

          {step === 3 && (
            <>
              <Field
                label="Bond (GEN)"
                error={show('bond')}
                hint="Between 0.01 and 1,000,000,000 GEN. Locked until the covenant ends; it can only be topped up, never withdrawn while live."
              >
                <input
                  className="input font-mono"
                  inputMode="decimal"
                  value={bondText}
                  onChange={(e) => setBondText(e.target.value)}
                  onBlur={() => touch('bond')}
                />
              </Field>
              {split && !errors.bond && (
                <p className="text-sm text-muted">
                  If it breaks: finder <GenAmount wei={split.finder} /> · closer{' '}
                  <GenAmount wei={split.closer} /> · beneficiary <GenAmount wei={split.beneficiary} />.
                </p>
              )}
              <dl className="divide-y divide-line/50 rounded-xl border border-line/70 text-sm">
                {[
                  ['Title', title || '—'],
                  ['Page', url || '—'],
                  ['Beneficiary', beneficiary || '—'],
                  ['Bound to your address', bound ? 'yes' : 'no'],
                  ['Term', formatDuration(term)],
                  ['Cure time', formatDuration(cure)],
                  ['Gap', formatDuration(gap)],
                  ['Freshness', freshOn ? formatDuration(maxAge) : 'off'],
                  ['Tenets', `${filled.length}`],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4 px-4 py-2">
                    <dt className="text-muted">{k}</dt>
                    <dd className="break-all text-right font-semibold">{v}</dd>
                  </div>
                ))}
              </dl>
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line/70 p-4">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 accent-[rgb(var(--c-cyan))]"
                  checked={activate}
                  onChange={(e) => setActivate(e.target.checked)}
                />
                <span className="text-sm">
                  <b>Activate straight after the tenets.</b> The page is read once, strictly: it must already
                  contain every anchor{bound ? ', your address' : ''} and clearly state every tenet, or the
                  covenant stays a draft (you can retry from its page). Leave this off if the page is not
                  ready yet.
                </span>
              </label>
              {tooMany && (
                <p className="rounded-lg bg-bad/10 p-3 text-sm font-semibold text-bad">
                  You already have {LIMITS.maxOpen} live covenants, the maximum per publisher.
                </p>
              )}
              {demo && (
                <p className="rounded-lg bg-brass/10 p-3 text-sm font-semibold text-brass">
                  Demo data is on, so writes are switched off. Turn it off in the footer to send transactions.
                </p>
              )}
              <p className="text-xs text-muted">
                This sends {1 + filled.length + (activate ? 1 : 0)} transactions in a row: create (with the
                bond), {filled.length} tenet{filled.length === 1 ? '' : 's'}
                {activate ? ', activate' : ''}. Your wallet asks you each time.
              </p>
            </>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="mt-6 flex items-center justify-between">
        <button className="btn" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        {step < 3 ? (
          <button
            className="btn-primary"
            onClick={() => {
              (stepErrors[step] ?? []).forEach(touch);
              if (stepOk(step)) setStep(step + 1);
            }}
          >
            Next <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            className="btn-primary px-6"
            disabled={!allOk || tx.busy || demo}
            onClick={() => void submit()}
            data-testid="create-submit"
          >
            {wallet.status === 'connected' ? 'Lock the bond and create' : 'Connect wallet to continue'}
          </button>
        )}
      </div>
    </div>
  );
}
