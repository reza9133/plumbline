import { useState } from 'react';

const UNITS = [
  { key: 'minutes', label: 'minutes', secs: 60 },
  { key: 'hours', label: 'hours', secs: 3600 },
  { key: 'days', label: 'days', secs: 86400 },
] as const;
type UnitKey = (typeof UNITS)[number]['key'];

function initial(seconds: number): { n: string; unit: UnitKey } {
  if (seconds > 0 && seconds % 86400 === 0) return { n: String(seconds / 86400), unit: 'days' };
  if (seconds > 0 && seconds % 3600 === 0) return { n: String(seconds / 3600), unit: 'hours' };
  return { n: String(Math.round(seconds / 60)), unit: 'minutes' };
}

/** A number plus a unit, reported in seconds. */
export function DurationInput({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (seconds: number) => void;
  label: string;
}) {
  const [state, setState] = useState(() => initial(value));
  const push = (n: string, unit: UnitKey) => {
    setState({ n, unit });
    const secs = (UNITS.find((u) => u.key === unit)?.secs ?? 60) * Number(n);
    onChange(Number.isFinite(secs) && n.trim() !== '' ? Math.round(secs) : NaN);
  };
  return (
    <div className="flex gap-2">
      <input
        className="input"
        inputMode="decimal"
        value={state.n}
        onChange={(e) => push(e.target.value, state.unit)}
        aria-label={`${label} amount`}
      />
      <select
        className="input w-auto"
        value={state.unit}
        onChange={(e) => push(state.n, e.target.value as UnitKey)}
        aria-label={`${label} unit`}
      >
        {UNITS.map((u) => (
          <option key={u.key} value={u.key}>
            {u.label}
          </option>
        ))}
      </select>
    </div>
  );
}
