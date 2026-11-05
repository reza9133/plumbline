import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Info, XCircle } from 'lucide-react';

type Kind = 'ok' | 'bad' | 'info';
interface ToastItem {
  id: number;
  kind: Kind;
  text: string;
}
interface ToastApi {
  push(t: { kind: Kind; text: string }): void;
}
const ToastContext = createContext<ToastApi>({ push: () => undefined });

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const push = useCallback((t: { kind: Kind; text: string }) => {
    const id = Date.now() + Math.random();
    setItems((s) => [...s.slice(-3), { id, ...t }]);
    setTimeout(() => setItems((s) => s.filter((x) => x.id !== id)), 5200);
  }, []);
  const api = useMemo(() => ({ push }), [push]);
  const Icon = { ok: CheckCircle2, bad: XCircle, info: Info };
  const tone = { ok: 'text-ok', bad: 'text-bad', info: 'text-cyan' };
  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="pointer-events-none fixed bottom-4 right-4 z-[90] flex w-[min(92vw,380px)] flex-col gap-2"
        aria-live="polite"
      >
        <AnimatePresence>
          {items.map((t) => {
            const I = Icon[t.kind];
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 16, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: 40 }}
                className="card pointer-events-auto flex items-start gap-3 px-4 py-3 text-sm"
                role="status"
              >
                <I className={`mt-0.5 h-5 w-5 shrink-0 ${tone[t.kind]}`} />
                <span>{t.text}</span>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
