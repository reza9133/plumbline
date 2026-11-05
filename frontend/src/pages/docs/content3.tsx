import { Link } from 'react-router-dom';
import { CHAIN, CONTRACT_ADDRESS } from '../../config';
import { Callout, Code, Table } from './parts';
import { MochiSays } from '../../components/Mochi';

export function Frontend() {
  return (
    <>
      <p>
        The app is a static single-page site (Vite, React, TypeScript). It has no server: reads go straight to
        the Studionet RPC through <code>genlayer-js</code>, and writes are signed by your own wallet.
      </p>
      <h2 id="pages">Pages</h2>
      <Table
        head={['Page', 'What it does']}
        rows={[
          [
            <Link key="1" to="/">
              Home
            </Link>,
            'What Plumbline is, live totals, a 3D plumb bob you can pluck',
          ],
          [
            <Link key="2" to="/covenants">
              Covenants
            </Link>,
            'The registry: search, filter by state, sort',
          ],
          [
            'Covenant #N',
            'Tenets, readings, a 3D wall that leans where the page drifted, and every action you may take',
          ],
          [
            <Link key="3" to="/create">
              Create
            </Link>,
            'Four-step wizard; sends create, tenets and (optionally) activate in order',
          ],
          [
            <Link key="4" to="/inspect">
              Inspect
            </Link>,
            'The inspector desk: what can be read, confirmed or matured right now',
          ],
          [
            <Link key="5" to="/ledger">
              Ledger
            </Link>,
            'The books: deposited = paid + owed + locked',
          ],
          [
            <Link key="6" to="/dashboard">
              My account
            </Link>,
            'Your covenants, record, and credit to collect',
          ],
          [
            <Link key="7" to="/tools">
              Tools
            </Link>,
            'Page identity, steering tripwire, slash split, timing',
          ],
        ]}
      />
      <h2 id="tx">How a transaction runs</h2>
      <ol>
        <li>
          You press a button. If no wallet is connected the picker opens; if the wallet is on another network
          it is asked to switch.
        </li>
        <li>
          An overlay follows the transaction: <b>wallet</b> (confirm), <b>submitted</b>, then the network's
          own status while validators work (PENDING, PROPOSING, COMMITTING, REVEALING), then <b>accepted</b>.
        </li>
        <li>
          The overlay reads the receipt. A call the contract refused shows the contract's own message and says
          nothing changed. UNDETERMINED means the validators could not agree about the page; retry in a
          moment.
        </li>
        <li>Every list refreshes when the transaction finishes, and every 20 seconds otherwise.</li>
      </ol>
      <Callout>
        Reading a page with the AI inspector (<b>activate</b> and <b>inspect</b>) is the slow part: a minute
        or two is normal.
      </Callout>
      <h2 id="buttons">Why a button is disabled</h2>
      <p>
        Buttons mirror the contract's preconditions and say why they are off (wrong role, wrong state, "the
        last reading is too recent" with a countdown). Time is judged with your computer's clock; if it is far
        off, the contract's own check still applies.
      </p>
      <h2 id="themes">Themes</h2>
      <p>
        Two themes: <b>Light</b> (warm paper) and <b>Dim</b> (a dusky indigo, deliberately not black). The
        first visit follows your system setting; the toggle in the header remembers your choice.
      </p>
      <h2 id="demo">Demo data</h2>
      <p>
        The footer has a <b>Demo data</b> switch. It replaces the chain with invented sample covenants in
        every state so you can look around without a network. A banner is shown the whole time and every write
        is switched off. Add <code>?demo=1</code> to any link to switch it on, <code>?demo=0</code> to switch
        it off.
      </p>
      <h2 id="config">Configuration</h2>
      <Table
        head={['Variable', 'Default', 'Meaning']}
        rows={[
          [
            <code key="1">VITE_PLUMBLINE_ADDRESS</code>,
            <code key="1b" className="break-all">
              {CONTRACT_ADDRESS}
            </code>,
            'The contract to talk to',
          ],
          [
            <code key="2">VITE_RPC_URL</code>,
            <code key="2b">{CHAIN.rpc}</code>,
            'Studionet JSON-RPC endpoint',
          ],
          [
            <code key="3">VITE_EXPLORER_URL</code>,
            <code key="3b">{CHAIN.explorer}</code>,
            'Explorer used for address and transaction links',
          ],
          [
            <code key="4">VITE_BASE</code>,
            <code key="4b">/</code>,
            'Sub-path when the site is not served from the root',
          ],
        ]}
      />
      <h2 id="run">Run and build</h2>
      <Code lang="bash">{`cd frontend
npm install
npm run dev          # http://localhost:5173
npm run check        # typecheck, lint, tests, production build
npm run build        # static files in frontend/dist`}</Code>
      <p>
        The build copies <code>index.html</code> to <code>404.html</code> and writes a <code>_redirects</code>{' '}
        file, so it works on GitHub Pages and Netlify as is; <code>vercel.json</code> covers Vercel. Set{' '}
        <code>VITE_BASE=/plumbline/</code> when publishing under a sub-path.
      </p>
      <h2 id="arch">Architecture</h2>
      <Table
        head={['Folder', 'Contents']}
        rows={[
          [
            <code key="1">src/chain</code>,
            'strict parsers for every view, the live data source, the demo source, transaction sending and receipt reading',
          ],
          [
            <code key="2">src/wallet</code>,
            'EIP-6963 discovery, connect, disconnect, network switch, the wallet UI',
          ],
          [
            <code key="3">src/lib</code>,
            "the contract's input rules ported to TypeScript, money and time formatting, action preconditions",
          ],
          [
            <code key="4">src/three</code>,
            'the 3D scenes (react-three-fiber), loaded lazily and guarded against missing WebGL',
          ],
          [<code key="5">src/pages</code>, 'one file per page; documentation in pages/docs'],
        ]}
      />
      <p>
        All amounts are <code>BigInt</code> from the wire to the screen. Parsers reject anything that is not
        exactly what the contract returns, so a changed contract shows an error instead of wrong numbers.
      </p>
    </>
  );
}

