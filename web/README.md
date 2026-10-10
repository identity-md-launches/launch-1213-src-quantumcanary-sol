# Quantum Canary website

A static Vite + React + TypeScript application for the live QuantumCanary observer on Ethereum mainnet. The production export is `../dist/`; publish that directory as plain static files. The application uses relative asset/configuration URLs and hash navigation, so it works under an IPFS gateway subpath without route rewrites. It has no backend, wallet service, API key, analytics, or remote font dependency.

## Install, build and preview

Use Node 22 and npm 10 or newer. From the repository root:

```sh
npm ci --prefix web
npm run typecheck --prefix web
npm run test --prefix web
npm run build --prefix web
npm run check:manifest --prefix web
npm run preview --prefix web -- --host 127.0.0.1
```

The build consumes only local files and installed packages. The lockfile fixes the dependency tree; initial dependency installation normally needs the npm registry. An offline installation and rebuild were also tested with a populated npm cache:

```sh
cd web
npm ci --offline --cache /tmp/quantum-canary-npm --no-audit --no-fund
npm run build
```

No dependency archive or npm registry mirror is shipped. Do not include `node_modules`, `.vite`, npm caches, browser binaries or generated test evidence in a source submission. The worker's Git directory was read-only, so source and export are present for the worker's automatic commit; a local `git add`/commit could not be made.

## Deployment configuration

`config/deployment.json` and `config/network.json` preserve the supplied workflow handoff. `public/abi/QuantumCanary.json` is the complete raw ABI exported from the unchanged pinned Solidity implementation with:

```sh
forge inspect src/QuantumCanary.sol:QuantumCanary abi --json --offline
```

`scripts/manifest.mjs` reads those inputs after every build, checks the ABI's canonical Keccak-256 hash, inventories every final export file with SHA-256, and writes `../dist/imd-deployment.json`. `--check` recomputes the inventory and compares the complete manifest with the handoff. The network and wallet-add-chain objects are copied unchanged. The launch has no token pool or swap flow; the Uniswap addresses in the supplied network block are preserved but unused.

At runtime, `src/config.ts` loads **that same exported manifest and ABI**, checks their chain/address structure and canonical ABI hash, and constructs viem clients. There is no independent hard-coded observer/canary address or RPC table in the application. The bounty account is read from `canaryAddress()`; IMD comes from `network.pairToken` and is checked against its on-chain symbol/decimals. The original Solidity sources, Foundry configuration, dependencies and launch manifest are unchanged.

The observer is `0x626517225096671868609c1bbf9c1b416a4efd9a`, Ethereum chain 1. The bounty account is `0x379C0A5704C211f26eadd26e670246E242Af9e7E`. Never send bounty ETH to the observer. These documentation values describe the supplied deployment; application reads and writes use the runtime manifest and contract reads.

## Reads and cryptographic verification

- Public reads work without a wallet. Configured public RPCs are tried in order; a connected injected wallet on the right chain is a final fallback. Reads refresh every 12 seconds while the page is visible, resume when it becomes visible, and can be refreshed manually.
- Each snapshot uses one block number for all ETH/contract/token reads, checks chain ID and nonempty observer code, and rechecks the block hash to reject a mid-read reorganisation. IMD failure does not hide the ETH alarm.
- The seismograph is a step trace of actual observed block balances in this session, capped at 120 samples. It does not fabricate history or imply uninterrupted surveillance. Pause freezes the trace while reads continue. Its values also have a table.
- A snapshot is stale after 60 seconds without a successful read, or if its block timestamp is more than 180 seconds old. Stale/error/unverified snapshots cannot authorize a transaction.
- `src/derive.ts` implements the curve arithmetic with plain JavaScript BigInt and square-and-multiply modular exponentiation. Viem supplies Keccak-256 and an address display checksum, not curve derivation. The search starts at zero; 4,096 failed attempts cause an explicit incomplete-verification error rather than an accepted partial result.
- Verify shows the exact contract phrase, seed hash, field/exponent, every attempted encoded preimage/hash/x/rhs/root/square, even y, packed coordinates, address hash and final address. Five computed/on-chain comparisons are shown with text and color. The phrase is public and is not a wallet recovery phrase.

## Alarm semantics and transactions

