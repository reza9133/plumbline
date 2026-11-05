import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { installWallet, renderApp } from '../test/utils';
import { NetworkBanner, WalletButton, WalletModal } from './WalletUI';

function Harness() {
  return (
    <>
      <NetworkBanner />
      <WalletButton />
      <WalletModal />
    </>
  );
}

afterEach(() => {
  window.localStorage.clear();
});

describe('wallet connect and disconnect (EIP-6963)', () => {
  it('discovers a wallet, connects, shows the account, and disconnects for real', async () => {
    const w = installWallet();
    const user = userEvent.setup();
    renderApp(<Harness />);

    await user.click(screen.getByTestId('connect-button'));
    const dialog = await screen.findByRole('dialog');
    await user.click(await within(dialog).findByTestId('wallet-io.test.wallet'));

    const chip = await screen.findByTestId('wallet-chip');
    expect(chip).toHaveTextContent('0xAbCd…Ef01');
    expect(w.provider.request).toHaveBeenCalledWith({ method: 'eth_requestAccounts' });
    expect(w.provider.on).toHaveBeenCalledWith('accountsChanged', expect.any(Function));
    expect(screen.queryByTestId('network-banner')).not.toBeInTheDocument();
    expect(JSON.parse(window.localStorage.getItem('plumbline.wallet') ?? '{}')).toMatchObject({
      rdns: 'io.test.wallet',
      auto: true,
    });

    await user.click(chip);
    await user.click(await screen.findByTestId('disconnect-button'));

    await waitFor(() => expect(screen.getByTestId('connect-button')).toBeInTheDocument());
    expect(w.provider.request).toHaveBeenCalledWith({
      method: 'wallet_revokePermissions',
      params: [{ eth_accounts: {} }],
    });
    expect(w.provider.removeListener).toHaveBeenCalledWith('accountsChanged', expect.any(Function));
    expect(JSON.parse(window.localStorage.getItem('plumbline.wallet') ?? '{}').auto).toBe(false);
    w.uninstall();
  });

  it('reconnects silently after a reload, but not after a disconnect', async () => {
    const w = installWallet();
    window.localStorage.setItem('plumbline.wallet', JSON.stringify({ rdns: 'io.test.wallet', auto: true }));
    w.state.accounts = [w.account];
    const { unmount } = renderApp(<Harness />);
    expect(await screen.findByTestId('wallet-chip')).toBeInTheDocument();
    expect(w.provider.request).not.toHaveBeenCalledWith({ method: 'eth_requestAccounts' });
    unmount();

    window.localStorage.setItem('plumbline.wallet', JSON.stringify({ rdns: 'io.test.wallet', auto: false }));
    renderApp(<Harness />);
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.getByTestId('connect-button')).toBeInTheDocument();
    w.uninstall();
  });

  it('shows the switch-network message on the wrong chain and switches', async () => {
    const w = installWallet({ chainId: '0x1' });
    const user = userEvent.setup();
    renderApp(<Harness />);
    await user.click(screen.getByTestId('connect-button'));
    await user.click(await screen.findByTestId('wallet-io.test.wallet'));

    const banner = await screen.findByTestId('network-banner');
    expect(banner).toHaveTextContent(/Wrong network/i);
    expect(banner).toHaveTextContent('61999');

    await user.click(within(banner).getByRole('button', { name: /switch to studionet/i }));
    await waitFor(() => expect(screen.queryByTestId('network-banner')).not.toBeInTheDocument());
    expect(w.provider.request).toHaveBeenCalledWith({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: '0xf22f' }],
    });
    w.uninstall();
  });

  it('adds Studionet to a wallet that has never heard of it', async () => {
    const w = installWallet({ chainId: '0x1' });
    w.state.known.delete('0xf22f');
    const user = userEvent.setup();
    renderApp(<Harness />);
    await user.click(screen.getByTestId('connect-button'));
    await user.click(await screen.findByTestId('wallet-io.test.wallet'));
    await user.click(
      await within(await screen.findByTestId('network-banner')).findByRole('button', { name: /switch/i }),
    );
    await waitFor(() => expect(screen.queryByTestId('network-banner')).not.toBeInTheDocument());
    expect(w.provider.request).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'wallet_addEthereumChain' }),
    );
    w.uninstall();
  });

  it('reacts to the wallet changing network or locking by itself', async () => {
    const w = installWallet();
    const user = userEvent.setup();
    renderApp(<Harness />);
    await user.click(screen.getByTestId('connect-button'));
    await user.click(await screen.findByTestId('wallet-io.test.wallet'));
    await screen.findByTestId('wallet-chip');

    w.provider.emit('chainChanged', '0x89');
    expect(await screen.findByTestId('network-banner')).toBeInTheDocument();

    w.provider.emit('accountsChanged', []);
    await waitFor(() => expect(screen.getByTestId('connect-button')).toBeInTheDocument());
    w.uninstall();
  });

  it('explains what to do when no wallet is installed', async () => {
    const user = userEvent.setup();
    renderApp(<Harness />);
    await user.click(screen.getByTestId('connect-button'));
    expect(await screen.findByText(/No wallet found in this browser/i)).toBeInTheDocument();
  });
});