export function WalletDoc() {
  return (
    <>
      <p>
        Wallets are found with <b>EIP-6963</b> (multi-injected provider discovery), not by reading{' '}
        <code>window.ethereum</code>. That means every installed wallet shows up by name and icon, and
        Plumbline talks to the one you choose even if several extensions are installed.
      </p>
      <h2 id="discovery">Discovery</h2>
      <Code lang="ts">{`window.addEventListener('eip6963:announceProvider', (e) => { /* { info, provider } */ });
window.dispatchEvent(new Event('eip6963:requestProvider'));`}</Code>
      <p>
        Each announcement carries <code>info</code> (<code>uuid</code>, <code>name</code>, <code>icon</code>,{' '}
        <code>rdns</code>) and an EIP-1193 <code>provider</code>. The app validates the shape and only accepts
        inline <code>data:</code> image icons, so a wallet cannot make the page load remote images.
      </p>
      <h2 id="connect">Connect</h2>
      <p>
        Choosing a wallet calls <code>eth_requestAccounts</code> on that provider only. The app then reads{' '}
        <code>eth_chainId</code>, subscribes to <code>accountsChanged</code>, <code>chainChanged</code> and{' '}
        <code>disconnect</code>, and shows your address, network and balance in the header.
      </p>
      <h2 id="disconnect">Disconnect</h2>
      <p>
        EIP-1193 has no standard disconnect, so the <b>Disconnect</b> button does three things: removes every
        listener, asks the wallet to revoke this site's access with <code>wallet_revokePermissions</code>{' '}
        (MetaMask-compatible wallets honour it; others ignore it), and forgets the wallet locally so the page
        does not reconnect by itself when you reload. If you lock or disconnect from inside the wallet, the
        app notices and clears its state too.
      </p>
      <h2 id="reconnect">Reconnecting</h2>
      <p>
        If you did not disconnect, the app remembers the wallet's <code>rdns</code> and, when it announces
        itself again, silently asks <code>eth_accounts</code> (no popup). If the wallet still shares an
        account you are connected again.
      </p>
      <h2 id="network">Switching network</h2>
      <p>
        Plumbline lives on <b>{CHAIN.name}</b>, chain id <code>{CHAIN.id}</code> (<code>{CHAIN.idHex}</code>),
        currency {CHAIN.currency.symbol}. If your wallet is on another chain a banner appears at the top of
        every page with a <b>Switch to {CHAIN.short}</b> button; any action that needs to sign also triggers
        the switch. The app sends <code>wallet_switchEthereumChain</code> and, if the wallet does not know the
        network yet (code 4902), <code>wallet_addEthereumChain</code> with these parameters:
      </p>
      <Code lang="json">
        {JSON.stringify(
          {
            chainId: CHAIN.idHex,
            chainName: CHAIN.name,
            nativeCurrency: CHAIN.currency,
            rpcUrls: [CHAIN.rpc],
            blockExplorerUrls: [CHAIN.explorer],
          },
          null,
          2,
        )}
      </Code>
      <h2 id="no-wallet">No wallet?</h2>
      <p>
        You can still browse everything: reads need no wallet. The connect dialog links to wallets you can
        install and has a "Search again" button.
      </p>
      <MochiSays>
        <p>
          Signing always happens in your wallet. Plumbline never sees a private key, and it never sends a
          transaction you did not confirm.
        </p>
      </MochiSays>
    </>
  );
}

