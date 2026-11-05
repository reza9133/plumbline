import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  ChevronDown,
  ExternalLink,
  LogOut,
  Plug,
  RefreshCw,
  Wallet as WalletIcon,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { CHAIN, explorerAddress } from '../config';
import { gen, shortAddr } from '../lib/format';
import { Modal, CopyButton } from '../components/ui';
import { PlumbSpinner } from '../components/Spinners';
import { useWallet } from './WalletProvider';

export function WalletButton() {
  const w = useWallet();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', away);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', away);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  if (w.status !== 'connected' || !w.account) {
    return (
      <button
        className="btn-primary"
        onClick={w.openModal}
        disabled={w.status === 'connecting'}
        data-testid="connect-button"
      >
        {w.status === 'connecting' ? (
          <PlumbSpinner size={18} label="Connecting" />
        ) : (
          <Plug className="h-4 w-4" />
        )}
        {w.status === 'connecting' ? 'Connecting…' : 'Connect wallet'}
      </button>
    );
  }

  return (
    <div className="relative" ref={box}>
      <button
        className="btn pr-3"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        data-testid="wallet-chip"
      >
        {w.walletIcon ? (
          <img src={w.walletIcon} alt="" className="h-5 w-5 rounded" />
        ) : (
          <WalletIcon className="h-4 w-4" />
        )}
        <span className="font-mono text-[13px]">{shortAddr(w.account)}</span>
        <span
          className={`h-2 w-2 rounded-full ${w.wrongNetwork ? 'bg-warn' : 'bg-ok'}`}
          title={w.wrongNetwork ? 'Wrong network' : CHAIN.short}
        />
        <ChevronDown className={`h-4 w-4 transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="card absolute right-0 z-50 mt-2 w-[min(92vw,320px)] p-4"
        >
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
            {w.walletIcon && <img src={w.walletIcon} alt="" className="h-5 w-5 rounded" />}
            {w.walletName}
          </div>
          <div className="mb-3 flex items-center gap-1 break-all rounded-lg bg-bg/60 px-2.5 py-2 font-mono text-xs">
            <span className="flex-1">{w.account}</span>
            <CopyButton text={w.account} label="Copy address" />
          </div>
          <dl className="mb-3 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">Network</dt>
              <dd className={w.wrongNetwork ? 'font-semibold text-warn' : 'font-semibold text-ok'}>
                {w.wrongNetwork ? `Chain ${w.chainId ?? '?'} (wrong)` : CHAIN.short}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Balance</dt>
              <dd className="font-mono">
                {w.balance === null ? '…' : w.wrongNetwork ? '—' : gen(w.balance)}
              </dd>
            </div>
          </dl>
          {w.wrongNetwork && (
            <button
              className="btn-primary mb-2 w-full"
              onClick={() => void w.switchNetwork()}
              disabled={w.switching}
            >
              {w.switching ? 'Waiting for wallet…' : `Switch to ${CHAIN.short}`}
            </button>
          )}
          <a
            className="btn btn-sm mb-2 w-full"
            href={explorerAddress(w.account)}
            target="_blank"
            rel="noreferrer"
          >
            View on explorer <ExternalLink className="h-3.5 w-3.5" />
          </a>
          <button
            className="btn-danger btn-sm w-full"
            onClick={() => {
              setOpen(false);
              void w.disconnect();
            }}
            data-testid="disconnect-button"
          >
            <LogOut className="h-4 w-4" /> Disconnect
          </button>
        </motion.div>
      )}
    </div>
  );
}

export function WalletModal() {
  const w = useWallet();
  const [searching, setSearching] = useState(false);
  const search = () => {
    setSearching(true);
    window.dispatchEvent(new Event('eip6963:requestProvider'));
    setTimeout(() => setSearching(false), 700);
  };
  return (
    <Modal open={w.modalOpen && w.status !== 'connected'} onClose={w.closeModal} title="Connect a wallet">
      <h2 className="mb-1 text-2xl font-semibold">Connect a wallet</h2>
      <p className="mb-4 text-sm text-muted">
        Plumbline finds the wallets installed in your browser through <b>EIP-6963</b>. Choose one; it will ask
        you to share an account.
      </p>
      {w.providers.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line p-5 text-center text-sm">
          <p className="mb-1 font-semibold">No wallet found in this browser</p>
          <p className="mb-3 text-muted">
            Install a wallet extension such as MetaMask or Rabby, reload the page, then try again.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <a className="btn btn-sm" href="https://metamask.io/download/" target="_blank" rel="noreferrer">
              Get MetaMask
            </a>
            <a className="btn btn-sm" href="https://rabby.io/" target="_blank" rel="noreferrer">
              Get Rabby
            </a>
            <button className="btn btn-sm" onClick={search}>
              <RefreshCw className={`h-3.5 w-3.5 ${searching ? 'animate-spin' : ''}`} /> Search again
            </button>
          </div>
        </div>
      ) : (
        <ul className="space-y-2">
          {w.providers.map((p) => (
            <li key={p.info.uuid}>
              <button
                className="btn w-full justify-start gap-3 py-3 text-left"
                disabled={w.status === 'connecting'}
                onClick={() => void w.connect(p.info.uuid)}
                data-testid={`wallet-${p.info.rdns}`}
              >
                {p.info.icon ? (
                  <img src={p.info.icon} alt="" className="h-7 w-7 rounded-md" />
                ) : (
                  <WalletIcon className="h-7 w-7" />
                )}
                <span className="flex-1">
                  <span className="block text-base">{p.info.name}</span>
                  <span className="block font-mono text-[11px] font-normal text-muted">{p.info.rdns}</span>
                </span>
                {w.status === 'connecting' && <PlumbSpinner size={20} label="Connecting" />}
              </button>
            </li>
          ))}
        </ul>
      )}
      {w.error && (
        <p className="mt-3 flex items-start gap-2 rounded-lg bg-bad/10 p-3 text-sm text-bad">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {w.error}
        </p>
      )}
      <p className="mt-4 text-xs text-muted">
        Nothing is sent without your confirmation. You can disconnect at any time from the wallet menu. Writes
        need {CHAIN.short} (chain {CHAIN.id}); the app offers to switch your wallet for you.
      </p>
    </Modal>
  );
}

/** A banner that appears when the wallet is connected to some other network. */
export function NetworkBanner() {
  const w = useWallet();
  if (!w.wrongNetwork) return null;
  return (
    <div role="alert" className="border-b border-warn/50 bg-warn/15" data-testid="network-banner">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-2.5 text-sm">
        <AlertTriangle className="h-5 w-5 shrink-0 text-warn" />
        <p className="flex-1">
          <b>Wrong network.</b> Your wallet is on chain <span className="font-mono">{w.chainId ?? '?'}</span>.
          Plumbline lives on <b>{CHAIN.name}</b> (chain <span className="font-mono">{CHAIN.id}</span>). Switch
          to read your balance and send transactions.
        </p>
        <button className="btn-primary btn-sm" onClick={() => void w.switchNetwork()} disabled={w.switching}>
          {w.switching ? 'Check your wallet…' : `Switch to ${CHAIN.short}`}
        </button>
      </div>
    </div>
  );
}
