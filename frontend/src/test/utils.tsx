import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { ThemeProvider } from '../theme/ThemeProvider';
import { ToastProvider } from '../components/Toast';
import { WalletProvider } from '../wallet/WalletProvider';
import { TxProvider } from '../tx/TxProvider';

export function renderApp(ui: ReactElement, route = '/') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <ThemeProvider>
      <QueryClientProvider client={client}>
        <ToastProvider>
          <MemoryRouter initialEntries={[route]}>
            <WalletProvider>
              <TxProvider>{ui}</TxProvider>
            </WalletProvider>
          </MemoryRouter>
        </ToastProvider>
      </QueryClientProvider>
    </ThemeProvider>,
  );
}

export interface MockProvider {
  request: ReturnType<typeof vi.fn>;
  on: ReturnType<typeof vi.fn>;
  removeListener: ReturnType<typeof vi.fn>;
  emit(event: string, payload: unknown): void;
  chainId: string;
}

/** A fake EIP-1193 wallet that announces itself through EIP-6963 whenever the page asks. */
export function installWallet(
  opts: { chainId?: string; account?: string; rdns?: string; name?: string } = {},
) {
  const handlers = new Map<string, Set<(v: unknown) => void>>();
  const account = opts.account ?? '0xAbCdEf0123456789aBcDeF0123456789AbCdEf01';
  const state = {
    chainId: opts.chainId ?? '0xf22f',
    accounts: [] as string[],
    known: new Set(['0xf22f', '0x1']),
  };
  const provider: MockProvider = {
    chainId: state.chainId,
    request: vi.fn(async ({ method, params }: { method: string; params?: unknown[] }) => {
      switch (method) {
        case 'eth_requestAccounts':
          state.accounts = [account];
          return [account];
        case 'eth_accounts':
          return state.accounts;
        case 'eth_chainId':
          return state.chainId;
        case 'eth_getBalance':
          return '0xde0b6b3a7640000'; // 1 GEN
        case 'wallet_switchEthereumChain': {
          const id = (params?.[0] as { chainId: string }).chainId;
          if (!state.known.has(id)) throw Object.assign(new Error('Unrecognized chain ID'), { code: 4902 });
          state.chainId = id;
          handlers.get('chainChanged')?.forEach((h) => h(id));
          return null;
        }
        case 'wallet_addEthereumChain': {
          const id = (params?.[0] as { chainId: string }).chainId;
          state.known.add(id);
          state.chainId = id;
          handlers.get('chainChanged')?.forEach((h) => h(id));
          return null;
        }
        case 'wallet_revokePermissions':
          state.accounts = [];
          return null;
        default:
          throw new Error(`unexpected ${method}`);
      }
    }),
    on: vi.fn((ev: string, fn: (v: unknown) => void) => {
      if (!handlers.has(ev)) handlers.set(ev, new Set());
      handlers.get(ev)?.add(fn);
    }),
    removeListener: vi.fn((ev: string, fn: (v: unknown) => void) => handlers.get(ev)?.delete(fn)),
    emit: (ev, payload) => handlers.get(ev)?.forEach((h) => h(payload)),
  };
  const detail = {
    info: {
      uuid: 'test-uuid-1',
      name: opts.name ?? 'Test Wallet',
      rdns: opts.rdns ?? 'io.test.wallet',
      icon: 'data:image/svg+xml;base64,PHN2Zy8+',
    },
    provider,
  };
  const announce = () => window.dispatchEvent(new CustomEvent('eip6963:announceProvider', { detail }));
  const listener = () => announce();
  window.addEventListener('eip6963:requestProvider', listener);
  return {
    provider,
    account,
    state,
    uninstall: () => window.removeEventListener('eip6963:requestProvider', listener),
  };
}
