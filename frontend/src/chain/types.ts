export const STATES = ['NEW', 'ACTIVE', 'WARNED', 'BROKEN', 'MATURED', 'CANCELLED'] as const;
export type CovenantState = (typeof STATES)[number];
export const KINDS = ['CLEAN', 'DRIFT', 'BREACH', 'DARK'] as const;
export type ReadingKind = (typeof KINDS)[number];

export interface Tenet {
  text: string;
  anchor: string;
}

export interface Reading {
  at: number;
  by: string;
  kind: ReadingKind;
  hard: boolean;
  detail: string;
  note: string;
  digest: string;
}

export interface Covenant {
  id: number;
  publisher: string;
  beneficiary: string;
  title: string;
  url: string;
  bound: boolean;
  status: number;
  state: CovenantState;
  created: number;
  term: number;
  activeSince: number;
  endsAt: number;
  cureSecs: number;
  minGap: number;
  maxAge: number;
  bond: bigint;
  topped: bigint;
  slashed: bigint;
  bounty: bigint;
  warnings: number;
  cures: number;
  warnedAt: number;
  cureBy: number;
  finder: string;
  dark: number;
  readings: number;
  clean: number;
  drift: number;
  breach: number;
  unreadable: number;
  changes: number;
  lastAt: number;
  nextReadingAt: number;
  closedAt: number;
  endedNote: string;
  tenets: Tenet[];
  last: Reading | null;
}

export interface Stats {
  covenants: number;
  readings: number;
  warned: number;
  cured: number;
  broken: number;
  matured: number;
  cancelled: number;
  deposited: bigint;
  paid: bigint;
  owed: bigint;
  locked: bigint;
}

export interface Solvency {
  deposited: bigint;
  paid: bigint;
  owed: bigint;
  locked: bigint;
  liveBonds: bigint;
  balanced: boolean;
}

export interface PublisherRecord {
  kept: number;
  broken: number;
  live: number;
}

/** Everything the app reads from the contract. A live and a demo implementation exist. */
export interface DataSource {
  kind: 'live' | 'demo';
  stats(): Promise<Stats>;
  solvency(): Promise<Solvency>;
  list(offset: number, limit: number): Promise<Covenant[]>;
  covenant(id: number): Promise<Covenant>;
  readings(id: number): Promise<Reading[]>;
  covenantsOf(who: string, offset: number, limit: number): Promise<Covenant[]>;
  credit(who: string): Promise<bigint>;
  record(who: string): Promise<PublisherRecord>;
}
