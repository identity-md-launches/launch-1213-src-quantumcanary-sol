# Quantum Canary — worker validation

## Scope and result

Implementation and local validation are complete for the three-page frontend. The final production export is `dist/`, with a relative Vite base and hash routes, served for checks under a real `/preview/` subpath. Source, npm manifest/lockfile, complete runtime assets, the ABI, and the deployment manifest are present. The original Solidity tree and its protected build/dependency files were not changed.

**Submission limitation:** this environment mounts `.git/` read-only. `git add ... && git commit ...` failed at creation of `.git/index.lock` with “Read-only file system.” No local commit or final Git bundle could be created. Files are prepared for the worker's automatic submission commit. No permission escalation or configuration change was attempted.

These are worker-side results, not independent verifier certification, an audit, or proof of future chain behavior.

## Consequential assumptions

- Dark-only design follows the explicit brief; no unused theme switch was added. Content is English only. RTL/localization and light-theme variants are not in scope.
- Reads never require a wallet. Transactions use an optional injected EIP-1193 browser wallet; no WalletConnect project identifier was supplied.
- Public RPC URLs, chain and contract/IMD addresses come from the supplied handoff/network. The canary address and phrase are read from the observer, not substituted from examples.
- A funded-but-unarmed state is explicitly **AWAITING POKE**. This is necessary because a balance of 1 ETH alone does not establish the observed high-water mark.
- The trace shows observed blocks from this tab's current session, not historical/realtime-complete surveillance. Amounts are token-denominated; no USD price source was supplied.
- The source GitHub link comes from the project handoff. The working IMD launch record is the original job detail at `https://explorer.imd.fun/jobs/ffb47362-cdd3-498f-8c1c-911c27666c35`; a guessed `/launch/1213` URL returned 404 and was replaced.

## Commands and outcomes

Executed on 2026-10-09/10 UTC, Node 22.23.3:

| Check | Outcome |
| --- | --- |
| `forge inspect src/QuantumCanary.sol:QuantumCanary abi --json --offline` | Complete ABI exported from unchanged source; canonical Keccak matches handoff |
| `npm ci --offline --cache /tmp/quantum-canary-npm --no-audit --no-fund` in `web/` | Passed; 157 packages installed from the populated cache without registry access |
| `npm run typecheck --prefix web` | Passed, TypeScript strict mode |
| `npm run test --prefix web` | Passed, 21 tests |
| `npm run build --prefix web` | Passed; Vite static export plus manifest generation |
| `npm run check:manifest --prefix web` | Passed; complete handoff equality, ABI hash and all 17 export-asset hashes |
| `PLAYWRIGHT_BROWSERS_PATH=/tmp/quantum-canary-browsers node web/scripts/interaction-check.mjs` | Passed, 21 grouped interaction/rendering checks; no JavaScript errors or console errors |
| `PLAYWRIGHT_BROWSERS_PATH=/tmp/quantum-canary-browsers node web/scripts/browser-check.mjs` | Passed, live public-RPC reads and all five derivation comparisons; no browser resource/console failures |
| `python3 scripts/verify_canary.py` | Passed; independent existing Python verifier reproduces the browser's point and address |
| `forge build --root test/scratch/snippet --offline` | The Solidity snippet extracted from the rendered page compiled with Solc 0.8.26 |
| Byte equality/SHA-256 for all four PNGs | Source and export exactly match all supplied input hashes |
| Protected tracked-file diff | Empty for `foundry.toml`, `foundry.lock`, `remappings.txt`, `.gitmodules`, `lib/`, `src/`, `test/`, `.gitignore` |

Vite reports an advisory for the 526.20 kB uncompressed main JS chunk (166.28 kB gzip); this is not a failed build. Font imports were narrowed to the three used Latin weights. The extracted Solidity example produces a lint advisory on a `bytes20` cast; its input literal is exactly 20 bytes, with no truncation, and compilation succeeded.

