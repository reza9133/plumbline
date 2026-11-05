import { formatDuration, formatGen, parseGen, relativeTime, sameAddress, shortAddr } from './format';

describe('parseGen', () => {
  it('parses plain decimals into wei', () => {
    expect(parseGen('1')).toBe(10n ** 18n);
    expect(parseGen('0.01')).toBe(10n ** 16n);
    expect(parseGen(' 2.5 ')).toBe(25n * 10n ** 17n);
    expect(parseGen('0.000000000000000001')).toBe(1n);
  });
  it('rejects everything else', () => {
    for (const bad of ['', '-1', '1e3', '1,5', '0x10', '1.0000000000000000001', 'abc', '.5', '1.'])
      expect(parseGen(bad)).toBeNull();
  });
});

describe('formatGen', () => {
  it('trims zeros and groups thousands', () => {
    expect(formatGen(10n ** 18n)).toBe('1');
    expect(formatGen(1_234_500n * 10n ** 15n)).toBe('1,234.5');
    expect(formatGen(0n)).toBe('0');
  });
  it('never shows a non-zero amount as zero', () => {
    expect(formatGen(1n)).not.toBe('0');
    expect(formatGen(10n ** 12n)).toBe('0.000001');
  });
  it('round-trips with parseGen', () => {
    for (const [s, shown] of [
      ['0.05', '0.05'],
      ['12.345678', '12.345678'],
      ['1000000', '1,000,000'],
    ] as const)
      expect(formatGen(parseGen(s) as bigint, 6)).toBe(shown);
  });
});

describe('time helpers', () => {
  it('formatDuration', () => {
    expect(formatDuration(0)).toBe('0s');
    expect(formatDuration(59)).toBe('59s');
    expect(formatDuration(125)).toBe('2m 05s');
    expect(formatDuration(3 * 3600 + 120)).toBe('3h 2m');
    expect(formatDuration(2 * 86400 + 5 * 3600)).toBe('2d 5h');
    expect(formatDuration(86400)).toBe('1d');
  });
  it('relativeTime', () => {
    expect(relativeTime(1000, 1090)).toBe('1m 30s ago');
    expect(relativeTime(2000, 1000)).toBe('in 16m 40s');
    expect(relativeTime(0, 1000)).toBe('—');
  });
  it('addresses', () => {
    expect(shortAddr('0x1234567890abcdef1234567890abcdef12345678')).toBe('0x1234…5678');
    expect(sameAddress('0xABC', '0xabc')).toBe(true);
    expect(sameAddress(null, '0xabc')).toBe(false);
  });
});
