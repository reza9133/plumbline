/**
 * Client-side copies of the contract's input rules (contracts/plumbline.py). They exist so that a form can explain
 * a problem before a transaction is signed. The contract stays the authority: a refused call changes nothing.
 */

export const LIMITS = {
  minBond: 10n ** 16n, // 0.01 GEN
  maxBond: 10n ** 27n,
  maxTenets: 6,
  minTenet: 12,
  maxTenet: 200,
  minAnchor: 3,
  maxAnchor: 80,
  minTitle: 3,
  maxTitle: 60,
  minTerm: 60,
  maxTerm: 366 * 86400,
  minCure: 60,
  maxCure: 30 * 86400,
  minGap: 60,
  maxGap: 7 * 86400,
  minAge: 3600,
  maxAge: 3650 * 86400,
  maxCures: 2,
  darkLimit: 3,
  resolveGrace: 14 * 86400,
  maxOpen: 6,
  logSize: 12,
  maxUrl: 300,
  finderBps: 500n,
  closerBps: 1000n,
  bps: 10_000n,
  maxPage: 50,
} as const;

const INVISIBLE = new RegExp(
  '[\\u00AD\\u061C\\u180E\\uFEFF\\u200B-\\u200F\\u202A-\\u202E\\u2060-\\u2064\\u2066-\\u2069]',
  'g',
);

/** Number of Unicode code points (what Python's len() counts). */
export const charLength = (s: string) => Array.from(s).length;

/** Printable text with single spaces and no angle brackets (the contract's `_clean`). */
export function cleanText(input: string): string {
  const text = String(input).replace(INVISIBLE, '');
  const printable = Array.from(text)
    .map((ch) => (/[\p{C}\p{Zl}\p{Zp}]/u.test(ch) ? ' ' : ch))
    .join('');
  return printable.replace(/</g, '(').replace(/>/g, ')').split(/\s+/).filter(Boolean).join(' ');
}

/** Lower-cased, invisible characters removed, spaces collapsed (the contract's `_norm`). */
export const normText = (input: string): string =>
  String(input).replace(INVISIBLE, '').toLowerCase().split(/\s+/).filter(Boolean).join(' ');

// ---- steering tripwire ------------------------------------------------------------------------------------------
const STEER = new RegExp(
  [
    'ignore (?:all |any |the |every |your )?(?:previous|prior|above|earlier|preceding|former) (?:instructions?|prompts?|messages?|rules|context|tenets?|guidelines)',
    'disregard (?:all |any |the |every |your )?(?:(?:previous|prior|above|earlier) )?(?:instructions?|prompts?|tenets?|rules|guidelines)',
    'forget (?:all |any |the |your )?(?:previous|prior|above|earlier) (?:instructions?|prompts?|tenets?|rules)',
    "(?:this is|here is|here's|below is|new) (?:the |a |your )?(?:new )?(?:system|developer) (?:prompt|message|instructions?)",
    '(?:system|developer) (?:prompt|message) (?:follows|override|update)',
    'you are (?:now )?(?:the |an? )?(?:plumbline |page )?(?:inspector|ai|llm|language model|assistant)\\b',
    '(?:reply|respond|answer|output|return|say|report) (?:with |only )?(?:only )?["\']?(?:held|all held|all tenets)',
    '"status"\\s*:\\s*"?(?:held|weakened|missing|contradicted)',
    '(?:mark|treat|consider|label|rate|report) (?:all |every |each )?(?:the )?(?:tenets?|promises?|commitments?) (?:\\w+ )?as (?:held|kept|honou?red|compliant|clean)',
    '(?:dear|hello|attention) (?:ai|llm|inspector|model|assistant)\\b',
    '(?:ai|llm|language model|assistant|inspector)[,:] (?:please|you must|you should|you will)',
    'do not (?:flag|report) (?:this|the|any) (?:page|breach|change|tenet)',
    'plumbline inspector',
  ].join('|'),
  'i',
);

/** Does the text talk to the inspector instead of to readers? (the contract's `_steers`). */
export const steers = (text: string): boolean => STEER.test(normText(text));

