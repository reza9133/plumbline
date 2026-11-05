/**
 * Sample data for previewing the interface without a network. It is only used while the "Demo data" switch is on
 * (the app shows a banner then), it is generated relative to the current time, and it is read-only.
 */
import type { Covenant, CovenantState, DataSource, PublisherRecord, Reading, Solvency, Stats } from './types';
import { STATES } from './types';

const GEN = 10n ** 18n;
const gen = (n: number) => BigInt(Math.round(n * 1e6)) * 10n ** 12n;
const now = () => Math.floor(Date.now() / 1000);
const ZERO = '0x0000000000000000000000000000000000000000';

const A = {
  ada: '0x1111aAaA1111bBbB1111cCcC1111dDdD1111eEeE',
  ben: '0x2222aAaA2222bBbB2222cCcC2222dDdD2222eEeE',
  cleo: '0x3333aAaA3333bBbB3333cCcC3333dDdD3333eEeE',
  dax: '0x4444aAaA4444bBbB4444cCcC4444dDdD4444eEeE',
  fund: '0x9999aAaA9999bBbB9999cCcC9999dDdD9999eEeE',
};

function reading(ago: number, kind: Reading['kind'], by: string, detail = '', note = ''): Reading {
  return {
    at: now() - ago,
    by,
    kind,
    hard: kind === 'BREACH',
    detail,
    note,
    digest: Array.from({ length: 64 }, (_, i) => ((i * 7 + ago) % 16).toString(16)).join(''),
  };
}

interface Seed {
  id: number;
  state: CovenantState;
  publisher: string;
  title: string;
  url: string;
  bond: number;
  bound?: boolean;
  tenets: { text: string; anchor: string }[];
  log: Reading[];
  patch?: Partial<Covenant>;
}

function build(seed: Seed): { covenant: Covenant; log: Reading[] } {
  const t = now();
  const log = seed.log;
  const last = log[log.length - 1] ?? null;
  const covenant: Covenant = {
    id: seed.id,
    publisher: seed.publisher,
    beneficiary: A.fund,
    title: seed.title,
    url: seed.url,
    bound: seed.bound ?? false,
    status: STATES.indexOf(seed.state),
    state: seed.state,
    created: t - 9 * 86400,
    term: 14 * 86400,
    activeSince: seed.state === 'NEW' || seed.state === 'CANCELLED' ? 0 : t - 6 * 86400,
    endsAt: seed.state === 'NEW' || seed.state === 'CANCELLED' ? 0 : t + 8 * 86400,
    cureSecs: 6 * 3600,
    minGap: 3600,
    maxAge: 0,
    bond:
      seed.state === 'BROKEN' || seed.state === 'MATURED' || seed.state === 'CANCELLED' ? 0n : gen(seed.bond),
    topped: 0n,
    slashed: 0n,
    bounty: 0n,
    warnings: 0,
    cures: 0,
    warnedAt: 0,
    cureBy: 0,
    finder: ZERO,
    dark: 0,
    readings: log.length,
    clean: log.filter((r) => r.kind === 'CLEAN').length,
    drift: log.filter((r) => r.kind === 'DRIFT').length,
    breach: log.filter((r) => r.kind === 'BREACH').length,
    unreadable: log.filter((r) => r.kind === 'DARK').length,
    changes: 0,
    lastAt: last?.at ?? 0,
    nextReadingAt: last ? last.at + 3600 : 0,
    closedAt: 0,
    endedNote: '',
    tenets: seed.tenets,
    last,
    ...seed.patch,
  };
  return { covenant, log };
}

