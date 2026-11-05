# Plumbline — frontend

A multi-page web app for the Plumbline contract on GenLayer Studionet: browse covenants, make a promise, inspect pages, collect credits, and read the full documentation.

- **Contract (Studionet):** `0x88Cda1E737d8Fb939BC4aE9F3A4Ca958d0A27d4c`
- **Repo:** https://github.com/reza9133/plumbline
- **Author on X:** https://x.com/amirhp771

## Run

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
npm run check      # typecheck + lint + tests + build
```

Copy `.env.example` to `.env` to override the address (`VITE_PLUMBLINE_ADDRESS`), explorer, RPC or deploy sub-path (`VITE_BASE`).

## What is inside

| Area | Where |
| --- | --- |
| Pages (home, covenants, detail, create wizard, inspect, ledger, dashboard, tools, about) | `src/pages/` |
| Documentation (14 pages, search, TOC, prev/next) | `src/pages/docs/` |
| Wallet: hand-written EIP-6963 discovery, connect / disconnect, network switch | `src/wallet/` |
| Contract reads (strict parsers, BigInt amounts) and writes (genlayer-js) | `src/chain/` |
| Multi-step transaction runner with overlay | `src/tx/` |
| Port of the contract's input rules, so forms explain problems before signing | `src/lib/rules.ts` |
| 3D: plumb-bob hero, per-covenant "plumb wall", CSS-3D cards, spinners | `src/three/`, `src/components/` |
| Themes: **Light** (warm paper) and **Dim** (dusky indigo) | `src/theme/`, `src/index.css` |

## Wallet behaviour

- Wallets are found only through **EIP-6963** (`eip6963:announceProvider`). There is no `window.ethereum` fallback.
- **Disconnect** clears the app session and asks the wallet to revoke the site permission (`wallet_revokePermissions`) where supported. After an explicit disconnect the app does not silently reconnect on reload.
- On the wrong chain a banner says so and offers **Switch to Studionet** (`wallet_switchEthereumChain`, then `wallet_addEthereumChain` if the wallet does not know the chain). Writes are blocked until the chain is right.

## Demo mode

`?demo=1` or the footer checkbox shows clearly labelled invented sample covenants, read-only. Nothing is mixed into live data.

## Tests

`npm test` runs 119 tests: contract-rule ports, parsers, receipt reading, the EIP-6963 flow with a mock wallet, every page and every docs page.

See [NOTES.md](./NOTES.md) for what could not be verified.
