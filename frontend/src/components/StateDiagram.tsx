import type { CovenantState } from '../chain/types';

interface Node {
  id: CovenantState;
  x: number;
  y: number;
  color: string;
  sub: string;
}
const NODES: Node[] = [
  { id: 'NEW', x: 90, y: 150, color: 'var(--c-muted)', sub: 'draft · bond locked' },
  { id: 'CANCELLED', x: 90, y: 280, color: 'var(--c-muted)', sub: 'bond credited back' },
  { id: 'ACTIVE', x: 390, y: 150, color: 'var(--c-ok)', sub: 'under watch' },
  { id: 'WARNED', x: 760, y: 46, color: 'var(--c-warn)', sub: 'cure time runs' },
  { id: 'BROKEN', x: 760, y: 160, color: 'var(--c-bad)', sub: 'bond slashed' },
  { id: 'MATURED', x: 760, y: 284, color: 'var(--c-cyan)', sub: 'bond returns' },
];

interface Edge {
  from: CovenantState;
  to: CovenantState;
  d: string;
  label: string;
  lx: number;
  ly: number;
  anchor?: 'start' | 'middle';
}
const EDGES: Edge[] = [
  {
    from: 'NEW',
    to: 'ACTIVE',
    d: 'M150 150 H330',
    label: 'activate (clean reading)',
    lx: 240,
    ly: 138,
    anchor: 'middle',
  },
  { from: 'NEW', to: 'CANCELLED', d: 'M90 182 V248', label: 'cancel', lx: 104, ly: 220, anchor: 'start' },
  {
    from: 'ACTIVE',
    to: 'WARNED',
    d: 'M410 118 C470 40 560 30 698 40',
    label: 'hard evidence',
    lx: 560,
    ly: 24,
    anchor: 'middle',
  },
  {
    from: 'WARNED',
    to: 'ACTIVE',
    d: 'M706 66 C640 100 540 124 452 136',
    label: 'clean or drift = cure (max 2)',
    lx: 585,
    ly: 138,
    anchor: 'middle',
  },
  {
    from: 'WARNED',
    to: 'BROKEN',
    d: 'M760 78 V128',
    label: 'hard evidence after cure time',
    lx: 774,
    ly: 108,
    anchor: 'start',
  },
  {
    from: 'ACTIVE',
    to: 'BROKEN',
    d: 'M452 160 H698',
    label: 'hard evidence after 2 cures',
    lx: 575,
    ly: 180,
    anchor: 'middle',
  },
  {
    from: 'ACTIVE',
    to: 'MATURED',
    d: 'M410 182 C450 270 560 284 698 284',
    label: 'term over · mature',
    lx: 560,
    ly: 312,
    anchor: 'middle',
  },
];

/** The covenant life cycle as a diagram; `active` lights up one state. */
export function StateDiagram({ active, className = '' }: { active?: CovenantState; className?: string }) {
  return (
    <svg
      viewBox="0 0 960 330"
      className={className}
      role="img"
      aria-label="Covenant states and transitions: draft, active, warned, broken, matured, cancelled"
    >
      <defs>
        <marker
          id="sd-arrow"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto-start-reverse"
        >
          <path d="M0 0L10 5L0 10z" fill="rgb(var(--c-muted))" />
        </marker>
      </defs>
      {EDGES.map((e) => (
        <g key={e.from + e.to}>
          <path
            d={e.d}
            fill="none"
            stroke="rgb(var(--c-muted))"
            strokeOpacity=".6"
            strokeWidth="1.8"
            markerEnd="url(#sd-arrow)"
            strokeDasharray="6 6"
            className="animate-dash"
          />
          <text
            x={e.lx}
            y={e.ly}
            textAnchor={e.anchor ?? 'middle'}
            fontSize="11.5"
            fill="rgb(var(--c-muted))"
            fontFamily="var(--font-sans, Manrope Variable, sans-serif)"
          >
            {e.label}
          </text>
        </g>
      ))}
      {NODES.map((n) => {
        const on = active === n.id;
        return (
          <g key={n.id} transform={`translate(${n.x - 58} ${n.y - 30})`}>
            <rect
              width="116"
              height="60"
              rx="16"
              fill={`rgb(${n.color} / ${on ? 0.22 : 0.1})`}
              stroke={`rgb(${n.color})`}
              strokeWidth={on ? 3 : 1.5}
              style={on ? { filter: `drop-shadow(0 0 12px rgb(${n.color} / .7))` } : undefined}
            />
            <text
              x="58"
              y="27"
              textAnchor="middle"
              fontSize="14"
              fontWeight="800"
              fill={`rgb(${n.color})`}
              fontFamily="var(--font-sans, Manrope Variable, sans-serif)"
            >
              {n.id}
            </text>
            <text
              x="58"
              y="45"
              textAnchor="middle"
              fontSize="10.5"
              fill="rgb(var(--c-muted))"
              fontFamily="var(--font-sans, Manrope Variable, sans-serif)"
            >
              {n.sub}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
