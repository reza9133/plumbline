import { useId } from 'react';

/** The Plumbline mark: a brass plumb bob on a line, circled by the bond ring. `swing` animates the bob. */
export function PlumbMark({
  size = 40,
  swing = false,
  className = '',
}: {
  size?: number;
  swing?: boolean;
  className?: string;
}) {
  const uid = useId().replace(/:/g, '');
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
      role="img"
      aria-label="Plumbline logo"
    >
      <defs>
        <linearGradient id={`${uid}bg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2b3868" />
          <stop offset="1" stopColor="#111730" />
        </linearGradient>
        <linearGradient id={`${uid}bl`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffe9a8" />
          <stop offset="1" stopColor="#d89a28" />
        </linearGradient>
        <linearGradient id={`${uid}br`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d9a032" />
          <stop offset="1" stopColor="#7d4c0b" />
        </linearGradient>
        <linearGradient id={`${uid}rg`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#22e0cf" />
          <stop offset="1" stopColor="#c660ee" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill={`url(#${uid}bg)`} />
      <path d="M9 40h7M48 40h7" stroke="#fff" strokeOpacity=".22" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M15 39a17 5.5 0 0 1 34 0"
        fill="none"
        stroke={`url(#${uid}rg)`}
        strokeWidth="2.2"
        strokeLinecap="round"
        opacity=".75"
      />
      <g
        className={swing ? 'animate-swing' : ''}
        style={{ transformOrigin: '32px 8.5px', transformBox: 'view-box' }}
      >
        <path d="M32 9v15" stroke="#eef0fa" strokeWidth="2" strokeLinecap="round" />
        <circle cx="32" cy="8.5" r="2.7" fill="#eef0fa" />
        <path d="M32 23l-3 2-4 7 7 25z" fill={`url(#${uid}bl)`} />
        <path d="M32 23l3 2 4 7-7 25z" fill={`url(#${uid}br)`} />
        <path d="M29 25h6" stroke="#fff3c9" strokeOpacity=".7" strokeWidth="1.2" strokeLinecap="round" />
      </g>
      <path
        d="M15 39a17 5.5 0 0 0 34 0"
        fill="none"
        stroke={`url(#${uid}rg)`}
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Wordmark({ size = 36 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <PlumbMark size={size} swing />
      <span className="font-display text-[1.55rem] font-semibold leading-none tracking-tight">
        Plumb<span className="text-brass">line</span>
      </span>
    </span>
  );
}

/** The GenLayer logo, traced from the official mark, drawn in the current text color. */
export function GenLayerLogo({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 93.72" className={className} fill="currentColor" role="img" aria-label="GenLayer">
      <path
        fillRule="evenodd"
        d="M49.72 44.75 L40.47 64.02 L40.75 64.36 L49.86 68.99 L59.46 64.30 L59.60 63.95 L50.14 45.17Z M54.83 0.07 L54.77 32.53 L71.69 68.16 L71.48 68.65 L56.01 76.45 L100.00 93.72 L55.46 0.90Z M45.17 0.00 L0.00 93.44 L0.07 93.72 L43.99 76.52 L43.85 76.24 L28.66 68.72 L28.31 68.23 L45.23 32.73Z"
      />
    </svg>
  );
}

export function BuiltOnGenLayer({ className = '' }: { className?: string }) {
  return (
    <a
      href="https://www.genlayer.com"
      target="_blank"
      rel="noreferrer"
      className={`inline-flex items-center gap-2 rounded-full border border-line bg-surface/70 px-3 py-1.5 text-xs font-semibold text-muted transition hover:border-cyan/60 hover:text-ink ${className}`}
    >
      <GenLayerLogo className="h-3.5 w-3.5 text-ink" />
      Built on GenLayer
    </a>
  );
}