The final export is 2,590,952 bytes including its manifest. The candidate complete source tree, including the inherited contracts/libraries, source images and export, is approximately 5.45 MiB of uncompressed file bytes, below the 8 MiB cap even before compression. The exact final Git bundle size cannot be measured without the worker's commit. Dependencies, caches, screenshots, downloaded reference-page HTML and browser binaries are excluded from the submitted source; runtime images and font/license files remain complete.

## Live-chain evidence

The final live browser run began at 2026-10-10 00:00:27 UTC. At Ethereum block **26158302** it displayed 0 ETH and NOT YET FUNDED; all five browser-derived values matched the contract. The snapshot loader checked chain 1, nonempty observer code and an ordinary canary account, then read all contract fields, the native balance and IMD at the same block number. IMD displayed 0 in live status checks. These observations are time-specific, not current-balance guarantees.

The independent public RPC check also returned chain ID `0x1` and nonempty observer bytecode. No wallet was connected in live tests. No bounty, poke, token approval, or other transaction was broadcast.

Browser evidence is generated under `artifacts/browser/`, intentionally outside the source bundle. `live-report.json` records the exact run/block; `interaction-report.json` records mock scenarios. `status-desktop.png` and `verify-desktop.png` are live captures from the final read-only run. The numbered `status-1440.png`, `status-390.png`, `verify-1440.png`, `verify-390.png`, `integrate-1440.png`, `integrate-390.png`, `tripped-desktop.png` and `keyboard-focus.png` are mock-state rendering evidence. Mock balances/trips are not claims about mainnet.

## Meaningful interaction coverage

The browser script starts and closes its own foreground HTTP server and Chromium 141.0.7390.37. The assigned browser connector returned `Transport closed`; local Playwright was used successfully instead. No persistent preview server remains.

The mocked checks cover:

1. Disconnected public reads, quantum-locked IMD, generated payment QR, and exact clipboard recipient.
2. Missing-wallet explanation and recovery.
3. Browser re-derivation and all five green comparisons; a tampered coordinate produces a red mismatch and failed verification.
4. Reduced-motion disabling of staged animations.
5. All routes at 1440, 768, 390 and 320 CSS-pixel widths, one visible H1, no page horizontal overflow.
6. Axe WCAG 2 A/AA, 2.1 AA and 2.2 AA tags on all routes: zero violations after the markup correction.
7. 200% root-font text enlargement on all routes; skip link preserves the current route.
8. Local font load and browser-computed semantic colors.
9. Keyboard activation of navigation and the skip link; visible focus screenshot inspected.
10. Pause/resume trace; unfunded → awaiting poke → armed → tripped → refilled, retaining the first recorded trip.
11. Wallet switch returning 4902, exact supplied add-chain request, successful switch retry.
12. Invalid ETH amount, explicit irreversible-transfer consent, rejected signature, and re-enabled control with no broadcast.
13. Exact mocked donation destination/value/no calldata; controls remain locked while awaiting receipt and across route changes.
14. Exact mocked poke destination/selector/zero value; receipt confirmation refreshes the mark and ARMED state.
15. Connected wallet chain changes, stale block timestamps, RPC outage/retry, independent IMD failure, missing observer code, and tampered ABI hash.

The 21 Vitest cases independently exercise the pinned derivation vector, 40 additional seeds including rejected candidates, conventional ABI encoding equivalence, even-y curve membership, exact seed bytes, alarm boundaries, ABI binding, decimal validation and wallet add-chain/rejection logic.

## Better Interface — six-domain review