// ---- page links ------------------------------------------------------------------------------------------------
const URL_RE = /^https?:\/\/([^/?#\s]+)([/?#]\S*)?$/;
const LABEL_RE = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)$/;
const BAD_TLD = new Set([
  'local',
  'localhost',
  'internal',
  'lan',
  'home',
  'corp',
  'intranet',
  'test',
  'invalid',
  'example',
  'onion',
  'arpa',
  'localdomain',
]);
const BAD_SUFFIX = ['nip.io', 'sslip.io', 'xip.io', 'localtest.me', 'lvh.me', 'traefik.me'];
const TRACKING = ['utm_', 'fbclid', 'gclid', 'mc_', 'ref_src'];

/** A public web address: a real domain, no IP literal, no credentials, no custom port (the contract's `_public_url`). */
export function isPublicUrl(url: string): boolean {
  if (!url || url.length > LIMITS.maxUrl) return false;
  for (let i = 0; i < url.length; i++) {
    const code = url.charCodeAt(i);
    if (code < 33 || code > 126) return false;
  }
  const m = URL_RE.exec(url);
  if (!m) return false;
  let host = (m[1] ?? '').toLowerCase();
  if (host.includes('@')) return false;
  if (host.includes(':')) {
    const at = host.indexOf(':');
    const port = host.slice(at + 1);
    host = host.slice(0, at);
    if (port !== '80' && port !== '443') return false;
  }
  const labels = host.split('.');
  if (labels.length < 2 || !labels.every((x) => LABEL_RE.test(x))) return false;
  const tld = labels[labels.length - 1] ?? '';
  const alpha = /^[a-z]+$/.test(tld) && tld.length >= 2;
  if (!alpha && !tld.startsWith('xn--')) return false;
  if (BAD_TLD.has(tld)) return false;
  for (let i = 0; i < labels.length - 3; i++) {
    if (labels.slice(i, i + 4).every((x) => /^\d+$/.test(x))) return false;
  }
  return !BAD_SUFFIX.some((s) => host === s || host.endsWith('.' + s));
}

const upperPct = (s: string) => s.replace(/%[0-9a-fA-F]{2}/g, (x) => x.toUpperCase());

/**
 * The identity of a page, in readable form. The contract hashes this string; two links with the same result are the
 * same page: scheme, host case, default port, "www.", fragment, trailing slash, parameter order, tracking parameters
 * and percent-escape case do not make a page different.
 */
export function canonicalPage(url: string): string {
  const m = URL_RE.exec(url);
  if (!m) return '';
  let host = (m[1] ?? '').toLowerCase();
  for (const def of [':80', ':443']) if (host.endsWith(def)) host = host.slice(0, -def.length);
  if (host.startsWith('www.')) host = host.slice(4);
  const rest = (m[2] ?? '').split('#', 1)[0] ?? '';
  const q = rest.indexOf('?');
  let path = q >= 0 ? rest.slice(0, q) : rest;
  const query = q >= 0 ? rest.slice(q + 1) : '';
  path = upperPct(path)
    .replace(/\/{2,}/g, '/')
    .replace(/\/+$/, '');
  const pairs = query
    .split('&')
    .filter((p) => p && !TRACKING.some((t) => p.toLowerCase().startsWith(t)))
    .map(upperPct)
    .sort();
  return host + path + (pairs.length ? '?' + pairs.join('&') : '');
}

// ---- addresses, money, durations -------------------------------------------------------------------------------
export const isAddress = (a: string) => /^0x[0-9a-fA-F]{40}$/.test(a.trim());

export function splitBond(bond: bigint): { finder: bigint; closer: bigint; beneficiary: bigint } {
  const finder = (bond * LIMITS.finderBps) / LIMITS.bps;
  const closer = (bond * LIMITS.closerBps) / LIMITS.bps;
  return { finder, closer, beneficiary: bond - finder - closer };
}

// ---- forms ------------------------------------------------------------------------------------------------------
export interface TenetDraft {
  text: string;
  anchor: string;
}

export function validateTenet(
  draft: TenetDraft,
  others: TenetDraft[] = [],
): { text?: string; anchor?: string } {
  const out: { text?: string; anchor?: string } = {};
  const text = cleanText(draft.text);
  const anchor = cleanText(draft.anchor);
  const n = charLength(text);
  if (n < LIMITS.minTenet || n > LIMITS.maxTenet)
    out.text = `A tenet needs ${LIMITS.minTenet} to ${LIMITS.maxTenet} characters (now ${n}).`;
  else if (steers(text)) out.text = 'A tenet may not try to steer the inspector.';
  else if (others.some((o) => normText(o.text) === normText(text)))
    out.text = 'That tenet is already in the covenant.';
  const a = charLength(anchor);
  if (anchor && (a < LIMITS.minAnchor || a > LIMITS.maxAnchor)) {
    out.anchor = `An anchor needs ${LIMITS.minAnchor} to ${LIMITS.maxAnchor} characters, or leave it empty (now ${a}).`;
  }
  return out;
}

export interface CovenantDraft {
  title: string;
  url: string;
  beneficiary: string;
  publisher: string | null;
  term: number;
  cure: number;
  gap: number;
  maxAge: number;
  bond: bigint | null;
}

export type DraftErrors = Partial<
  Record<'title' | 'url' | 'beneficiary' | 'term' | 'cure' | 'gap' | 'maxAge' | 'bond', string>
>;

export function validateDraft(d: CovenantDraft): DraftErrors {
  const e: DraftErrors = {};
  const title = charLength(cleanText(d.title));
  if (title < LIMITS.minTitle || title > LIMITS.maxTitle)
    e.title = `The title needs ${LIMITS.minTitle} to ${LIMITS.maxTitle} characters.`;
  if (!isPublicUrl(d.url.trim()))
    e.url = 'Use one public http(s) link with a real domain: no IP address, port, login or local host.';
  const ben = d.beneficiary.trim();
  if (!isAddress(ben)) e.beneficiary = 'Enter a 0x… account address (42 characters).';
  else if (/^0x0{40}$/i.test(ben))
    e.beneficiary = 'The beneficiary must be a real account, not the zero address.';
  else if (d.publisher && ben.toLowerCase() === d.publisher.toLowerCase())
    e.beneficiary = 'The beneficiary cannot be you. Name someone independent.';
  if (d.term < LIMITS.minTerm || d.term > LIMITS.maxTerm)
    e.term = 'The term has to be between 1 minute and 366 days.';
  if (d.cure < LIMITS.minCure || d.cure > LIMITS.maxCure)
    e.cure = 'The cure time has to be between 1 minute and 30 days.';
  if (d.gap < LIMITS.minGap || d.gap > LIMITS.maxGap)
    e.gap = 'The gap between readings has to be between 1 minute and 7 days.';
  if (d.maxAge !== 0 && (d.maxAge < LIMITS.minAge || d.maxAge > LIMITS.maxAge))
    e.maxAge = 'Freshness is off (0) or between 1 hour and 3650 days.';
  if (d.bond === null) e.bond = 'Enter a bond as a plain number such as 0.05.';
  else if (d.bond < LIMITS.minBond || d.bond > LIMITS.maxBond)
    e.bond = 'The bond has to be between 0.01 GEN and 1,000,000,000 GEN.';
  return e;
}

/** What a reading's `detail` tokens mean, in plain words. */
export function describeToken(token: string): { label: string; hard: boolean } {
  const [name = '', n] = token.split(':');
  switch (name) {
    case 'unbound':
      return { label: "The publisher's address is not on the page", hard: true };
    case 'anchor':
      return { label: `The exact words (anchor) of tenet ${n} are gone`, hard: true };
    case 'stale':
      return { label: 'The newest date on the page is too old (or there is none)', hard: true };
    case 'steering':
      return { label: 'The page talks to the inspector', hard: true };
    case 'contradiction':
      return { label: `Tenet ${n} is contradicted by a sentence on the page`, hard: true };
    case 'dark':
      return { label: 'The page stayed unreadable', hard: true };
    case 'weakened':
      return { label: `Tenet ${n} looks softened`, hard: false };
    case 'missing':
      return { label: `Tenet ${n} is no longer mentioned`, hard: false };
    case 'unsure':
      return { label: `Tenet ${n} could not be verified with a quote`, hard: false };
    default:
      return { label: token, hard: false };
  }
}
