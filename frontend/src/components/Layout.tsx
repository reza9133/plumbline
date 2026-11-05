import { Suspense, useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Github, Menu, Moon, Sun, X } from 'lucide-react';
import { CHAIN, CONTRACT_ADDRESS, LINKS, explorerAddress } from '../config';
import { useTheme } from '../theme/ThemeProvider';
import { NetworkBanner, WalletButton, WalletModal } from '../wallet/WalletUI';
import { BuiltOnGenLayer, GenLayerLogo, PlumbMark, Wordmark } from './Logo';
import { CopyButton } from './ui';
import { MochiHead } from './Mochi';
import { PageLoader } from './Spinners';
import { setDemo } from '../chain/client';
import { useDemo } from '../chain/hooks';

const NAV = [
  { to: '/covenants', label: 'Covenants' },
  { to: '/create', label: 'Create' },
  { to: '/inspect', label: 'Inspect' },
  { to: '/ledger', label: 'Ledger' },
  { to: '/tools', label: 'Tools' },
  { to: '/docs', label: 'Docs' },
  { to: '/about', label: 'About' },
];

export function XIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const dim = theme === 'dim';
  return (
    <button
      className="btn px-3"
      onClick={toggle}
      aria-label={`Switch to ${dim ? 'light' : 'dim'} theme`}
      title={`Theme: ${dim ? 'Dim' : 'Light'}`}
      data-testid="theme-toggle"
    >
      <motion.span
        key={theme}
        initial={{ rotate: -90, opacity: 0 }}
        animate={{ rotate: 0, opacity: 1 }}
        className="inline-flex"
      >
        {dim ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
      </motion.span>
      <span className="hidden text-xs sm:inline">{dim ? 'Dim' : 'Light'}</span>
    </button>
  );
}

function Header() {
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  useEffect(() => setOpen(false), [loc.pathname]);
  return (
    <header className="sticky top-0 z-40 border-b border-line/60 bg-bg/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4">
        <Link to="/" aria-label="Plumbline home" className="shrink-0">
          <Wordmark />
        </Link>
        <nav className="ml-4 hidden items-center gap-1 lg:flex" aria-label="Main">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                `relative rounded-lg px-3 py-2 text-sm font-semibold transition hover:text-ink ${isActive ? 'text-ink' : 'text-muted'}`
              }
            >
              {({ isActive }) => (
                <>
                  {n.label}
                  {isActive && (
                    <motion.span
                      layoutId="nav-under"
                      className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded bg-brass"
                    />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <WalletButton />
          <button
            className="btn px-3 lg:hidden"
            onClick={() => setOpen((o) => !o)}
            aria-label="Menu"
            aria-expanded={open}
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>
      <AnimatePresence>
        {open && (
          <motion.nav
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-line/60 lg:hidden"
            aria-label="Mobile"
          >
            <div className="mx-auto grid max-w-7xl grid-cols-2 gap-2 p-4">
              {NAV.map((n) => (
                <NavLink
                  key={n.to}
                  to={n.to}
                  className={({ isActive }) =>
                    `btn justify-start ${isActive ? 'border-brass/60 text-brass' : ''}`
                  }
                >
                  {n.label}
                </NavLink>
              ))}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}

function DemoBanner() {
  const demo = useDemo();
  if (!demo) return null;
  return (
    <div className="border-b border-brass/40 bg-brass/10 text-sm" data-testid="demo-banner">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-2">
        <MochiHead size={28} />
        <p className="flex-1">
          <b>Demo data.</b> You are looking at invented sample covenants, not the chain. Writes are switched
          off.
        </p>
        <button className="btn btn-sm" onClick={() => setDemo(false)}>
          Use live data
        </button>
      </div>
    </div>
  );
}

function Footer() {
  const demo = useDemo();
  return (
    <footer className="relative mt-24 border-t border-line/60 bg-surface2/40">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Wordmark />
          <p className="mt-4 max-w-sm text-sm text-muted">
            Bonded public promises. A publisher locks a bond behind a web page; GenLayer validators re-read
            the page and agree on what they saw.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <BuiltOnGenLayer />
          </div>
          <div className="mt-4 flex items-center gap-1 text-xs text-muted">
            <span>Contract</span>
            <a
              href={explorerAddress(CONTRACT_ADDRESS)}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-ink hover:text-cyan"
              title={CONTRACT_ADDRESS}
            >
              {CONTRACT_ADDRESS.slice(0, 10)}…{CONTRACT_ADDRESS.slice(-6)}
            </a>
            <CopyButton text={CONTRACT_ADDRESS} label="Copy contract address" />
          </div>
        </div>
        <FooterCol
          title="App"
          links={[
            ['/covenants', 'Covenants'],
            ['/create', 'Create a covenant'],
            ['/inspect', 'Inspector desk'],
            ['/ledger', 'The books'],
            ['/dashboard', 'My account'],
          ]}
        />
        <FooterCol
          title="Learn"
          links={[
            ['/docs', 'Documentation'],
            ['/docs/contract', 'Contract reference'],
            ['/docs/frontend', 'Using this app'],
            ['/tools', 'Tools'],
            ['/about', 'About'],
          ]}
        />
        <div>
          <h4 className="label">Community</h4>
          <ul className="space-y-2 text-sm">
            <li>
              <a
                className="inline-flex items-center gap-2 hover:text-cyan"
                href={LINKS.github}
                target="_blank"
                rel="noreferrer"
              >
                <Github className="h-4 w-4" /> GitHub · reza9133/plumbline
              </a>
            </li>
            <li>
              <a
                className="inline-flex items-center gap-2 hover:text-cyan"
                href={LINKS.x}
                target="_blank"
                rel="noreferrer"
              >
                <XIcon /> @amirhp771
              </a>
            </li>
            <li>
              <a
                className="inline-flex items-center gap-2 hover:text-cyan"
                href={LINKS.genlayer}
                target="_blank"
                rel="noreferrer"
              >
                <GenLayerLogo className="h-4 w-4" /> genlayer.com
              </a>
            </li>
            <li>
              <a
                className="inline-flex items-center gap-2 hover:text-cyan"
                href={CHAIN.explorer}
                target="_blank"
                rel="noreferrer"
              >
                <PlumbMark size={16} /> Explorer
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line/60">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-4 text-xs text-muted">
          <span>Studionet is a test network: GEN here has no monetary value. Not audited.</span>
          <label className="ml-auto inline-flex cursor-pointer items-center gap-2 font-semibold">
            <input
              type="checkbox"
              className="h-4 w-4 accent-[rgb(var(--c-cyan))]"
              checked={demo}
              onChange={(e) => setDemo(e.target.checked)}
              data-testid="demo-toggle"
            />
            Demo data (sample covenants, read-only)
          </label>
        </div>
      </div>
    </footer>
  );
}

const FooterCol = ({ title, links }: { title: string; links: [string, string][] }) => (
  <div>
    <h4 className="label">{title}</h4>
    <ul className="space-y-2 text-sm">
      {links.map(([to, text]) => (
        <li key={to}>
          <Link className="hover:text-cyan" to={to}>
            {text}
          </Link>
        </li>
      ))}
    </ul>
  </div>
);

export function Layout() {
  const loc = useLocation();
  useEffect(() => {
    if (!loc.hash) window.scrollTo({ top: 0 });
  }, [loc.pathname, loc.hash]);
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2"
      >
        Skip to content
      </a>
      <Header />
      <NetworkBanner />
      <DemoBanner />
      <main id="main" className="flex-1">
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
      <WalletModal />
    </div>
  );
}
