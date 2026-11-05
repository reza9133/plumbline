/**
 * Hand-written EIP-6963 (multi-injected provider discovery) and the small part of EIP-1193 the app needs.
 * https://eips.ethereum.org/EIPS/eip-6963
 */
import { CHAIN } from '../config';

export interface Eip1193Provider {
  request(args: { method: string; params?: unknown[] | Record<string, unknown> }): Promise<unknown>;
  on?(event: string, handler: (...args: never[]) => void): void;
  removeListener?(event: string, handler: (...args: never[]) => void): void;
}

export interface Eip6963Info {
  uuid: string;
  name: string;
  icon: string;
  rdns: string;
}

export interface Eip6963Detail {
  info: Eip6963Info;
  provider: Eip1193Provider;
}

/** Accepts an announcement only if it has the required shape; the icon must be an inline image (no remote loads). */
export function parseAnnouncement(detail: unknown): Eip6963Detail | null {
  if (typeof detail !== 'object' || detail === null) return null;
  const d = detail as { info?: Partial<Eip6963Info>; provider?: Eip1193Provider };
  const info = d.info;
  if (!info || typeof info !== 'object') return null;
  const { uuid, name, icon, rdns } = info;
  if (typeof uuid !== 'string' || !uuid || typeof name !== 'string' || !name || typeof rdns !== 'string')
    return null;
  if (!d.provider || typeof d.provider.request !== 'function') return null;
  const safeIcon =
    typeof icon === 'string' && /^data:image\/(png|jpeg|jpg|svg\+xml|webp|gif);/i.test(icon) ? icon : '';
  return {
    info: { uuid, name: name.slice(0, 60), icon: safeIcon, rdns: rdns.slice(0, 100) },
    provider: d.provider,
  };
}

/** Starts listening for wallet announcements, asks wallets to announce, and returns a stop function. */
export function discoverProviders(onFound: (d: Eip6963Detail) => void, target: Window = window): () => void {
  const handler = (event: Event) => {
    const parsed = parseAnnouncement((event as CustomEvent).detail);
    if (parsed) onFound(parsed);
  };
  target.addEventListener('eip6963:announceProvider', handler);
  target.dispatchEvent(new Event('eip6963:requestProvider'));
  return () => target.removeEventListener('eip6963:announceProvider', handler);
}

export const hexToNumber = (hex: unknown): number | null => {
  if (typeof hex !== 'string' || !/^0x[0-9a-fA-F]+$/.test(hex)) return null;
  return parseInt(hex, 16);
};

export async function requestAccounts(provider: Eip1193Provider): Promise<string[]> {
  const res = await provider.request({ method: 'eth_requestAccounts' });
  return Array.isArray(res) ? res.filter((a): a is string => typeof a === 'string') : [];
}

export async function silentAccounts(provider: Eip1193Provider): Promise<string[]> {
  const res = await provider.request({ method: 'eth_accounts' });
  return Array.isArray(res) ? res.filter((a): a is string => typeof a === 'string') : [];
}

export async function readChainId(provider: Eip1193Provider): Promise<number | null> {
  return hexToNumber(await provider.request({ method: 'eth_chainId' }));
}

export async function readBalance(provider: Eip1193Provider, account: string): Promise<bigint | null> {
  try {
    const res = await provider.request({ method: 'eth_getBalance', params: [account, 'latest'] });
    return typeof res === 'string' && /^0x[0-9a-fA-F]+$/.test(res) ? BigInt(res) : null;
  } catch {
    return null;
  }
}

/** Asks the wallet to switch to Studionet and, when the wallet does not know the network yet, to add it first. */
export async function switchToStudionet(provider: Eip1193Provider): Promise<void> {
  try {
    await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: CHAIN.idHex }] });
  } catch (e) {
    const code = typeof e === 'object' && e !== null ? (e as { code?: number }).code : undefined;
    const message =
      typeof e === 'object' && e !== null ? String((e as { message?: string }).message ?? '') : '';
    const unknownChain =
      code === 4902 || /unrecognized chain|unknown chain|not been added|try adding the chain/i.test(message);
    if (!unknownChain) throw e;
    await provider.request({
      method: 'wallet_addEthereumChain',
      params: [
        {
          chainId: CHAIN.idHex,
          chainName: CHAIN.name,
          nativeCurrency: CHAIN.currency,
          rpcUrls: [CHAIN.rpc],
          blockExplorerUrls: [CHAIN.explorer],
        },
      ],
    });
  }
}

/** Wallets have no standard "disconnect". MetaMask-compatible wallets can revoke the site permission; others ignore it. */
export async function revokePermissions(provider: Eip1193Provider): Promise<void> {
  try {
    await provider.request({ method: 'wallet_revokePermissions', params: [{ eth_accounts: {} }] });
  } catch {
    /* not supported: the app still forgets the account and stops reconnecting on its own */
  }
}
