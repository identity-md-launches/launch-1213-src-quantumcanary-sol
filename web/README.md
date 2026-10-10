# Quantum Canary website

A static Vite + React + TypeScript export with three hash-routed pages: Status, Verify and Integrate. Read and verify Ethereum without a wallet. An injected browser wallet is needed only to send bounty ETH, call `poke()`, or call the optional community hook's `payout()`.

The site is an intentionally dense technical document: Anton headlines, IBM Plex Mono, a real canvas balance strip, a printed derivation transcript, numbered money-flow explanation, and a PGP-style public statement. The original four mascot PNGs are unchanged. Small, one-bit dithered print versions are separate runtime assets; the original sticker appears for TRIPPED.

## Install, build and preview

Use Node.js 22.12+ (validated with Node 24.21.0) and npm. From `web/`:

```sh
npm ci
npm run typecheck
npm test
npm run build
npm run check:manifest
npm run preview -- --host 127.0.0.1
```

`npm run build` performs the TypeScript check, exports to repository-root `dist/`, then writes the deployment manifest and verifies the observer ABI hash. Publish that entire directory. `base: './'` and hash navigation work under gateway subpaths without rewrites. The generated `dist/imd-deployment.json` is essential, so use **build + preview** for local inspection; the bare Vite development server does not supply that generated file.

The package manifest and lockfile are unchanged from the existing project. No runtime CDN or backend is used. Dependencies are installed locally, never delivered. On this constrained worker, installation/build/tests ran in `/tmp/quantum-canary-addition/web/`, a copy of the exact source with the same lockfile. The final export was copied back to `dist/`. Dependency trees, npm cache stayed under `/tmp`, outside the repository; the installed Chromium headless shell was used for browser checks. No ignore file was changed.

## Runtime configuration

- `config/deployment.json` and `config/network.json` retain the exact supplied handoffs. `scripts/manifest.mjs` binds them to final export bytes.
- `dist/imd-deployment.json` is the app's runtime source for the observer address, chain, ABI path and public RPCs. `src/config.ts:loadConfig()` fetches it and checks the complete observer ABI's canonical Keccak hash before rendering transactions.
- The manifest retains the handoff's launch ID, source commit, attestation hash and complete one-contract set. The network and wallet-add-chain blocks are unchanged. No extra manifest keys or unrelated contract entries are added. Every other exported file has a SHA-256 inventory entry.
- `src/config.ts` centralizes the optional community token/hook/pool identifiers explicitly supplied in this assignment, the small hook interface, the task-supplied Chainlink proxy and read ABI, the PoolManager read ABI, site/seed metadata, and polling/staleness settings. The PoolManager comes from the runtime network block. These optional community contracts are **not** covered by the observer's attestation.
- All RPC endpoints are public. No private key, API secret, WalletConnect project ID, backend, quote, approval or swap flow exists. There is no guessed factory or launch-payer address.

For the existing source evidence and financial-copy caveats, read [fund-source.md](docs/fund-source.md). Most importantly, the published hook source still permits old claims to be paid after retirement; the frontend blocks its own payout action when retired or tripped and makes the limitation explicit.

## Reads, chart and derivation

The original `chain.ts`, `wallet.ts`, `useCanary.ts` and `derive.ts` are preserved unchanged. Observer reads use one block, validate chain ID, contract code, ordinary bounty account code, every derivation getter and the alarm equation, then recheck the block hash. IMD failure is independent of ETH reads. Public RPCs have the existing injected-wallet fallback on the right chain. Reads run every 12 seconds while visible; stale/unverified observations disable writes.

The canvas shows a rolling five-minute strip of **observations from this browser session**, never fabricated history. The last observed balance is held between samples, for at most 60 seconds. A dashed threshold uses the actual `thresholdWei()` value. The jagged alarm mark on red paper is explicitly distinguished from measured ETH values. Pause freezes the trace; reduced motion renders static frames only when actual inputs change. An accessible table contains exact samples. The decorative block cursor blinks for five seconds, then stops; reduced motion disables it.

Verify calls the unchanged BigInt derivation and prints the real seed, hash, candidate encoding/x/rhs/y/square for every counter, acceptance, parity fix, packed point, address hash and final address. A 65-byte uncompressed-key row follows the address line. Each of five on-chain getters prints `OK` or `MISMATCH`, with both values. `$ run again` recomputes against the latest available observation; stale or changed input is labelled. Reduced motion prints the full transcript immediately.

Status and Integrate expose the live public key as 65-byte uncompressed and 33-byte compressed hex, with full x/y coordinates and independent copy controls. `public-key.ts` pads each coordinate to 32 bytes and chooses the compressed prefix from y parity. The additions share the existing `readSnapshot()` result; no extra RPC loop or fallback key is introduced. Before the terminal, Verify presents the six construction steps with live values. After it, the exact requested AI prompt interpolates the returned sentence, hash, counter, point and address at render time. It remains readable without a wallet, labels last-observed/unverified data and has clipboard/manual-selection recovery. New source URLs are centralized in `config.ts`; the shared head supplies `twitter:site` on all three routes.

The hook ledger reads code and immutable destination/observer/PoolManager bindings before accepting pending fees and retirement. A complete `BountyPaid` log sum provides lifetime paid ETH. Missing history is labelled unavailable rather than inferred from the current balance. It refreshes every 30 seconds while visible and has its own retry control. Public RPC history limits can prevent that total without hiding pending fees. The same complete scan retains the latest 20 payouts, newest first, with exact ETH amounts, blocks and Etherscan transaction links. The **Hook payouts** list covers only `BountyPaid` events; direct donations are absent from the list but included in the balance.

