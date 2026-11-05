const WEI = 10n ** 18n;

/** Parses a decimal GEN amount ("0.25") into wei. Returns null for anything that is not a plain, non-negative decimal. */
export function parseGen(input: string): bigint | null {
  const text = input.trim();
  if (!/^\d+(\.\d{1,18})?$/.test(text)) return null;
  const [whole = '0', frac = ''] = text.split('.');
  return BigInt(whole) * WEI + BigInt(frac.padEnd(18, '0') || '0');
}

/** Formats wei as a GEN amount with at most `maxDecimals` decimals, trailing zeros removed. */
export function formatGen(wei: bigint, maxDecimals = 4): string {
  const negative = wei < 0n;
  const abs = negative ? -wei : wei;
  const whole = abs / WEI;
  const frac = (abs % WEI).toString().padStart(18, '0');
  let shown = frac.slice(0, maxDecimals).replace(/0+$/, '');
  if (shown === '' && abs > 0n && whole === 0n) {
    // never show a non-zero amount as "0"
    shown = frac.slice(0, Math.max(maxDecimals, 6)).replace(/0+$/, '') || '0';
  }
  const grouped = whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${negative ? '-' : ''}${grouped}${shown ? '.' + shown : ''}`;
}

export const gen = (wei: bigint, maxDecimals = 4) => `${formatGen(wei, maxDecimals)} GEN`;

export const shortAddr = (a: string, head = 6, tail = 4) =>
  a.length > head + tail + 2 ? `${a.slice(0, head)}…${a.slice(-tail)}` : a;

export const shortHash = (h: string) => (h.length > 16 ? `${h.slice(0, 10)}…${h.slice(-6)}` : h);

export const isZeroAddress = (a: string) => /^0x0{40}$/i.test(a);
export const sameAddress = (a: string | null | undefined, b: string | null | undefined) =>
  !!a && !!b && a.toLowerCase() === b.toLowerCase();

/** "3d 4h", "12m 05s", "45s". */
export function formatDuration(totalSeconds: number): string {
  let s = Math.max(0, Math.floor(totalSeconds));
  if (s < 60) return `${s}s`;
  const d = Math.floor(s / 86400);
  s -= d * 86400;
  const h = Math.floor(s / 3600);
  s -= h * 3600;
  const m = Math.floor(s / 60);
  s -= m * 60;
  if (d > 0) return h > 0 ? `${d}d ${h}h` : `${d}d`;
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  return `${m}m ${String(s).padStart(2, '0')}s`;
}

export const formatDate = (unixSeconds: number): string =>
  unixSeconds > 0
    ? new Date(unixSeconds * 1000).toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

export function relativeTime(unixSeconds: number, nowSeconds = Math.floor(Date.now() / 1000)): string {
  if (unixSeconds <= 0) return '—';
  const diff = nowSeconds - unixSeconds;
  const text = formatDuration(Math.abs(diff));
  return diff >= 0 ? `${text} ago` : `in ${text}`;
}

export const SECONDS = { minute: 60, hour: 3600, day: 86400 } as const;
