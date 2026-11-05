import type { Covenant } from '../chain/types';

export type Tone = 'idle' | 'held' | 'weak' | 'missing' | 'bad';
export interface TenetTone {
  n: number;
  tone: Tone;
  /** degrees the slab leans in the 3D wall */
  tilt: number;
}

/** What the latest reading says about each tenet, for the plumb wall. */
export function tenetTones(c: Pick<Covenant, 'tenets' | 'last' | 'state'>): {
  tones: TenetTone[];
  wallHard: boolean;
} {
  const out: TenetTone[] = c.tenets.map((_, i) => ({ n: i + 1, tone: 'idle' as Tone, tilt: 0 }));
  let wallHard = false;
  if (c.state === 'CANCELLED') return { tones: out, wallHard };
  const last = c.last;
  if (last && last.kind !== 'DARK') {
    for (const o of out) o.tone = 'held';
    for (const token of last.detail
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)) {
      const [name = '', rest] = token.split(':');
      const idx = rest ? Number(rest) - 1 : -1;
      const row = out[idx];
      if (row) {
        if (name === 'anchor' || name === 'contradiction') Object.assign(row, { tone: 'bad', tilt: 15 });
        else if ((name === 'missing' || name === 'unsure') && row.tone !== 'bad')
          Object.assign(row, { tone: 'missing', tilt: 9 });
        else if (name === 'weakened' && row.tone === 'held') Object.assign(row, { tone: 'weak', tilt: 6 });
      } else if (['unbound', 'stale', 'steering', 'dark'].includes(name)) {
        wallHard = true;
      }
    }
  } else if (last?.kind === 'DARK') {
    for (const o of out) Object.assign(o, { tone: 'missing', tilt: 4 });
  }
  if (c.state === 'BROKEN') for (const o of out) Object.assign(o, { tone: 'bad', tilt: o.tilt || 24 });
  return { tones: out, wallHard };
}
