import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { CHAIN } from '../config';
import {
  discoverProviders,
  hexToNumber,
  readBalance,
  readChainId,
  requestAccounts,
  revokePermissions,
  silentAccounts,
  switchToStudionet,
  type Eip1193Provider,
  type Eip6963Detail,
} from './eip6963';
import { explainError } from '../chain/tx';
import { useToast } from '../components/Toast';

export type WalletStatus = 'disconnected' | 'connecting' | 'connected';

interface WalletState {
  providers: Eip6963Detail[];
  status: WalletStatus;
  account: string | null;
  chainId: number | null;
  balance: bigint | null;
  walletName: string | null;
  walletIcon: string | null;
  error: string | null;
  switching: boolean;
  modalOpen: boolean;
}

export interface WalletApi extends WalletState {
  wrongNetwork: boolean;
  openModal(): void;
  closeModal(): void;
  connect(uuid: string): Promise<void>;
  disconnect(): Promise<void>;
  switchNetwork(): Promise<boolean>;
  /** Resolves with a ready provider and account, opening the wallet picker or the network switch when needed. */
  ensureReady(): Promise<{ provider: Eip1193Provider; account: string }>;
}

const STORE_KEY = 'plumbline.wallet';
interface Stored {
  rdns: string;
  auto: boolean;
}
const readStored = (): Stored | null => {
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as Partial<Stored>;
    return typeof v.rdns === 'string' ? { rdns: v.rdns, auto: v.auto === true } : null;
  } catch {
    return null;
  }
};
const writeStored = (v: Stored | null) => {
  try {
    if (v) window.localStorage.setItem(STORE_KEY, JSON.stringify(v));
    else window.localStorage.removeItem(STORE_KEY);
  } catch {
    /* ignore */
  }
};

const WalletContext = createContext<WalletApi | null>(null);

const initial: WalletState = {
  providers: [],
  status: 'disconnected',
  account: null,
  chainId: null,
  balance: null,
  walletName: null,
  walletIcon: null,
  error: null,
  switching: false,
  modalOpen: false,
};

