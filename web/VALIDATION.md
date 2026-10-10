# Quantum Canary correction and completion validation

This is a worker report, not independent certification. The implemented frontend is complete; the requested **all-external-links-return-200 gate remains unmet** because Etherscan returned HTTP 403 challenges for all nine of its URLs, and the pinned GitHub hook-source page returned HTTP 503 during the final check (200 earlier). The useful deliverable is retained, with the exact results in [LINKS.md](LINKS.md).

## Scope and preservation

Continued the existing Vite/React/TypeScript app, without contract changes, deployment, token issuance, swaps or approvals. Preserved the three pages, display/mono fonts, palette, seismograph, Verify terminal, statement and existing explanatory copy except the requested corrections. All four original press PNGs remain byte-identical. Existing package manifests/lockfiles, Vite/TypeScript configuration, Solidity/build files, libraries, ignore file and protected directories were not changed.

Implemented the corrected CANARY headline and identity, replacement IMD links, adjacent hook GitHub footer link, Chainlink USD context, PoolManager mid-price/FDV reads, newest-20 hook payouts, section 06 provenance, CC0 press downloads and a committed 1200×630 preview. The hero texture already had `aria-hidden="true"`; it was preserved and asserted in the browser. The two descriptions of payout history in the brief refer to the same `BountyPaid` events, so one **Hook payouts** list serves both; it explicitly excludes direct donations from history and includes them in the balance.

The supplied facts about agents, audits, dates, 26 minutes, factory attestations and payer ownership are reproduced in the provenance block with the requested public records. This frontend pass did not independently redo those audits or prove every historic attribution. The observer ABI remains bound to its supplied canonical Keccak hash. The optional hook/token and the newly named oracle are not added to, or misrepresented as part of, the observer's one-contract deployment attestation.

## Commands and outcomes

Dependencies were installed using the existing unchanged lockfile in `/tmp/quantum-canary-check/web`; npm cache and Chromium downloads also stayed under `/tmp`. Source used by the build was compared byte-for-byte to the delivered source. Final files were copied to repository-root `dist/`.

| Command | Result |
| --- | --- |
| `npm ci --ignore-scripts --no-audit --no-fund` with a temporary cache | Pass; exact existing dependencies, no repository dependency/cache directories |
| `npm run typecheck` | Pass; strict TypeScript |
| `npm test` | Pass; 46 cases across core (21), fund (12), market (13) |
| `node scripts/social-preview.mjs` | Pass; 1200×630 PNG, existing local Anton and dithered hero; visually inspected |
| `npm run build` after final source correction | Pass; Vite relative-base export and manifest generation |
| `npm run check:manifest` | Pass; one attested contract, 19 exported assets, matching ABI and SHA-256 inventory |
| `node scripts/interaction-check.mjs` against final `/preview/` export | Pass; 32 interaction groups, no JS/console errors; mocked RPC/wallet, no broadcast |
| `node scripts/browser-check.mjs` against final `/preview/` export | Pass; 5 live-read groups, no JS/console/resource errors; real mainnet, no wallet/funds |
| `python3 scripts/link-check.py` | Nonzero by design: 7 HTTP 200, 9 Etherscan HTTP 403, 1 GitHub HTTP 503 (earlier 200); no false success |
| `git diff --check` and delivery integrity audit | Pass; final details in `evidence/delivery-integrity.json` |

Vite reports the existing large-chunk advisory: the main bundle is about 556 kB minified / 175 kB gzip. No runtime CDN, source maps, package archives, vendored registry, backend or secret is included. No changes were made to build configuration to suppress the advisory.

## Behavior covered

Unit cases exercise derivation, alarm lifecycle, amount parsing, wallet network fallback and attested ABI binding. New financial cases check inverse ETH/CANARY orientation, packed tick/fee masking, fixed supply FDV calculated before per-token rounding, tiny USD values, incorrect chain/reorgs, and seven invalid/incomplete/stale Chainlink round variants. Oracle and pool failures are independent. History tests cover complete non-overlapping ranges, total preservation while limiting rows to 20, newest block/log order, empty results, duplicates, bad recipients, removed events, unavailable pages and reorgs.

Browser interactions exercise public reads without a wallet; missing-wallet recovery; connect; wrong chain; exact `wallet_switchEthereumChain` → 4902 → supplied `wallet_addEthereumChain` → switch; live input USD; invalid amount/no USD; irreversible consent; wallet rejection and recovery; exact funding/poke/payout destinations, values and calldata; per-action pending/receipt locks across navigation; payout simulation; retirement/trip/stale gates; ABI tampering; public RPC outage/retry; initial oracle outage; an oracle failing after a successful price then recovering; independent pool failure; zero and 25 mock event histories with exactly 20 visible rows; original PNG download bytes; corrected links, provenance and social image dimensions/metadata. Existing chart pause/reduced motion and terminal mismatch/run-again behavior are covered.

All mock transactions stay inside the test's injected provider. No actual wallet was connected and no transaction was signed, submitted or simulated against mainnet for a write. The live script reads the deployed observer, complete hook history, Chainlink proxy and PoolManager over the supplied public RPCs. Mainnet had zero bounty balance, zero pending/paid hook ETH, `retired=false`, no payout events, and five matching derivation getters at the recorded block. It displayed 0.00000001 ETH per CANARY and 10 ETH FDV with a live USD rate. Populated event rows are therefore validated with mocks, not claimed as real transfers.

## Better Interface review

Read the pinned workflow, all six core domains and document-web-design section. The requested visual design took precedence over generic suggestions to add themes, cards, rounded controls or animation. Coverage is limited to the supported single dark English interface.