export function Faq() {
  const qa: [string, React.ReactNode][] = [
    [
      'Can the publisher withdraw the bond early?',
      'No. A live bond can only grow (top_up). Before activation the publisher can cancel the draft and the bond becomes collectable.',
    ],
    [
      'What if the page is down for a while?',
      'An unreadable page is a DARK reading, not a breach. Only three unreadable readings in a row, spread over at least the cure time, count as hard evidence.',
    ],
    [
      'Can the AI slash a bond by itself?',
      'Only through CONTRADICTED with a sentence that really is on the page, found by both the leader and the validators. Everything else the AI says is soft: logged, never punished.',
    ],
    [
      'Who pays for inspections?',
      'The inspector pays the transaction cost. They are rewarded only if the inspection catches a breach (5% for opening a warning, 10% for confirming it).',
    ],
    [
      'Why did my activation stay a draft?',
      'The reading was not clean. Open the covenant and read the last reading: a missing anchor, a missing address (bound), a stale or missing date, steering text, or a tenet the AI could not verify with a quote. Fix the page and activate again after the gap.',
    ],
    [
      'Why did my transaction end as UNDETERMINED?',
      'The validators could not agree about the page (it may change between fetches). Nothing changed. Try again, and prefer a stable page.',
    ],
    [
      'Can I change a tenet or the beneficiary?',
      'No. Tenets can only be added while the covenant is a draft, and the beneficiary is fixed at creation.',
    ],
    [
      'Does a covenant nobody inspects mean the promise was kept?',
      'No. It matures clean without any reading. Look at the number of readings and when the last one was made.',
    ],
    ['Is my money safe?', 'This is a test network and the contract is not audited. Read the limitations.'],
  ];
  return (
    <div className="space-y-3">
      {qa.map(([q, a]) => (
        <details key={q} className="card group p-4 open:border-cyan/40">
          <summary className="cursor-pointer list-none font-display text-lg font-semibold marker:hidden">
            <span className="mr-2 inline-block text-brass transition group-open:rotate-90">▸</span>
            {q}
          </summary>
          <p className="mt-2 pl-5 text-sm leading-6 text-muted">{a}</p>
        </details>
      ))}
    </div>
  );
}

export function Limitations() {
  return (
    <>
      <ul>
        <li>
          <b>The bond is only as strong as the beneficiary is independent.</b> A publisher who controls the
          beneficiary account can slash their own bond at no cost. Read <code>beneficiary</code> before
          trusting a covenant.
        </li>
        <li>
          <b>Dynamic pages disagree with themselves.</b> A page whose text changes between two fetches can
          make validators disagree, so readings fail to settle. Use stable pages.
        </li>
        <li>
          <b>Anchors are exact and immutable.</b> Rewording a promise breaks its anchor, by design. Anchors
          are searched in the first 60,000 characters of visible text (400,000 characters of HTML).
        </li>
        <li>
          <b>The inspector does not read the whole page.</b> It sees the start and the surroundings of
          anchors. A contradiction elsewhere on a long page is only caught if an anchor leads the inspector
          there.
        </li>
        <li>
          <b>Freshness has day resolution.</b> A date counts from midnight UTC, so the smallest sensible
          max_age is a day or two.
        </li>
        <li>
          <b>Nobody is obliged to inspect.</b> A covenant that nobody reads matures clean.
        </li>
        <li>
          <b>Payouts are credits.</b> The contract cannot confirm that an emitted transfer arrived.
        </li>
        <li>
          <b>Not audited.</b> The suite runs in the direct runner and the contract passes the GenVM linter.
        </li>
      </ul>
      <h2 id="app">About this app</h2>
      <ul>
        <li>Times in buttons and countdowns use your computer's clock; the contract uses the network's.</li>
        <li>The list pages read up to 400 covenants (in pages of 50) and refresh every 20 seconds.</li>
        <li>
          Receipts differ between genlayer-js versions; the app reads the outcome defensively and shows the
          raw detail under "technical details" when it cannot tell.
        </li>
        <li>Studionet is a test network: GEN has no monetary value.</li>
      </ul>
      <Callout kind="warn" title="Security note">
        Never paste a private key anywhere in this app. It does not ask for one; your wallet signs. If a page
        asks for a key, it is not Plumbline.
      </Callout>
    </>
  );
}

export function Glossary() {
  const rows: [string, string][] = [
    ['Anchor', 'Exact words that must stay on the page; checked by string matching.'],
    ['Beneficiary', 'The account named at creation that receives most of a slashed bond.'],
    ['Bound', "The page must carry the publisher's address."],
    ['Cure time', 'How long the publisher has to repair the page after a warning.'],
    ['Covenant', 'One bond behind one page and its tenets.'],
    ['Credit', 'Money owed to an address; paid out by collect().'],
    ['Dark', 'A reading where the page could not be read.'],
    ['Drift', 'A reading with no hard evidence but soft doubts.'],
    ['Finder / closer', 'Who opened a warning / who confirmed it after the cure time.'],
    ['Hard evidence', 'Arithmetic results or a verified contradiction that can start a warning.'],
    [
      'Intelligent Contract',
      'A GenLayer contract that can fetch the web and call an LLM, with validators agreeing through the equivalence principle.',
    ],
    ['Studionet', "GenLayer's test network used by the Studio."],
    ['Tenet', 'One promise in plain words.'],
    ['Warning', 'The state after the first hard reading; the cure window is running.'],
  ];
  return (
    <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-[200px_1fr]">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="font-display text-lg font-semibold">{k}</dt>
          <dd className="text-sm leading-6 text-muted">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