export function WalletProvider({ children }: { children: ReactNode }) {
  const toast = useToast();
  const [state, setState] = useState<WalletState>(initial);
  const active = useRef<{ detail: Eip6963Detail; cleanup: () => void } | null>(null);
  const providersRef = useRef<Eip6963Detail[]>([]);
  const pendingReady = useRef<{
    resolve: (v: { provider: Eip1193Provider; account: string }) => void;
    reject: (e: Error) => void;
  } | null>(null);
  const triedAuto = useRef(false);

  const patch = useCallback((p: Partial<WalletState>) => setState((s) => ({ ...s, ...p })), []);

  const detach = useCallback(() => {
    active.current?.cleanup();
    active.current = null;
  }, []);

  const attach = useCallback(
    (detail: Eip6963Detail, account: string, chainId: number | null) => {
      detach();
      const { provider } = detail;
      const onAccounts = (accounts: unknown) => {
        const list = Array.isArray(accounts) ? (accounts as string[]) : [];
        if (list.length === 0) {
          // the user locked or disconnected the wallet from its own UI
          detach();
          writeStored({ rdns: detail.info.rdns, auto: false });
          setState((s) => ({
            ...s,
            status: 'disconnected',
            account: null,
            balance: null,
            walletName: null,
            walletIcon: null,
          }));
          toast.push({ kind: 'info', text: 'Wallet disconnected.' });
        } else {
          const next = list[0] as string;
          setState((s) => ({ ...s, account: next, balance: null }));
          void readBalance(provider, next).then((b) =>
            setState((s) => (s.account === next ? { ...s, balance: b } : s)),
          );
        }
      };
      const onChain = (id: unknown) => {
        const n = hexToNumber(id);
        setState((s) => ({ ...s, chainId: n }));
      };
      const onDisconnect = () => onAccounts([]);
      provider.on?.('accountsChanged', onAccounts as never);
      provider.on?.('chainChanged', onChain as never);
      provider.on?.('disconnect', onDisconnect as never);
      active.current = {
        detail,
        cleanup: () => {
          provider.removeListener?.('accountsChanged', onAccounts as never);
          provider.removeListener?.('chainChanged', onChain as never);
          provider.removeListener?.('disconnect', onDisconnect as never);
        },
      };
      patch({
        status: 'connected',
        account,
        chainId,
        error: null,
        walletName: detail.info.name,
        walletIcon: detail.info.icon || null,
      });
      void readBalance(provider, account).then((b) =>
        setState((s) => (s.account === account ? { ...s, balance: b } : s)),
      );
    },
    [detach, patch, toast],
  );

  // 1. discover wallets (EIP-6963)
  useEffect(() => {
    const stop = discoverProviders((d) => {
      if (providersRef.current.some((p) => p.info.uuid === d.info.uuid)) return;
      providersRef.current = [...providersRef.current, d];
      setState((s) => ({ ...s, providers: providersRef.current }));
    });
    return stop;
  }, []);

  // 2. quietly reconnect to the wallet used last time (never opens a prompt, never after an explicit disconnect)
  useEffect(() => {
    if (triedAuto.current || state.status !== 'disconnected') return;
    const stored = readStored();
    if (!stored?.auto) return;
    const match = state.providers.find((p) => p.info.rdns === stored.rdns);
    if (!match) return;
    triedAuto.current = true;
    void (async () => {
      try {
        const accounts = await silentAccounts(match.provider);
        const first = accounts[0];
        if (first) attach(match, first, await readChainId(match.provider));
      } catch {
        /* stay disconnected */
      }
    })();
  }, [state.providers, state.status, attach]);

  useEffect(() => () => detach(), [detach]);

  const connect = useCallback(
    async (uuid: string) => {
      const detail = providersRef.current.find((p) => p.info.uuid === uuid);
      if (!detail) return;
      patch({ status: 'connecting', error: null });
      try {
        const accounts = await requestAccounts(detail.provider);
        const first = accounts[0];
        if (!first) throw new Error('The wallet did not share an account.');
        const chainId = await readChainId(detail.provider);
        writeStored({ rdns: detail.info.rdns, auto: true });
        attach(detail, first, chainId);
        patch({ modalOpen: false });
        toast.push({ kind: 'ok', text: `Connected to ${detail.info.name}.` });
      } catch (e) {
        patch({ status: 'disconnected', error: explainError(e) });
      }
    },
    [attach, patch, toast],
  );

  const disconnect = useCallback(async () => {
    const current = active.current;
    detach();
    if (current) {
      writeStored({ rdns: current.detail.info.rdns, auto: false });
      await revokePermissions(current.detail.provider);
    }
    setState((s) => ({
      ...s,
      status: 'disconnected',
      account: null,
      chainId: null,
      balance: null,
      walletName: null,
      walletIcon: null,
      error: null,
    }));
    toast.push({ kind: 'info', text: 'Disconnected. This site no longer sees your account.' });
  }, [detach, toast]);

  const switchNetwork = useCallback(async () => {
    const current = active.current;
    if (!current) return false;
    patch({ switching: true, error: null });
    try {
      await switchToStudionet(current.detail.provider);
      const id = await readChainId(current.detail.provider);
      patch({ chainId: id, switching: false });
      if (id === CHAIN.id) toast.push({ kind: 'ok', text: `Switched to ${CHAIN.short}.` });
      return id === CHAIN.id;
    } catch (e) {
      patch({ switching: false, error: explainError(e) });
      toast.push({ kind: 'bad', text: explainError(e) });
      return false;
    }
  }, [patch, toast]);

  const stateRef = useRef(state);
  stateRef.current = state;

  const ensureReady = useCallback(async () => {
    const s = stateRef.current;
    if (s.status !== 'connected' || !s.account || !active.current) {
      patch({ modalOpen: true });
      return new Promise<{ provider: Eip1193Provider; account: string }>((resolve, reject) => {
        pendingReady.current?.reject(new Error('Cancelled.'));
        pendingReady.current = { resolve, reject };
      });
    }
    if (s.chainId !== CHAIN.id) {
      const ok = await switchNetwork();
      if (!ok) throw new Error(`Switch your wallet to ${CHAIN.short} to continue.`);
    }
    return { provider: active.current.detail.provider, account: stateRef.current.account ?? s.account };
  }, [patch, switchNetwork]);

  // answer a waiting ensureReady() once a wallet is connected on the right network
  useEffect(() => {
    const waiting = pendingReady.current;
    if (!waiting || state.status !== 'connected' || !state.account || !active.current) return;
    pendingReady.current = null;
    const provider = active.current.detail.provider;
    const account = state.account;
    if (state.chainId === CHAIN.id) {
      waiting.resolve({ provider, account });
      return;
    }
    void switchToStudionet(provider)
      .then(() => waiting.resolve({ provider, account }))
      .catch((e) => waiting.reject(new Error(explainError(e))));
  }, [state.status, state.account, state.chainId]);

  const closeModal = useCallback(() => {
    patch({ modalOpen: false, error: null });
    if (pendingReady.current && stateRef.current.status !== 'connected') {
      pendingReady.current.reject(new Error('Cancelled.'));
      pendingReady.current = null;
    }
  }, [patch]);

  const api = useMemo<WalletApi>(
    () => ({
      ...state,
      wrongNetwork: state.status === 'connected' && state.chainId !== CHAIN.id,
      openModal: () => patch({ modalOpen: true }),
      closeModal,
      connect,
      disconnect,
      switchNetwork,
      ensureReady,
    }),
    [state, patch, closeModal, connect, disconnect, switchNetwork, ensureReady],
  );

  return <WalletContext.Provider value={api}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletApi {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used inside <WalletProvider>');
  return ctx;
}
