import { actionsFor, inspectorStake } from './actions';
import type { Covenant } from '../chain/types';
import { tenetTones } from './tones';

const PUB = '0x' + '1'.repeat(40);
const BEN = '0x' + '2'.repeat(40);
const base: Covenant = {
  id: 1,
  publisher: PUB,
  beneficiary: BEN,
  title: 't',
  url: 'https://example.org/p',
  bound: false,
  status: 1,
  state: 'ACTIVE',
  created: 0,
  term: 1000,
  activeSince: 100,
  endsAt: 1100,
  cureSecs: 60,
  minGap: 60,
  maxAge: 0,
  bond: 1n,
  topped: 0n,
  slashed: 0n,
  bounty: 0n,
  warnings: 0,
  cures: 0,
  warnedAt: 0,
  cureBy: 0,
  finder: '0x' + '0'.repeat(40),
  dark: 0,
  readings: 1,
  clean: 1,
  drift: 0,
  breach: 0,
  unreadable: 0,
  changes: 0,
  lastAt: 200,
  nextReadingAt: 260,
  closedAt: 0,
  endedNote: '',
  tenets: [{ text: 'a promise here', anchor: '' }],
  last: null,
};

describe('actionsFor', () => {
  it('lets anyone inspect an active covenant once the gap has passed', () => {
    expect(actionsFor(base, null, 300).inspect.enabled).toBe(true);
    const wait = actionsFor(base, null, 250).inspect;
    expect(wait.enabled).toBe(false);
    expect(wait.availableAt).toBe(260);
  });
  it('stops inspections after the term and allows maturing', () => {
    const a = actionsFor(base, null, 1200);
    expect(a.inspect.enabled).toBe(false);
    expect(a.mature.enabled).toBe(true);
    expect(actionsFor(base, null, 500).mature.enabled).toBe(false);
  });
  it('keeps publisher-only actions away from others', () => {
    const draft: Covenant = { ...base, state: 'NEW', status: 0, readings: 0, nextReadingAt: 0 };
    expect(actionsFor(draft, BEN, 300).activate.enabled).toBe(false);
    expect(actionsFor(draft, PUB, 300).activate.enabled).toBe(true);
    expect(actionsFor(draft, PUB.toUpperCase().replace('0X', '0x'), 300).isPublisher).toBe(true);
    expect(actionsFor({ ...draft, tenets: [] }, PUB, 300).activate.reason).toMatch(/tenet/);
  });
  it('requires the long grace before maturing a warned covenant', () => {
    const w: Covenant = { ...base, state: 'WARNED', status: 2, cureBy: 1300 };
    expect(actionsFor(w, null, 1400).mature.enabled).toBe(false);
    expect(actionsFor(w, null, 1300 + 14 * 86400).mature.enabled).toBe(true);
  });
  it('shows nothing for finished covenants', () => {
    const done: Covenant = { ...base, state: 'MATURED', status: 4 };
    const a = actionsFor(done, PUB, 5000);
    expect([a.inspect, a.mature, a.topUp, a.cancel].some((x) => x.visible)).toBe(false);
  });
});

describe('inspectorStake', () => {
  it('pays 5% for finding and 10% for confirming', () => {
    expect(inspectorStake(base, 300).bps).toBe(500n);
    expect(inspectorStake({ ...base, state: 'WARNED', cureBy: 400 }, 500)).toMatchObject({
      kind: 'closer',
      bps: 1000n,
    });
    expect(inspectorStake({ ...base, state: 'WARNED', cureBy: 400 }, 300).kind).toBe('none');
  });
});

describe('tenetTones', () => {
  const rd = (detail: string, kind: 'CLEAN' | 'DRIFT' | 'BREACH' | 'DARK') => ({
    at: 1,
    by: PUB,
    kind,
    hard: kind === 'BREACH',
    detail,
    note: '',
    digest: '',
  });
  const two = [
    { text: 'first promise here', anchor: '' },
    { text: 'second promise here', anchor: '' },
  ];
  it('marks leaning slabs from the latest reading', () => {
    const { tones } = tenetTones({ ...base, tenets: two, last: rd('anchor:2,weakened:1', 'BREACH') });
    expect(tones[0]).toMatchObject({ tone: 'weak' });
    expect(tones[1]).toMatchObject({ tone: 'bad' });
  });
  it('is idle before any reading and flags page-level evidence', () => {
    expect(tenetTones({ ...base, tenets: two, last: null }).tones.every((t) => t.tone === 'idle')).toBe(true);
    expect(tenetTones({ ...base, tenets: two, last: rd('unbound', 'BREACH') }).wallHard).toBe(true);
  });
  it('drops a broken covenant', () => {
    expect(
      tenetTones({ ...base, state: 'BROKEN', tenets: two, last: rd('', 'CLEAN') }).tones.every(
        (t) => t.tone === 'bad',
      ),
    ).toBe(true);
  });
});