function seeds(): Seed[] {
  const t = now();
  return [
    {
      id: 0,
      state: 'NEW',
      publisher: A.ada,
      title: 'API stability pledge',
      url: 'https://example-co.dev/stability',
      bond: 0.05,
      tenets: [{ text: 'The v1 API will not be removed before 2028.', anchor: 'not be removed before 2028' }],
      log: [],
      patch: { term: 30 * 86400 },
    },
    {
      id: 1,
      state: 'ACTIVE',
      publisher: A.ben,
      title: 'We never sell personal data',
      url: 'https://privacy.lumenworks.io/promise',
      bond: 0.5,
      bound: true,
      tenets: [
        {
          text: 'The company never sells personal data to third parties.',
          anchor: 'never sell personal data',
        },
        { text: 'Data requests are answered within 30 days.', anchor: '' },
      ],
      log: [
        reading(5 * 86400, 'CLEAN', A.ben, '', 'Both tenets are stated plainly.'),
        reading(3 * 86400, 'CLEAN', A.cleo, '', 'Nothing has changed.'),
        reading(
          2 * 3600,
          'DRIFT',
          A.dax,
          'weakened:2',
          'The response time now says "usually within 30 days".',
        ),
      ],
    },
    {
      id: 2,
      state: 'WARNED',
      publisher: A.cleo,
      title: 'Security contact stays public',
      url: 'https://harbor.systems/.well-known/security',
      bond: 0.2,
      bound: true,
      tenets: [
        { text: 'A security contact address is published on this page.', anchor: 'security@harbor.systems' },
      ],
      log: [
        reading(5 * 86400, 'CLEAN', A.cleo, '', 'Contact present.'),
        reading(1800, 'BREACH', A.dax, 'anchor:1', 'The contact address is gone.'),
      ],
      patch: { warnings: 1, warnedAt: t - 1800, cureBy: t - 1800 + 6 * 3600, finder: A.dax },
    },
    {
      id: 3,
      state: 'WARNED',
      publisher: A.dax,
      title: 'Warrant canary',
      url: 'https://sunfield.org/canary',
      bond: 1.2,
      bound: true,
      tenets: [{ text: 'We have received no secret orders this quarter.', anchor: 'no secret orders' }],
      log: [
        reading(2 * 86400, 'CLEAN', A.dax, '', 'Canary present.'),
        reading(
          8 * 3600,
          'BREACH',
          A.ben,
          'anchor:1,stale',
          'The canary text was removed and the date is old.',
        ),
      ],
      patch: { warnings: 1, warnedAt: t - 8 * 3600, cureBy: t - 2 * 3600, finder: A.ben, maxAge: 7 * 86400 },
    },
    {
      id: 4,
      state: 'BROKEN',
      publisher: A.ada,
      title: 'Price lock until 2027',
      url: 'https://tallymarket.io/pricing',
      bond: 0.4,
      tenets: [{ text: 'The monthly price stays at 12 EUR until 2027.', anchor: '12 EUR' }],
      log: [
        reading(4 * 86400, 'CLEAN', A.ada),
        reading(2 * 86400, 'BREACH', A.cleo, 'anchor:1', 'Price is now 15 EUR.'),
        reading(3600, 'BREACH', A.dax, 'anchor:1,contradiction:1', 'Page states the price is 15 EUR.'),
      ],
      patch: {
        slashed: gen(0.4),
        bounty: gen(0.06),
        closedAt: t - 3600,
        endedNote: 'Broken: anchor:1,contradiction:1',
        warnings: 1,
        finder: A.cleo,
      },
    },
    {
      id: 5,
      state: 'MATURED',
      publisher: A.ben,
      title: 'Open-source license pledge',
      url: 'https://lumenworks.io/license',
      bond: 0.3,
      tenets: [{ text: 'The core library stays under the MIT license.', anchor: 'MIT license' }],
      log: [reading(12 * 86400, 'CLEAN', A.ben), reading(6 * 86400, 'CLEAN', A.dax)],
      patch: { closedAt: t - 86400, endedNote: 'The term ended without a confirmed breach.' },
    },
    {
      id: 6,
      state: 'CANCELLED',
      publisher: A.cleo,
      title: 'Draft that was withdrawn',
      url: 'https://harbor.systems/drafts/promise',
      bond: 0.05,
      tenets: [],
      log: [],
      patch: { closedAt: t - 5 * 86400, endedNote: 'Cancelled before activation.' },
    },
    {
      id: 7,
      state: 'ACTIVE',
      publisher: A.dax,
      title: 'Data retention: 90 days',
      url: 'https://sunfield.org/retention',
      bond: 0.15,
      bound: false,
      tenets: [{ text: 'Logs are deleted after 90 days.', anchor: '90 days' }],
      log: [reading(13 * 86400, 'CLEAN', A.dax), reading(4 * 86400, 'CLEAN', A.ben)],
      patch: { activeSince: t - 14 * 86400 - 3600, endsAt: t - 3600 },
    },
  ];
}

function world() {
  const items = seeds().map(build);
  return items;
}

function summarize(list: Covenant[]): Stats {
  const c = (s: CovenantState) => list.filter((x) => x.state === s).length;
  const locked = list
    .filter((x) => ['NEW', 'ACTIVE', 'WARNED'].includes(x.state))
    .reduce((a, x) => a + x.bond, 0n);
  const owed = gen(0.62);
  const paid = gen(0.9);
  return {
    covenants: list.length,
    readings: list.reduce((a, x) => a + x.readings, 0),
    warned: list.reduce((a, x) => a + x.warnings, 0),
    cured: 2,
    broken: c('BROKEN'),
    matured: c('MATURED'),
    cancelled: c('CANCELLED'),
    deposited: locked + owed + paid,
    paid,
    owed,
    locked,
  };
}

const delay = <T>(v: T): Promise<T> => new Promise((r) => setTimeout(() => r(v), 120));

export const demoSource: DataSource = {
  kind: 'demo',
  stats: () => delay(summarize(world().map((w) => w.covenant))),
  solvency: () => {
    const s = summarize(world().map((w) => w.covenant));
    const out: Solvency = {
      deposited: s.deposited,
      paid: s.paid,
      owed: s.owed,
      locked: s.locked,
      liveBonds: s.locked,
      balanced: true,
    };
    return delay(out);
  },
  list: (offset, limit) =>
    delay(
      world()
        .map((w) => w.covenant)
        .reverse()
        .slice(offset, offset + limit),
    ),
  covenant: async (id) => {
    const found = world().find((w) => w.covenant.id === id);
    if (!found) throw new Error('No such covenant.');
    return delay(found.covenant);
  },
  readings: async (id) => delay(world().find((w) => w.covenant.id === id)?.log ?? []),
  covenantsOf: (_who, offset, limit) =>
    delay(
      world()
        .map((w) => w.covenant)
        .slice(1, 4)
        .reverse()
        .slice(offset, offset + limit),
    ),
  credit: () => delay(GEN / 5n),
  record: (): Promise<PublisherRecord> => delay({ kept: 2, broken: 0, live: 2 }),
};
