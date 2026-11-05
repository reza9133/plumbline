import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';

const FULL = '/mochi/mochi-full.webp';
const FULL_SM = '/mochi/mochi-full-sm.webp';
const HEAD = '/mochi/mochi-head.webp';
const HEAD_SM = '/mochi/mochi-head-sm.webp';

/** Mochi, the project mascot (full body). */
export function MochiFull({
  className = '',
  float = true,
  alt = 'Mochi, the Plumbline mascot',
}: {
  className?: string;
  float?: boolean;
  alt?: string;
}) {
  return (
    <img
      src={FULL}
      srcSet={`${FULL_SM} 336w, ${FULL} 671w`}
      sizes="(max-width: 640px) 60vw, 340px"
      alt={alt}
      width={671}
      height={1400}
      decoding="async"
      className={`select-none drop-shadow-[0_24px_30px_rgb(var(--c-shadow)/0.35)] ${float ? 'animate-float' : ''} ${className}`}
      draggable={false}
    />
  );
}

export function MochiHead({
  size = 64,
  className = '',
  alt = 'Mochi',
}: {
  size?: number;
  className?: string;
  alt?: string;
}) {
  return (
    <img
      src={size > 140 ? HEAD : HEAD_SM}
      alt={alt}
      width={size}
      height={size}
      decoding="async"
      className={`select-none object-contain ${className}`}
      draggable={false}
    />
  );
}

/** A speech-bubble tip from Mochi, used in docs and empty states. */
export function MochiSays({ children, title = 'Mochi says' }: { children: ReactNode; title?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.aside
      initial={reduce ? false : { opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="my-6 flex items-start gap-4 rounded-2xl border border-cyan/30 bg-cyan/5 p-4"
    >
      <MochiHead size={64} className="h-16 w-16 shrink-0 drop-shadow" />
      <div className="text-sm leading-6">
        <p className="mb-0.5 font-mono text-[11px] font-bold uppercase tracking-widest text-cyan">{title}</p>
        <div className="text-ink/90 [&>p]:my-0">{children}</div>
      </div>
    </motion.aside>
  );
}
