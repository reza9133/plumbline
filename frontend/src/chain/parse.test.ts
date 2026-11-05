import {
  parseAmount,
  parseCovenantText,
  parseReadings,
  parseRecord,
  parseSolvency,
  parseStats,
} from './parse';

const reading = {
  at: 1000,
  by: '0x' + '1'.repeat(40),
  kind: 'CLEAN',
  hard: false,
  detail: '',
  note: 'ok',
  digest: 'a'.repeat(64),
};
const row = {
  id: 3,
  publisher: '0x' + '1'.repeat(40),
  beneficiary: '0x' + '2'.repeat(40),
  title: 'T',
  url: 'https://example.org/p',
  bound: true,
  status: 1,
  state: 'ACTIVE',
  created: 1,
  term: 100,
  active_since: 2,
  ends_at: 102,
  cure_secs: 60,
  min_gap: 60,
  max_age: 0,
  bond: '20000000000000000',
  topped: '0',
  slashed: '0',
  bounty: '0',
  warnings: 0,
  cures: 0,
  warned_at: 0,
  cure_by: 0,
  finder: '0x' + '0'.repeat(40),
  dark: 0,
  readings: 1,
  clean: 1,
  drift: 0,
  breach: 0,
  unreadable: 0,
  changes: 0,
  last_at: 1000,
  next_reading_at: 1060,
  closed_at: 0,
  ended_note: '',
  tenets: [{ text: 'We never sell data.', anchor: 'never sell' }],
  last: reading,
};

describe('parseCovenantText', () => {
  it('reads a covenant exactly as the contract writes it', () => {
    const c = parseCovenantText(JSON.stringify(row));
    expect(c.id).toBe(3);
    expect(c.bond).toBe(20000000000000000n);
    expect(c.state).toBe('ACTIVE');
    expect(c.tenets[0]?.anchor).toBe('never sell');
    expect(c.last?.kind).toBe('CLEAN');
    expect(c.nextReadingAt).toBe(1060);
  });
  it('accepts a covenant with no reading yet', () => {
    expect(parseCovenantText(JSON.stringify({ ...row, last: null, readings: 0 })).last).toBeNull();
  });
  it('keeps very large amounts exact', () => {
    expect(parseCovenantText(JSON.stringify({ ...row, bond: '1000000000000000000000000000' })).bond).toBe(
      10n ** 27n,
    );
  });
  it('refuses anything that is not the expected shape', () => {
    expect(() => parseCovenantText('not json')).toThrow(/JSON/);
    expect(() => parseCovenantText(JSON.stringify({ ...row, state: 'WEIRD' }))).toThrow(/state/);
    expect(() => parseCovenantText(JSON.stringify({ ...row, bond: '-1' }))).toThrow(/amount/);
    expect(() => parseCovenantText(JSON.stringify({ ...row, tenets: 'x' }))).toThrow(/tenets/);
    expect(() => parseCovenantText(JSON.stringify({ ...row, bound: 'yes' }))).toThrow(/true\/false/);
    expect(() => parseCovenantText(42)).toThrow();
  });
});

describe('other views', () => {
  it('readings', () => {
    expect(parseReadings(JSON.stringify([reading]))).toHaveLength(1);
    expect(() => parseReadings(JSON.stringify([{ ...reading, kind: 'NOPE' }]))).toThrow(/kind/);
  });
  it('stats and solvency', () => {
    const s = parseStats(
      JSON.stringify({
        covenants: 2,
        readings: 5,
        warned: 1,
        cured: 0,
        broken: 0,
        matured: 1,
        cancelled: 0,
        deposited: '10',
        paid: '3',
        owed: '2',
        locked: '5',
      }),
    );
    expect(s.locked).toBe(5n);
    const v = parseSolvency(
      JSON.stringify({ deposited: '10', paid: '3', owed: '2', locked: '5', live_bonds: '5', balanced: true }),
    );
    expect(v.balanced).toBe(true);
  });
  it('record and amount', () => {
    expect(parseRecord('{"kept":1,"broken":2,"live":3}')).toEqual({ kept: 1, broken: 2, live: 3 });
    expect(parseAmount('123')).toBe(123n);
    expect(parseAmount(5n)).toBe(5n);
    expect(() => parseAmount('1.5')).toThrow();
  });
});