| Domain | Coverage and evidence | Limits |
| --- | --- | --- |
| Accessibility — Checked | Native headings, numbered provenance list, semantic payout table/caption/headers, accessible transaction names, copy/download controls, amount descriptions, inherited keyboard focus and skip link. Hero texture asserted hidden; decorative mark has empty alt. Axe WCAG 2 A/AA, 2.1 AA and 2.2 AA scans on all three routes. Keyboard route/skip paths and reduced-motion states exercised. | No screen-reader session, physical touch device or browser-native 200% zoom. Axe is not a compliance certificate. |
| Layout — Checked | Rendered export at 1440, 768, 390 and 320 CSS px; all routes checked for page overflow. Token identification precedes original fund copy in DOM order; mobile stacks with a 1.5rem gap. Checked long addresses, 20 rows, wrapping footer, new provenance and 200% root text enlargement. | No RTL/localization variants exist. Tall section screenshots may use a taller viewport at the same width; ordinary reflow tests use 900px height. |
| Writing — Checked | Corrected exact headline, descriptive explorer labels, retained speculation/direct-funding sentences, explicit pool-mid-price/not-a-quote and direct-donation boundary, distinct empty/unavailable history, hidden failed USD. Original terminal and statement copy untouched. | Etherscan external availability remains unresolved; detailed status table is separate. |
| Typography — Checked | Existing local Anton 400 and Plex Mono 400/600 loaded; no new family/weight. Muted .8125rem/1.65 USD; tabular numbers; full selectable addresses; inspected narrow token/provenance/ledger wrapping. Corrected split block numbers in new table. | Native mobile font rendering not tested. |
| Colors — Checked | Existing semantic hex tokens reused. Browser-computed token pairs and conservative 12% overlay lower bounds recorded in `computed-design.json`; all nine checked text pairs exceed 4.5:1. No new status/accent color. | This measures specified token pairs, not every antialiased/mascot pixel. No light theme exists. |
| UI — Checked | Loading, empty, unavailable, recovery, disabled/pending/success/error states; unchanged static/reduced-motion chart and terminal; direct downloads work from subpath; no extra trading controls. Screenshot review of final additions. | Native extensions/hardware wallets, Safari/Firefox and 10%-speed DevTools animation replay not exercised. |

### Findings and fixes

| Severity / location | Evidence and correction | Recheck |
| --- | --- | --- |
| Medium — `src/MoneyFlow.tsx:84`, `src/config.ts:14` | Old “has no token” headline contradicted existing CANARY; old launch URLs were obsolete. Applied the exact replacement headline, dithered identity, Uniswap link and requested explorer destinations; retained Etherscan source link in place. | Browser text/href assertions; corrected IMD and Uniswap destinations return 200. |
| Medium — `src/market-chain.ts:23`, `src/useMarket.ts:17` | USD context was unavailable. Added task-specified Chainlink reads with invalid/stale guards and failure isolation; no stale USD survives a failed refresh. | 13 market unit cases, input conversion and outage/recovery interactions; real mainnet rate read. |
| Medium — `src/market-chain.ts:13`, `src/MoneyFlow.tsx:87` | Added price could be misleading if treated as a trade quote or if inverted incorrectly. Low-160-bit slot extraction, inverse ETH/token calculation and independent exact FDV are labelled as mid price, excluding execution costs. | Known-ratio and packed-bit tests plus real PoolManager read. |
| Medium — `src/fund-chain.ts:10`, `src/MoneyFlow.tsx:103` | A limited log list could be mistaken for all incoming ETH. Reused complete event scan; retain latest 20; reject incomplete/invalid metadata; visibly distinguish no events, unavailable history and direct donations. | Empty/25-event browser states, newest-first tests, failed-history recovery, actual empty mainnet history. |
| Low — `src/style.css:1419` | 320px screenshot showed token links touching the original fund paragraph. Added scoped 1.5rem separation under the identity column at the existing breakpoint. | Inspected final 320px token screenshot. |
| Medium — `src/style.css:840` | 320px payout screenshot split the last digit of each block and the transaction heading. Rebalanced columns to 33/34/33 and kept block values/links together; exact amounts may wrap. | Final 320px payout screenshot and overflow checks. |
| No defect — `src/App.tsx:66` | Hex texture already had `aria-hidden="true"`; no visual/source change needed. | Browser attribute assertion. |
| Remaining external limitation — `src/config.ts:90` | All nine required Etherscan targets returned HTTP 403. Retried GET with browser headers; actual Chromium also received a Cloudflare challenge. | Preserved destinations, reported every status; all-200 gate is unmet. The final pinned GitHub source check also returned 503 after an earlier 200 and was retried. |

## Evidence and limits

Final browser JSON reports and a bounded set of screenshots are in `evidence/browser/`; the social PNG is a required runtime asset under `public/` and `dist/`. Obsolete screenshots were replaced or removed; the four original press images and runtime assets were not optimized away. `evidence/delivery-integrity.json` records preserved hashes, manifest equality, source/build equality, path checks and byte budget. The export is 2,663,108 bytes; the complete delivery is approximately 7.17 MiB in uncompressed file bytes (5.40 MiB in a temporary gzip archive), below 8 MiB. That archive stays in `/tmp` and is not packaged with the submission. [DESIGN.md](../DESIGN.md) documents the final tokens, components and responsive behavior.

Do not treat mocked wallets as extension testing, narrow viewports as physical devices, root font enlargement as native zoom, or a passing accessibility scan as screen-reader verification. The optional hook's deployed bytecode was not independently reconstructed against its public source in this pass. Its known retirement caveat remains visible. Social preview publication and social-platform cache refresh are not performed by this local export; the PNG and absolute metadata are ready for the supplied domain.
