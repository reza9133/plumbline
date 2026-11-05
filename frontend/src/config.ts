/** Static configuration. Every value can be overridden through Vite env variables (see .env.example). */

const env = import.meta.env;

/** The Plumbline contract deployed on GenLayer Studionet. */
export const DEFAULT_CONTRACT = '0x88Cda1E737d8Fb939BC4aE9F3A4Ca958d0A27d4c';
const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

const configured = String(env.VITE_PLUMBLINE_ADDRESS ?? '').trim();
export const CONTRACT_ADDRESS: string = ADDRESS_RE.test(configured) ? configured : DEFAULT_CONTRACT;

const explorerBase = String(env.VITE_EXPLORER_URL ?? 'https://explorer-studio.genlayer.com').replace(
  /\/+$/,
  '',
);

export const CHAIN = {
  id: 61999,
  idHex: '0xf22f',
  name: 'GenLayer Studio Network',
  short: 'Studionet',
  rpc: String(env.VITE_RPC_URL ?? 'https://studio.genlayer.com/api'),
  currency: { name: 'GEN Token', symbol: 'GEN', decimals: 18 },
  explorer: explorerBase,
} as const;

export const LINKS = {
  github: 'https://github.com/reza9133/plumbline',
  x: 'https://x.com/amirhp771',
  genlayer: 'https://www.genlayer.com',
  genlayerDocs: 'https://docs.genlayer.com',
  studio: 'https://studio.genlayer.com',
} as const;

export const explorerAddress = (address: string) => `${CHAIN.explorer}/address/${address}`;
export const explorerTx = (hash: string) => `${CHAIN.explorer}/tx/${hash}`;

/** How often the lists refresh while the tab is open (milliseconds). */
export const POLL_MS = 20_000;
