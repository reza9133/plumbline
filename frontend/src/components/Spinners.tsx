import { PlumbMark } from './Logo';
import { MochiHead } from './Mochi';
import { GenLayerLogo } from './Logo';

/** Small inline loader: a plumb bob that swings and a ripple under it. */
export function PlumbSpinner({ size = 36, label = 'Loading' }: { size?: number; label?: string }) {
  return (
    <span role="status" aria-label={label} className="inline-flex flex-col items-center">
      <svg width={size} height={size * 1.15} viewBox="0 0 40 46" aria-hidden>
        <defs>
          <linearGradient id="ps-a" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="rgb(var(--c-brass))" stopOpacity="0.55" />
            <stop offset="1" stopColor="rgb(var(--c-brass))" />
          </linearGradient>
        </defs>
        <g className="animate-swing" style={{ transformOrigin: '20px 2px', transformBox: 'view-box' }}>
          <line
            x1="20"
            y1="2"
            x2="20"
            y2="22"
            stroke="rgb(var(--c-ink))"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
          <circle cx="20" cy="2.4" r="2" fill="rgb(var(--c-ink))" />
          <path d="M20 20l-4 3-4.5 8 8.5 13z" fill="url(#ps-a)" />
          <path d="M20 20l4 3 4.5 8-8.5 13z" fill="rgb(var(--c-brass))" opacity="0.7" />
        </g>
      </svg>
      <span className="-mt-1 block h-1.5 w-8 animate-ping2 rounded-full bg-brass/40" />
    </span>
  );
}

/** A cube that turns in 3D with the Plumbline mark, the GenLayer logo and Mochi on its faces. */
export function CubeSpinner({ size = 84, label = 'Loading' }: { size?: number; label?: string }) {
  const half = size / 2;
  const face =
    'absolute inset-0 flex items-center justify-center rounded-2xl border border-line/80 bg-surface/90 backdrop-blur';
  return (
    <div role="status" aria-label={label} className="perspective" style={{ width: size, height: size }}>
      <div className="preserve-3d relative h-full w-full animate-spin3d">
        <div className={face} style={{ transform: `translateZ(${half}px)` }}>
          <PlumbMark size={size * 0.6} />
        </div>
        <div className={face} style={{ transform: `rotateY(180deg) translateZ(${half}px)` }}>
          <MochiHead size={size * 0.7} />
        </div>
        <div className={face} style={{ transform: `rotateY(90deg) translateZ(${half}px)` }}>
          <GenLayerLogo className="h-1/2 w-1/2 text-ink" />
        </div>
        <div className={face} style={{ transform: `rotateY(-90deg) translateZ(${half}px)` }}>
          <PlumbMark size={size * 0.6} />
        </div>
        <div className={face} style={{ transform: `rotateX(90deg) translateZ(${half}px)` }} />
        <div className={face} style={{ transform: `rotateX(-90deg) translateZ(${half}px)` }} />
      </div>
    </div>
  );
}

/** Validators circling the bond while consensus runs. `active` pulses one validator at a time. */
export function ConsensusSpinner({
  size = 168,
  nodes = 5,
  label = 'Waiting for validators',
}: {
  size?: number;
  nodes?: number;
  label?: string;
}) {
  const r = size / 2 - 14;
  return (
    <div role="status" aria-label={label} className="relative" style={{ width: size, height: size }}>
      <span className="absolute inset-4 animate-ping2 rounded-full border border-cyan/50" />
      <span className="absolute inset-4 animate-ping2 rounded-full border border-magenta/40 [animation-delay:.9s]" />
      <svg className="absolute inset-0 animate-orbit" viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgb(var(--c-line))"
          strokeDasharray="3 6"
        />
        {Array.from({ length: nodes }, (_, i) => {
          const a = (i / nodes) * Math.PI * 2;
          return (
            <g key={i}>
              <circle
                cx={size / 2 + r * Math.cos(a)}
                cy={size / 2 + r * Math.sin(a)}
                r="7"
                fill="rgb(var(--c-surface))"
                stroke="rgb(var(--c-cyan))"
                strokeWidth="2"
              />
              <circle
                cx={size / 2 + r * Math.cos(a)}
                cy={size / 2 + r * Math.sin(a)}
                r="2.6"
                fill="rgb(var(--c-cyan))"
              >
                <animate
                  attributeName="opacity"
                  values="1;.2;1"
                  dur="1.8s"
                  begin={`${i * 0.36}s`}
                  repeatCount="indefinite"
                />
              </circle>
            </g>
          );
        })}
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <PlumbMark size={size * 0.34} swing />
      </div>
    </div>
  );
}

/** Mochi's head bobbing inside a glowing ring: the friendly full-page loader. */
export function MochiSpinner({ size = 120, label = 'Loading' }: { size?: number; label?: string }) {
  return (
    <div
      role="status"
      aria-label={label}
      className="relative grid place-items-center"
      style={{ width: size, height: size }}
    >
      <span className="absolute inset-0 animate-orbit rounded-full border-2 border-transparent border-t-cyan border-r-magenta" />
      <span className="absolute inset-2 animate-ping2 rounded-full bg-cyan/10" />
      <MochiHead size={size * 0.72} className="animate-float" />
    </div>
  );
}

export function PageLoader({ text = 'Loading…' }: { text?: string }) {
  return (
    <div className="grid min-h-[50vh] place-items-center">
      <div className="flex flex-col items-center gap-5">
        <CubeSpinner />
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-muted">{text}</p>
      </div>
    </div>
  );
}

export const Skeleton = ({ className = '' }: { className?: string }) => (
  <div className={`skeleton ${className}`} aria-hidden />
);