`isTripped()` is exactly `balance < thresholdWei && highWaterMark >= thresholdWei`. A funded balance with an unarmed observed mark is labelled **AWAITING POKE**, not ARMED. This additional state avoids implying that a deposit automatically arms the observer. Other states are NOT YET FUNDED, ARMED and TRIPPED; unavailable/stale reads are explicit.

Anyone may call `poke()`. It transfers no ETH, pays no caller reward, and costs network gas. It records the highest observed balance and the first observed trip. A refill can clear the live boolean while preserving `trippedAt` and `trippedBlock`; the UI and integration example explain both. The observer does not alarm on every balance decrease, and unobserved drains/refills may be missed.

An injected EIP-1193 browser wallet is optional for sending a bounty or poking. There is no WalletConnect project ID and no WalletConnect integration. The app handles account/chain changes and disconnects. An unknown-chain switch failure offers `wallet_addEthereumChain` using the supplied exact parameters, then retries the switch.

Bounty input is parsed exactly to wei. The review shows the amount, Ethereum network, recipient and irreversible/no-refund consequence; explicit consent is required. The handler refreshes/validates chain state, checks the signing account/network, and estimates the exact transfer before asking the wallet to send. Poke is simulated before signing. Each action has its own preparation/signing/confirmation/error state. A sent transaction locks both actions through confirmation, including route changes. Receipt verification checks the actual confirmed recipient, value and calldata so a cancellation or unrelated replacement cannot be reported as the requested success. An uncertain receipt stays locked and offers a confirmation check and explorer link. One confirmation is UI feedback, not a claim of finality.

Pending transaction state lives in the current tab only. If the page is reloaded after signing, use the wallet history and explorer to check the transaction before submitting again. No real wallet extension, fund transfer or poke was used during validation.

## Browser and interaction validation

The check scripts start a temporary HTTP preview under `/preview/`, launch a headless browser, and close both before exiting. Install Chromium once, outside the repository, then run:

```sh
PLAYWRIGHT_BROWSERS_PATH=/tmp/quantum-canary-browsers npm exec --prefix web -- playwright install chromium
PLAYWRIGHT_BROWSERS_PATH=/tmp/quantum-canary-browsers node web/scripts/interaction-check.mjs
PLAYWRIGHT_BROWSERS_PATH=/tmp/quantum-canary-browsers node web/scripts/browser-check.mjs
```

`interaction-check.mjs` mocks RPC and injected-wallet calls; no real funds or signing are possible. It covers responsive layouts, accessibility, state transitions, errors and transaction lifecycles. `browser-check.mjs` performs read-only live mainnet checks; it does not connect a wallet. Evidence is generated under `artifacts/browser/`, which is intentionally outside the source bundle. See [VALIDATION.md](VALIDATION.md) for actual outcomes, limitations and the six-domain review. The final implemented design is documented in [../DESIGN.md](../DESIGN.md).

Use `npm run preview` for the production app. A raw Vite dev session does not run the post-build manifest generator; use the production export for deployment/ABI integrity checks.

## Attribution and limitations

The four supplied PNGs are copied byte-for-byte into `public/art/` and exported under `dist/art/`. No artwork was regenerated. IBM Plex Mono is served locally; its OFL and bundled-runtime license notices are included in `public/licenses/` and the production export.

Interface guidance: Jakub Krehel's Better Interface, MIT, commit `267330e1adfc66a718fb65fa6918c1f06d0a689e`. Design documentation method: Paul Bakaus's Impeccable, Apache-2.0, commit `9d715cc4f5564a990ca8345abfdd5df6dc9b41c8`, https://github.com/pbakaus/impeccable/blob/9d715cc4f5564a990ca8345abfdd5df6dc9b41c8/skill/reference/document.md. Both were adapted through the pinned worker guide; their notices/licenses are retained in `docs/licenses/better-interface.txt`.

Ethereum frontend guidance: Austin Griffith's ethskills, MIT, commit `06ea4efa08076ff04f6ca4945ef4a2ca881115b0`; notice/license retained in `docs/licenses/eth-frontend-ux.txt`.

No public hosting URL was supplied, so absolute canonical/Open Graph image URLs remain a publication follow-up. Metadata, favicon and page titles use Quantum Canary. USD values are not invented; the funding panel states that no conversion feed is configured. The site reports a signal under the contract's cryptographic assumptions, not proof of which hardware caused any future spend.