## Wallet actions and signal limits

Wallet controls distinguish disconnected, missing wallet, rejected request, wrong network, ready, preparing, signing, pending, success, failure and uncertain confirmation. Unknown-chain errors trigger the supplied `wallet_addEthereumChain` parameters, followed by another switch. Account/chain are checked immediately before signing. There is one network-switch control in the funding area.

- **Fund:** ordinary ETH transfer to the verified derived bounty address; no calldata, token or observer transfer. The irreversible transfer has an exact-amount review and consent checkbox. Gas estimation precedes signing.
- **Poke:** zero-value call to the observer. Simulation precedes signing. A keeper or visitor must record funding to arm the high-water mark; reads alone do not record it.
- **Payout:** zero-value call to the configured community hook. Fresh observer/hook checks and simulation precede signing; a zero-result simulation sends nothing. Disabled on stale/mismatched reads, no pending fees, a live trip or permanent hook retirement. The caller pays gas and receives nothing.

Each transaction has its own pending state, receipt lock, explorer link and retryable uncertainty state. Replacement receipts are checked against intended destination, calldata and value. Payout success reports the actual `BountyPaid` amount in its receipt, including an explicit no-payment result when no event was emitted. Navigation keeps active transactions mounted.

`isTripped()` is a live check, not a permanent latch. It is true only below the threshold after the recorded high-water mark reached it. A refill can clear it. Integrate includes the full ABI, observer address, and a copyable/compiled Solidity guard with a separate permissionless `observeCanary()` latch. A state change followed by a revert would roll the latch back; the page explains why the observation must succeed separately.

The supplied Chainlink ETH/USD feed adds dollar context beside the canary balance, arming threshold and bounty input/review. Feed failures silently hide USD. Section 04 reads `sqrtPriceX96` through the configured PoolManager’s `extsload`, then displays ETH/USD per CANARY and fully diluted value at the fixed 1,000,000,000 supply. These are labelled pool mid prices, not quotes. Reads are independent, use integer arithmetic, and refresh every 30 seconds while visible. See [market-reads.md](docs/market-reads.md) for formulas, source references and failure handling.

## Validation

From `web/`, after building:

```sh
node scripts/interaction-check.mjs
node scripts/browser-check.mjs
python3 scripts/link-check.py
```

Install a Playwright Chromium browser if needed (`npx playwright install chromium`), or set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to an existing compatible Chromium executable. Both browser scripts own and close a local `/preview/` server. This run used `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/opt/imd-website-stack/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell` because the supplied browser tool expected an unavailable `/opt/google/chrome/chrome`. The interaction script mocks RPC and wallet responses and broadcasts nothing. The live script performs only public reads and inventories external anchors, AI prompt references and absolute head metadata on each route. `link-check.py` requires curl, requests every distinct link with bounded GET and records actual HTTP statuses; it exits nonzero for any non-200 response. Test runs write results and screenshots under `artifacts/browser/` at repository root. The retained, delivered evidence is in `web/evidence/browser/`; current JSON reports and a bounded selection of new screenshots were copied from the isolated check directory without changing an ignore file. Review its size before delivery.

`tests/public-key.test.ts` checks key widths, padding, both root parities, transcript position and live prompt interpolation. `tests/core.test.ts` retains the original derivation, alarm, ABI, value and wallet tests. `tests/fund.test.ts` checks log completeness, newest-20 retention, duplicate rejection, history failure, recipient binding, reorg and transcript cases. `tests/market.test.ts` checks price inversion, packed slots, exact FDV, dollar formatting and oracle failures. [VALIDATION.md](VALIDATION.md) records the final commands, measured contrast, viewport/keyboard/motion checks, source findings and remaining untested behavior. Root [DESIGN.md](../DESIGN.md) describes actual source tokens/components.

## Artwork, licenses and metadata

`public/art/{logo,mascot,hero,sticker}.png` are retained byte-for-byte. `scripts/ink-art.py` optionally regenerates the three small print versions in `public/art/ink/` using Pillow 12.3.0; Python/Pillow is unnecessary to install or build the app. The fourth original, sticker, is intentionally full color in TRIPPED. Anton and IBM Plex Mono are served locally as WOFF2 with their OFL notices. Runtime licenses remain under `public/licenses/`.

Design review used the pinned Better Interface guide (Jakub Krehel, MIT) and its documentation section adapted from Impeccable (Paul Bakaus, Apache-2.0), with the pinned eth-frontend-ux reference (Austin Griffith, MIT). Notices are retained in `docs/licenses/`.

The footer downloads all four original PNGs under **Press kit / CC0**. `public/social-preview.png` is a committed 1200×630 render of the existing dithered hero and Anton headline. Normal builds copy it; optionally regenerate it with `node scripts/social-preview.mjs` after installing Playwright Chromium. `og:url` is `https://quantum-canary.sites.imd.fun/`; `og:image` and `twitter:image` use that domain’s `/social-preview.png`, with `summary_large_image`. The new image becomes publicly available when this export is published. The ENS/IPFS site name remains `quantum-canary.site.identitymd.eth`. Real funded transactions, browser-wallet extensions, hardware wallets, native mobile devices, screen-reader sessions and a byte-for-byte verification of the optional hook deployment were not exercised.

External-link status details, including every checked destination and actual response, are in [LINKS.md](LINKS.md). HTTP challenge/error responses are reported as failures of the all-200 gate; required destinations are preserved. Future wallet receipt URLs can only be checked after actual transactions, which were not broadcast in this run.
