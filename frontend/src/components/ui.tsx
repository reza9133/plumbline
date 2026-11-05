import { useEffect, useRef, useState, type ReactNode, type MouseEvent } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Check, Copy, ExternalLink } from 'lucide-react';
import { explorerAddress } from '../config';
import { formatDuration, gen, shortAddr } from '../lib/format';
import type { CovenantState, ReadingKind } from '../chain/types';
import { MochiHead } from './Mochi';

export const STATE_STYLE: Record<CovenantState, { chip: string; dot: string; label: string }> = {
  NEW: { chip: 'border-muted/40 text-muted bg-surface2/60', dot: 'bg-muted', label: 'Draft' },
  ACTIVE: { chip: 'border-ok/50 text-ok bg-ok/10', dot: 'bg-ok', label: 'Active' },
  WARNED: { chip: 'border-warn/60 text-warn bg-warn/10', dot: 'bg-warn', label: 'Warned' },
  BROKEN: { chip: 'border-bad/60 text-bad bg-bad/10', dot: 'bg-bad', label: 'Broken' },
  MATURED: { chip: 'border-cyan/50 text-cyan bg-cyan/10', dot: 'bg-cyan', label: 'Matured' },
  CANCELLED: { chip: 'border-line text-muted bg-surface2/40', dot: 'bg-muted/60', label: 'Cancelled' },
};

export function StateBadge({ state }: { state: CovenantState }) {
  const s = STATE_STYLE[state];
  const live = state === 'ACTIVE' || state === 'WARNED';
  return (
    <span className={`chip ${s.chip}`}>
      <span className="relative flex h-2 w-2">
        {live && (
          <span
            className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${s.dot}`}
          />
        )}
        <span className={`relative inline-flex h-2 w-2 rounded-full ${s.dot}`} />
      </span>
      {s.label}
    </span>
  );
}

const KIND_STYLE: Record<ReadingKind, string> = {
  CLEAN: 'border-ok/50 text-ok bg-ok/10',
  DRIFT: 'border-warn/50 text-warn bg-warn/10',
  BREACH: 'border-bad/60 text-bad bg-bad/10',
  DARK: 'border-muted/50 text-muted bg-surface2/60',
};
export const KindBadge = ({ kind }: { kind: ReadingKind }) => (
  <span className={`chip ${KIND_STYLE[kind]}`}>{kind}</span>
);

export function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className="inline-grid h-6 w-6 place-items-center rounded-md text-muted transition hover:bg-surface2 hover:text-ink"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1400);
        } catch {
          /* clipboard blocked */
        }
      }}
    >
      {done ? <Check className="h-3.5 w-3.5 text-ok" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

export function Address({
  value,
  you = false,
  full = false,
}: {
  value: string;
  you?: boolean;
  full?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1 font-mono text-[13px]">
      <a
        href={explorerAddress(value)}
        target="_blank"
        rel="noreferrer"
        className="hover:text-cyan"
        title={value}
      >
        {full ? value : shortAddr(value)}
      </a>
      {you && (
        <span className="chip border-brass/50 bg-brass/10 px-1.5 py-0 text-[10px] text-brass">you</span>
      )}
      <CopyButton text={value} label="Copy address" />
    </span>
  );
}

export const ExtLink = ({ href, children }: { href: string; children: ReactNode }) => (
  <a href={href} target="_blank" rel="noreferrer" className="link inline-flex items-center gap-1">
    {children}
    <ExternalLink className="h-3.5 w-3.5" />
  </a>
);

export function GenAmount({
  wei,
  className = '',
  decimals = 4,
}: {
  wei: bigint;
  className?: string;
  decimals?: number;
}) {
  return (
    <span className={`font-mono tabular-nums ${className}`} title={`${wei.toString()} wei`}>
      {gen(wei, decimals)}
    </span>
  );
}

/** Seconds since the epoch, ticking once a second. */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

export function Countdown({ to, doneText = 'now' }: { to: number; doneText?: string }) {
  const now = useNow();
  const left = to - now;
  return <span className="font-mono tabular-nums">{left <= 0 ? doneText : formatDuration(left)}</span>;
}

export function Stat({
  label,
  value,
  hint,
  accent = false,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  accent?: boolean;
}) {
  return (
    <div className="card-pad">
      <p className="label mb-1">{label}</p>
      <p className={`font-display text-3xl font-semibold tabular-nums ${accent ? 'text-brass' : ''}`}>
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function EmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="card-pad flex flex-col items-center gap-3 py-12 text-center">
      <MochiHead size={96} className="animate-float" />
      <h3 className="text-xl font-semibold">{title}</h3>
      {children && <div className="max-w-md text-sm text-muted">{children}</div>}
      {action}
    </div>
  );
}

export function ErrorPanel({
  error,
  onRetry,
  extra,
}: {
  error: unknown;
  onRetry?: () => void;
  extra?: ReactNode;
}) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    <div className="card-pad border-bad/40 text-sm">
      <p className="mb-1 font-display text-lg font-semibold text-bad">Could not read the contract</p>
      <p className="mb-3 break-words text-muted">{message}</p>
      <div className="flex flex-wrap items-center gap-2">
        {onRetry && (
          <button className="btn btn-sm" onClick={onRetry}>
            Try again
          </button>
        )}
        {extra}
      </div>
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    ref.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center p-4">
      <motion.div
        className="absolute inset-0 bg-[rgb(8_10_24/0.62)] backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={onClose}
      />
      <motion.div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className={`card relative max-h-[88vh] w-full overflow-auto p-6 outline-none ${wide ? 'max-w-2xl' : 'max-w-md'}`}
      >
        {children}
      </motion.div>
    </div>
  );
}

/** A card that tilts toward the pointer in 3D and carries a moving glare. */
export function TiltCard({
  children,
  className = '',
  max = 9,
}: {
  children: ReactNode;
  className?: string;
  max?: number;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const onMove = (e: MouseEvent) => {
    const el = ref.current;
    if (!el || reduce) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    el.style.transform = `perspective(900px) rotateY(${(x - 0.5) * max * 2}deg) rotateX(${(0.5 - y) * max * 2}deg) translateZ(0)`;
    el.style.setProperty('--gx', `${x * 100}%`);
    el.style.setProperty('--gy', `${y * 100}%`);
  };
  const onLeave = () => {
    if (ref.current) ref.current.style.transform = '';
  };
  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={`group relative transition-transform duration-200 ease-out will-change-transform ${className}`}
      style={{ ['--gx' as string]: '50%', ['--gy' as string]: '50%' }}
    >
      {children}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background:
            'radial-gradient(260px circle at var(--gx) var(--gy), rgb(var(--c-cyan) / .14), transparent 70%)',
        }}
      />
    </div>
  );
}

export function SectionTitle({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string;
  title: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="mb-8 max-w-2xl">
      {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
      <h2 className="text-balance text-3xl font-semibold sm:text-4xl">{title}</h2>
      {children && <p className="mt-3 text-muted">{children}</p>}
    </header>
  );
}

export function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div>
      <span className="label">{label}</span>
      {children}
      {error ? (
        <p className="mt-1.5 text-xs font-semibold text-bad">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  );
}
