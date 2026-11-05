import { discoverProviders, hexToNumber, parseAnnouncement, switchToStudionet } from './eip6963';

const good = (over: object = {}) => ({
  info: { uuid: 'u1', name: 'Wallet', icon: 'data:image/png;base64,AAAA', rdns: 'io.wallet' },
  provider: { request: async () => null },
  ...over,
});

describe('parseAnnouncement', () => {
  it('accepts a well-formed announcement', () => {
    expect(parseAnnouncement(good())?.info.name).toBe('Wallet');
  });
  it('rejects missing pieces', () => {
    expect(parseAnnouncement(null)).toBeNull();
    expect(parseAnnouncement({})).toBeNull();
    expect(parseAnnouncement(good({ provider: {} }))).toBeNull();
    expect(parseAnnouncement(good({ info: { uuid: '', name: 'x', icon: '', rdns: 'x' } }))).toBeNull();
  });
  it('drops icons that are not inline images', () => {
    const r = parseAnnouncement(
      good({ info: { uuid: 'u', name: 'W', icon: 'https://evil.example/pixel.png', rdns: 'x' } }),
    );
    expect(r?.info.icon).toBe('');
  });
});

describe('discoverProviders', () => {
  it('asks wallets to announce and reports each one', () => {
    const found: string[] = [];
    const answer = () =>
      window.dispatchEvent(new CustomEvent('eip6963:announceProvider', { detail: good() }));
    window.addEventListener('eip6963:requestProvider', answer);
    const stop = discoverProviders((d) => found.push(d.info.rdns));
    expect(found).toEqual(['io.wallet']);
    window.dispatchEvent(new CustomEvent('eip6963:announceProvider', { detail: { nonsense: true } }));
    expect(found).toHaveLength(1);
    stop();
    answer();
    expect(found).toHaveLength(1);
    window.removeEventListener('eip6963:requestProvider', answer);
  });
});

describe('switchToStudionet', () => {
  it('only switches when the wallet knows the network', async () => {
    const request = vi.fn().mockResolvedValue(null);
    await switchToStudionet({ request });
    expect(request).toHaveBeenCalledTimes(1);
    expect(request.mock.calls[0]?.[0]).toMatchObject({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: '0xf22f' }],
    });
  });
  it('adds the network first when the wallet does not know it', async () => {
    const request = vi
      .fn()
      .mockRejectedValueOnce({ code: 4902, message: 'Unrecognized chain ID' })
      .mockResolvedValue(null);
    await switchToStudionet({ request });
    expect(request.mock.calls[1]?.[0]).toMatchObject({ method: 'wallet_addEthereumChain' });
    const params = (
      request.mock.calls[1]?.[0] as { params: [{ nativeCurrency: { symbol: string }; rpcUrls: string[] }] }
    ).params[0];
    expect(params.nativeCurrency.symbol).toBe('GEN');
    expect(params.rpcUrls[0]).toMatch(/^https:/);
  });
  it('passes other errors through (for example a rejection)', async () => {
    const request = vi.fn().mockRejectedValue({ code: 4001, message: 'User rejected' });
    await expect(switchToStudionet({ request })).rejects.toMatchObject({ code: 4001 });
    expect(request).toHaveBeenCalledTimes(1);
  });
  it('hexToNumber', () => {
    expect(hexToNumber('0xf22f')).toBe(61999);
    expect(hexToNumber('nope')).toBeNull();
    expect(hexToNumber(5)).toBeNull();
  });
});
