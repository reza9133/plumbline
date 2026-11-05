import type { ReactNode } from 'react';
import { AlertTriangle, Info, Lightbulb } from 'lucide-react';
import { CopyButton } from '../../components/ui';

export function Callout({
  kind = 'info',
  title,
  children,
}: {
  kind?: 'info' | 'warn' | 'tip';
  title?: string;
  children: ReactNode;
}) {
  const tone = {
    info: 'border-cyan/40 bg-cyan/5 text-cyan',
    warn: 'border-warn/50 bg-warn/10 text-warn',
    tip: 'border-brass/50 bg-brass/10 text-brass',
  }[kind];
  const Icon = { info: Info, warn: AlertTriangle, tip: Lightbulb }[kind];
  return (
    <aside className={`my-6 flex gap-3 rounded-2xl border p-4 ${tone}`}>
      <Icon className="mt-0.5 h-5 w-5 shrink-0" />
      <div className="text-sm leading-6 text-ink/90">
        {title && <p className="mb-1 font-bold">{title}</p>}
        <div className="[&>p]:my-1">{children}</div>
      </div>
    </aside>
  );
}

export function Table({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <div className="my-6 overflow-x-auto rounded-2xl border border-line/70">
      <table className="w-full min-w-[480px] border-collapse text-left text-sm">
        <thead className="bg-surface2/60">
          <tr>
            {head.map((h) => (
              <th key={h} className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-muted">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-line/50 align-top">
              {r.map((c, j) => (
                <td key={j} className={`px-4 py-2.5 ${j === 0 ? 'font-semibold' : ''}`}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Code({ children, lang = '' }: { children: string; lang?: string }) {
  return (
    <div className="group relative my-5 overflow-hidden rounded-2xl border border-line/70 bg-[rgb(var(--c-surface2)/0.7)]">
      {lang && (
        <span className="absolute left-4 top-2 font-mono text-[10px] font-bold uppercase tracking-widest text-muted">
          {lang}
        </span>
      )}
      <span className="absolute right-2 top-1.5">
        <CopyButton text={children} label="Copy code" />
      </span>
      <pre className={`overflow-x-auto px-4 pb-4 text-[13px] leading-6 ${lang ? 'pt-8' : 'pt-4'}`}>
        <code>{children}</code>
      </pre>
    </div>
  );
}

export function Method({
  name,
  sig,
  who,
  children,
  returns,
  payable,
}: {
  name: string;
  sig: string;
  who: string;
  children: ReactNode;
  returns?: string;
  payable?: boolean;
}) {
  return (
    <div className="my-5 rounded-2xl border border-line/70 bg-surface/60 p-5" id={name}>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <h3 className="!my-0 font-mono text-lg font-bold">{name}</h3>
        <span className="chip border-line text-muted">{who}</span>
        {payable && <span className="chip border-brass/50 bg-brass/10 text-brass">payable</span>}
      </div>
      <p className="mb-3 overflow-x-auto font-mono text-[13px] text-cyan">{sig}</p>
      <div className="text-sm leading-6 [&>p]:my-2">{children}</div>
      {returns && (
        <p className="mt-2 text-sm">
          <b>Returns:</b> {returns}
        </p>
      )}
    </div>
  );
}

export const Kbd = ({ children }: { children: ReactNode }) => (
  <kbd className="rounded-md border border-line bg-surface2 px-1.5 py-0.5 text-xs">{children}</kbd>
);
