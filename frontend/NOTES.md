# Notes — what is and is not verified

1. **Live reads were not exercised from the build sandbox.** The Studionet RPC was unreachable from the environment this frontend was built in (HTTP 403 through the proxy). Reading and writing against the deployed contract `0x88Cda1E7…27d4c` therefore has not been run end to end. The parsers are tested against JSON shaped like the contract's views, and the repo's own live report (`reports/`) shows the contract answering on Studionet. Please open the app against the real RPC once and look at the Covenants page before relying on it. Demo mode (`?demo=1`) exists so the UI can be reviewed without the chain.
2. **Receipt parsing is defensive.** The created covenant id is read from the transaction receipt (ported from `scripts/receipt.mjs`). If that fails, the app falls back to `covenants_of(publisher)` and takes the newest. If both fail it tells the user instead of guessing.
3. **Wallet flow is tested with a mock EIP-6963 wallet** (unit tests and a real Chromium run), not with MetaMask or other real extensions.
4. **No `window.ethereum` fallback**, by design. A wallet that does not announce itself via EIP-6963 will not appear.
5. **The logo is original**, drawn as SVG for this project (a plumb bob over a bond ring). The GenLayer logo and the Mochi mascot are the files you supplied; Mochi was cut out of its background by script, so edges may need a touch-up with the original artwork.
6. **3D needs WebGL.** Without it the scenes are replaced by a static fallback. Motion respects `prefers-reduced-motion`.
7. **Explorer links** use `https://explorer-studio.genlayer.com`; change `VITE_EXPLORER_URL` if that differs.
8. Studionet GEN has no monetary value; the app says so in the footer.
