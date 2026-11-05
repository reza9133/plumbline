import { lazy, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Anchor, BookOpen, Coins, Eye, FileText, Landmark, Scale, ShieldAlert } from 'lucide-react';
import { useStats } from '../chain/hooks';
import { StateDiagram } from '../components/StateDiagram';
import { BuiltOnGenLayer } from '../components/Logo';
import { MochiFull, MochiSays } from '../components/Mochi';
import { Skeleton } from '../components/Spinners';
import { GenAmount, SectionTitle, TiltCard } from '../components/ui';
import { SceneGuard } from '../three/webgl';
import { useTheme } from '../theme/ThemeProvider';
import { splitBond } from '../lib/rules';

const HeroScene = lazy(() => import('../three/HeroScene'));

function StaticStage() {
  return (
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_40%_40%,rgb(var(--c-cyan)/0.12),transparent_60%)]" />
  );
}

function LiveStats() {
  const { data, isLoading, isError } = useStats();
  const cells: [string, React.ReactNode][] = data
    ? [
        ['Covenants', data.covenants],
        ['Bonds locked', <GenAmount key="l" wei={data.locked} decimals={2} />],
        ['Readings', data.readings],
        ['Broken · Matured', `${data.broken} · ${data.matured}`],
      ]
    : [];
  return (
    <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4" aria-live="polite">
      {isLoading && Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[74px]" />)}
      {isError && (
        <p className="col-span-full text-sm text-muted">
          Live numbers are unavailable right now. The rest of the page still works.
        </p>
      )}
      {cells.map(([k, v]) => (
        <div key={k} className="card px-4 py-3">
          <p className="label mb-0.5">{k}</p>
          <p className="font-display text-2xl font-semibold tabular-nums">{v}</p>
        </div>
      ))}
    </div>
  );
}

function Hero() {
  const { theme } = useTheme();
  const reduce = useReducedMotion();
  const stage = useRef<HTMLDivElement>(null);
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 pb-16 pt-12 lg:grid-cols-[1.05fr_1fr] lg:pt-20">
        <div className="relative z-10 animate-fadeUp">
          <BuiltOnGenLayer className="mb-6" />
          <h1 className="text-balance text-5xl font-semibold leading-[1.02] sm:text-6xl lg:text-7xl">
            A bond behind{' '}
            <span className="bg-gradient-to-r from-brass via-[#f4cf76] to-brass bg-clip-text text-transparent">
              every promise.
            </span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-muted">
            Lock a bond behind a web page and the sentences it must keep saying. GenLayer validators re-read
            the page and agree on what they saw. If the page stops standing behind its promises, the bond is
            slashed to the people who caught it.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/create" className="btn-primary px-6 py-3 text-base">
              Make a promise
            </Link>
            <Link to="/covenants" className="btn px-6 py-3 text-base">
              Browse covenants
            </Link>
            <Link to="/docs" className="btn-ghost px-4 py-3 text-base">
              <BookOpen className="h-4 w-4" /> Read the docs
            </Link>
          </div>
          <LiveStats />
        </div>

        <div ref={stage} className="relative mx-auto aspect-[4/4.4] w-full max-w-[560px]" aria-hidden={false}>
          <div className="absolute inset-0 overflow-hidden rounded-[2rem] border border-line/70 bg-gradient-to-b from-surface/60 to-surface2/40 shadow-card">
            <SceneGuard fallback={<StaticStage />}>
              <HeroScene dim={theme === 'dim'} animate={!reduce} />
            </SceneGuard>
          </div>
          <motion.div
            className="pointer-events-none absolute -bottom-3 -right-2 w-[38%] sm:w-[40%]"
            initial={reduce ? false : { opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
          >
            <MochiFull />
          </motion.div>
          <div className="absolute left-3 top-4 w-52">
            <TiltCard max={12}>
              <div className="card px-3.5 py-2.5 text-sm shadow-glow">
                <p className="label mb-0.5">Example · tenet 1</p>
                <p className="font-semibold">We never sell personal data.</p>
                <p className="mt-1 flex items-center gap-1.5 text-xs font-bold text-ok">
                  <span className="h-2 w-2 rounded-full bg-ok" /> HELD · quote verified
                </p>
              </div>
            </TiltCard>
          </div>
          <div className="absolute bottom-8 left-3 w-44">
            <TiltCard max={12}>
              <div className="card px-3.5 py-2.5 text-sm">
                <p className="label mb-0.5">Example · bond</p>
                <p className="font-display text-xl font-semibold text-brass">0.50 GEN</p>
                <p className="text-xs text-muted">locked until the term ends</p>
              </div>
            </TiltCard>
          </div>
          <p className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[11px] text-muted">
            Click the stage to pluck the plumb bob
          </p>
        </div>
      </div>
    </section>
  );
}

const STEPS = [
  {
    icon: Coins,
    title: 'Post a bond',
    text: 'The publisher names a public page and an independent beneficiary, and attaches GEN. It stays locked while the covenant lives.',
  },
  {
    icon: FileText,
    title: 'Write tenets',
    text: 'Up to six promises in plain words, each with optional exact words (an anchor) that must stay on the page.',
  },
  {
    icon: Eye,
    title: 'Anyone inspects',
    text: 'Validators fetch the page and an AI inspector reads it. Plain arithmetic decides what is hard evidence.',
  },
  {
    icon: Scale,
    title: 'Settle',
    text: 'A warning, a cure window, then either a slash or the bond returns when the term ends.',
  },
];

const CASES = [
  ['Warrant canary', 'A page that must keep saying "no secret orders received".'],
  ['"We never sell your data"', 'The clause stays on the page, word for word, or the bond pays.'],
  ['Price or API lock', 'A price or deprecation promise with money behind it.'],
  ['Security contact', 'A published disclosure address that has to stay reachable.'],
  ['Retention period', '"Logs are deleted after 90 days" with a freshness date.'],
  ['License pledge', 'The core library stays under the license you announced.'],
];

export default function Home() {
  const split = splitBond(10_000n * 10n ** 14n);
  return (
    <>
      <Hero />

      <section className="mx-auto max-w-7xl px-4 py-16">
        <SectionTitle eyebrow="How it works" title="Four steps from a sentence to a bond">
          A plumb line shows whether a wall is still straight. A covenant shows whether a page still says what
          it said when the bond was posted.
        </SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
            >
              <TiltCard className="h-full">
                <div className="card-pad h-full">
                  <div className="mb-4 flex items-center justify-between">
                    <span className="grid h-11 w-11 place-items-center rounded-xl bg-brass/15 text-brass">
                      <s.icon className="h-5 w-5" />
                    </span>
                    <span className="font-display text-4xl font-semibold text-line">{i + 1}</span>
                  </div>
                  <h3 className="mb-1.5 text-xl font-semibold">{s.title}</h3>
                  <p className="text-sm leading-6 text-muted">{s.text}</p>
                </div>
              </TiltCard>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <SectionTitle eyebrow="Why it can be trusted" title="The model can only add alarms">
              A bond that is slashed on an LLM's say-so would be a bad bond. So the work is split between
              plain code that every validator runs identically, and an inspector that can only raise concerns.
            </SectionTitle>
            <ul className="space-y-4">
              <li className="flex gap-4">
                <Anchor className="mt-1 h-5 w-5 shrink-0 text-cyan" />
                <p className="text-sm leading-6">
                  <b>Arithmetic is hard evidence.</b> The publisher's address, every anchor phrase, a fresh
                  date, no steering text, a readable page. Identical on every validator, so it can start a
                  warning.
                </p>
              </li>
              <li className="flex gap-4">
                <ShieldAlert className="mt-1 h-5 w-5 shrink-0 text-magenta" />
                <p className="text-sm leading-6">
                  <b>The AI needs a real quote.</b> HELD, WEAKENED, MISSING or CONTRADICTED. A verdict without
                  a sentence copied from the page becomes UNSURE and is never punished. Only CONTRADICTED can
                  hurt, and only when both the leader and the validators find it.
                </p>
              </li>
              <li className="flex gap-4">
                <Landmark className="mt-1 h-5 w-5 shrink-0 text-brass" />
                <p className="text-sm leading-6">
                  <b>Time protects the publisher.</b> One hard reading only opens a warning. The page can be
                  repaired during the cure time; a break needs a second hard reading after it.
                </p>
              </li>
            </ul>
          </div>
          <div className="card-pad">
            <p className="label mb-3">Covenant life cycle</p>
            <StateDiagram className="w-full" />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16">
        <SectionTitle eyebrow="What it is for" title="Promises a page can keep, or not" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CASES.map(([t, d]) => (
            <div key={t} className="card flex gap-3 p-4">
              <span className="mt-1 h-2 w-2 shrink-0 rotate-45 bg-brass" />
              <div>
                <p className="font-semibold">{t}</p>
                <p className="text-sm text-muted">{d}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="card-pad grid items-center gap-8 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <p className="eyebrow mb-2">Where the money goes</p>
            <h2 className="text-3xl font-semibold">
              If a covenant breaks, nothing is lost and nobody guesses
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted">
              5% to whoever opened the warning, 10% to whoever confirmed it after the cure time, the rest to
              the beneficiary the publisher named in advance. A share that would go to the publisher goes to
              the beneficiary instead. Payouts are pull-based: <code>collect()</code>.
            </p>
          </div>
          <div>
            <p className="label mb-2">Example: a 1.0 GEN bond</p>
            <div className="flex h-12 overflow-hidden rounded-xl text-xs font-bold text-[#0d1226]">
              <motion.div
                initial={{ width: 0 }}
                whileInView={{ width: '5%' }}
                viewport={{ once: true }}
                className="grid place-items-center bg-cyan"
              />
              <motion.div
                initial={{ width: 0 }}
                whileInView={{ width: '10%' }}
                viewport={{ once: true }}
                transition={{ delay: 0.15 }}
                className="grid place-items-center bg-magenta"
              />
              <motion.div
                initial={{ width: 0 }}
                whileInView={{ width: '85%' }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
                className="grid place-items-center bg-brass"
              >
                85% beneficiary
              </motion.div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
              <p>
                <span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm bg-cyan" />
                Finder <GenAmount wei={split.finder} />
              </p>
              <p>
                <span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm bg-magenta" />
                Closer <GenAmount wei={split.closer} />
              </p>
              <p>
                <span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm bg-brass" />
                Beneficiary <GenAmount wei={split.beneficiary} />
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-16 text-center">
        <MochiSays title="Ready?">
          <p>
            Connect a wallet, pick a page you control, and put a bond where your words are. Or browse what
            others have promised and keep them honest.
          </p>
        </MochiSays>
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          <Link to="/create" className="btn-primary px-6 py-3">
            Create a covenant
          </Link>
          <Link to="/inspect" className="btn px-6 py-3">
            Open the inspector desk
          </Link>
        </div>
      </section>
    </>
  );
}
