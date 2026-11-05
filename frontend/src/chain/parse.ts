import {
  KINDS,
  STATES,
  type Covenant,
  type PublisherRecord,
  type Reading,
  type Solvency,
  type Stats,
} from './types';

export class ParseError extends Error {
  constructor(what: string) {
    super(`Unexpected answer from the contract: ${what}`);
    this.name = 'ParseError';
  }
}

type Obj = Record<string, unknown>;

const obj = (v: unknown, what: string): Obj => {
  if (typeof v !== 'object' || v === null || Array.isArray(v))
    throw new ParseError(`${what} is not an object`);
  return v as Obj;
};
const str = (o: Obj, k: string): string => {
  const v = o[k];
  if (typeof v !== 'string') throw new ParseError(`"${k}" is not text`);
  return v;
};
const int = (o: Obj, k: string): number => {
  const v = o[k];
  if (typeof v !== 'number' || !Number.isFinite(v)) throw new ParseError(`"${k}" is not a number`);
  return v;
};
const big = (o: Obj, k: string): bigint => {
  const v = o[k];
  if (typeof v === 'string' && /^\d+$/.test(v)) return BigInt(v);
  if (typeof v === 'number' && Number.isInteger(v) && v >= 0) return BigInt(v);
  throw new ParseError(`"${k}" is not an amount`);
};
const bool = (o: Obj, k: string): boolean => {
  const v = o[k];
  if (typeof v !== 'boolean') throw new ParseError(`"${k}" is not true/false`);
  return v;
};

export function parseJson(text: unknown): unknown {
  if (typeof text !== 'string') throw new ParseError('the view did not return text');
  try {
    return JSON.parse(text);
  } catch {
    throw new ParseError('the view did not return JSON');
  }
}

export function parseReading(v: unknown): Reading {
  const o = obj(v, 'reading');
  const kind = str(o, 'kind');
  if (!(KINDS as readonly string[]).includes(kind)) throw new ParseError(`unknown reading kind "${kind}"`);
  return {
    at: int(o, 'at'),
    by: str(o, 'by'),
    kind: kind as Reading['kind'],
    hard: bool(o, 'hard'),
    detail: str(o, 'detail'),
    note: str(o, 'note'),
    digest: str(o, 'digest'),
  };
}

export function parseReadings(text: unknown): Reading[] {
  const v = parseJson(text);
  if (!Array.isArray(v)) throw new ParseError('readings is not a list');
  return v.map(parseReading);
}

export function parseCovenant(v: unknown): Covenant {
  const o = obj(v, 'covenant');
  const state = str(o, 'state');
  if (!(STATES as readonly string[]).includes(state)) throw new ParseError(`unknown state "${state}"`);
  const tenets = o.tenets;
  if (!Array.isArray(tenets)) throw new ParseError('"tenets" is not a list');
  const last = o.last;
  return {
    id: int(o, 'id'),
    publisher: str(o, 'publisher'),
    beneficiary: str(o, 'beneficiary'),
    title: str(o, 'title'),
    url: str(o, 'url'),
    bound: bool(o, 'bound'),
    status: int(o, 'status'),
    state: state as Covenant['state'],
    created: int(o, 'created'),
    term: int(o, 'term'),
    activeSince: int(o, 'active_since'),
    endsAt: int(o, 'ends_at'),
    cureSecs: int(o, 'cure_secs'),
    minGap: int(o, 'min_gap'),
    maxAge: int(o, 'max_age'),
    bond: big(o, 'bond'),
    topped: big(o, 'topped'),
    slashed: big(o, 'slashed'),
    bounty: big(o, 'bounty'),
    warnings: int(o, 'warnings'),
    cures: int(o, 'cures'),
    warnedAt: int(o, 'warned_at'),
    cureBy: int(o, 'cure_by'),
    finder: str(o, 'finder'),
    dark: int(o, 'dark'),
    readings: int(o, 'readings'),
    clean: int(o, 'clean'),
    drift: int(o, 'drift'),
    breach: int(o, 'breach'),
    unreadable: int(o, 'unreadable'),
    changes: int(o, 'changes'),
    lastAt: int(o, 'last_at'),
    nextReadingAt: int(o, 'next_reading_at'),
    closedAt: int(o, 'closed_at'),
    endedNote: str(o, 'ended_note'),
    tenets: tenets.map((t) => {
      const to = obj(t, 'tenet');
      return { text: str(to, 'text'), anchor: str(to, 'anchor') };
    }),
    last: last === null || last === undefined ? null : parseReading(last),
  };
}

export const parseCovenantText = (text: unknown): Covenant => parseCovenant(parseJson(text));

export function parseCovenantList(text: unknown): Covenant[] {
  const v = parseJson(text);
  if (!Array.isArray(v)) throw new ParseError('the list is not a list');
  return v.map(parseCovenant);
}

export function parseStats(text: unknown): Stats {
  const o = obj(parseJson(text), 'stats');
  return {
    covenants: int(o, 'covenants'),
    readings: int(o, 'readings'),
    warned: int(o, 'warned'),
    cured: int(o, 'cured'),
    broken: int(o, 'broken'),
    matured: int(o, 'matured'),
    cancelled: int(o, 'cancelled'),
    deposited: big(o, 'deposited'),
    paid: big(o, 'paid'),
    owed: big(o, 'owed'),
    locked: big(o, 'locked'),
  };
}

export function parseSolvency(text: unknown): Solvency {
  const o = obj(parseJson(text), 'solvency');
  return {
    deposited: big(o, 'deposited'),
    paid: big(o, 'paid'),
    owed: big(o, 'owed'),
    locked: big(o, 'locked'),
    liveBonds: big(o, 'live_bonds'),
    balanced: bool(o, 'balanced'),
  };
}

export function parseRecord(text: unknown): PublisherRecord {
  const o = obj(parseJson(text), 'record');
  return { kept: int(o, 'kept'), broken: int(o, 'broken'), live: int(o, 'live') };
}

export function parseAmount(text: unknown): bigint {
  const s = typeof text === 'bigint' ? text.toString() : String(text ?? '').trim();
  if (!/^\d+$/.test(s)) throw new ParseError('the amount is not a number');
  return BigInt(s);
}