| Domain | Coverage | Findings fixed / evidence | Limitations |
| --- | --- | --- | --- |
| Accessibility | Checked | Native controls, labels, landmarks, one visible H1, skip link, invalid-input focus, visible focus, non-color statuses, reduced motion; three-route Axe scan | No actual screen reader, native 200% browser zoom, physical touch device or forced-colors browser session |
| Layout | Checked | Desktop/mobile screenshots, 320px reflow, intermediate 768px breakpoint, 200% text enlargement, address and code wrapping | English only; no RTL/localization stress test |
| Writing | Checked | Funding irreversibility, correct observer/bounty distinction, honest empty/stale/error labels, actionable wallet errors, observed-mark arming and refill semantics | No separate user comprehension study |
| Typography | Checked | Local IBM Plex Mono load, heading hierarchy, numeric tabularity, full selectable hashes, adjusted SVG labels and address wrapping | Small instrument metadata is intentionally denser than body text; mobile font rendering on physical devices untested |
| Colors | Checked | Semantic source tokens, browser-computed values, flat-pair contrast calculations, Axe contrast results, textual success/error labels | No claim of pixelwise contrast certification over the hero illustration or every animation frame |
| UI | Checked | Hover/focus/disabled/loading/error/empty states, receipt locking, form consent, explicit chart pause, four-step motion and reduced-motion override | Animation not replayed in a native DevTools panel at 10% speed; real wallet extension UI untested |

### Findings, disposition and rechecks

| Severity | Source | Observed issue | Correction and recheck |
| --- | --- | --- | --- |
| High | `web/src/components.tsx:27` | Axe reported a serious `definition-list` failure because the metric hint was a sibling of the term/value pair | Moved the hint into `dd`; all three final Axe scans pass |
| Medium | `web/src/App.tsx:36` | Source review found the skip anchor could change Verify/Integrate to Status through the hash handler | Focus the main landmark without route change; Integrate keyboard test passes |
| Medium | `web/src/Actions.tsx:95` | Connect/switch controls inside the amount form had implicit submit behavior | Explicit `type="button"`; wallet/amount flow tests pass |
| Medium | `web/src/Actions.tsx:38` | Source review found a wallet cancellation/replacement could otherwise be mistaken for the requested confirmed action | Handle replacement hash and inspect the actual confirmed recipient, amount and calldata; normal confirmation paths rechecked with mocks; real replacements remain untested |
| Medium | `web/src/config.ts:14` | Initial guessed launch URL returned a real 404 | Linked the reachable original launch job record; HTTP page identifies QuantumCanary |
| Low | `web/src/style.css:126` | Rendered donation address wrapped its last character beside the copy button | Placed the copy action below the full address; final desktop/mobile screenshots inspected |
| Low | `web/src/style.css:296` | SVG threshold annotation became too small when scaled to a phone width | Increased its mobile SVG font size; mobile layout rechecked |
| Low | `web/src/App.tsx:49` | First-recorded-trip fields initially required opening details | Added both fields to the always-visible Status summary; lifecycle checks pass |

No unresolved observed primary-flow failure remains. The main JS chunk advisory, Git commit restriction, browser/real-chain limitations and publication metadata follow-up remain documented.

## Measured colors and remaining limits

Computed source/browser token pairs: primary text/page 16.17:1; muted text/page 8.41:1; muted text/panel 7.93:1; muted text/banner 7.32:1; yellow/page 15.44:1; green/panel 13.65:1; error/banner 9.16:1; dark text/yellow button 15.44:1; focus yellow/panel 14.55:1. These exceed the applicable 4.5:1 normal-text or 3:1 nontext-focus baseline for these flat pairs. The focus rectangle was also viewed in the rendered screenshot. This does not claim complete accessibility conformance.

No mainnet writes, gas-payment behavior, physical QR camera scan, native wallet extension, WalletConnect, replacement/cancellation/reorg on a real chain, publishing/IPFS naming, screen-reader session or real-device browser was tested. Transaction receipt uncertainty has an explicit locked/check-confirmation path but the two-minute timeout was not waited out in the browser suite. Pending state is tab-local and is not restored after a full reload; the README tells operators to consult wallet/explorer history before resubmitting. The snippet is a compilable integration example, not an audited vault implementation.

No final hosting hostname was supplied, so absolute social-card/canonical URLs remain a publication follow-up. All assets required for the static site, including the four provided PNGs and fonts, are local. The publisher's path/hash checks do not independently validate any browser behavior described here.
