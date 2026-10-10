# Quantum Canary redesign — worker validation

## Scope and outcome

**Complete for the frontend scope, with a documented correction to the brief's hook-retirement guarantee.** Status, Verify and Integrate have been rebuilt; source and the production export are delivered together. The original chain reader, wallet implementation, derivation and four mascot PNGs are preserved. No contract, dependency manifest/lockfile, Foundry configuration, remapping, submodule, environment file or Git/GitHub metadata was modified.

This is a worker report, not independent certification. The task's verifier checks paths and bytes, not behavior. No transaction was broadcast on a live chain.

Consequential choices:

- Preserve `AWAITING POKE` in addition to the three requested alarm labels: a funded balance cannot arm an unobserved high-water mark by itself.
- Render only session observations in the canvas. Held segments and jagged alarm graphics are explicitly labelled; no invented historical balance or random numerical samples.
- Keep the supplied observer manifest's contract set unchanged. The separately requested community token/hook identifiers are centralized in `src/config.ts` and are not described as attested by launch 1213.
- Use a single dark theme and exactly two font families, with three small one-bit print assets derived from unchanged originals. No theme picker, trading UI, token approvals, backend or new ownership settings were added.
- Correct financial claims where the published hook source is more specific than the brief. In particular, already-accrued claims remain payable after retirement in that source. See [fund-source.md](docs/fund-source.md). The UI disables payout on a live trip or permanent retirement; this cannot stop another caller using the contract directly.

## Commands and results

Dependencies were installed with the existing lockfile into an exact source copy under `test/scratch/build/web/`. Scratch is removed before submission; the root repository never receives a generated dependency directory. Source, package manifest/lockfile, Vite config, public assets and final output were compared between the real tree and this copy. Commands below are the actual worker forms (ordinary local commands are documented in README).

| Command | Result |
| --- | --- |
| `npm ci --ignore-scripts --no-audit --no-fund --cache /tmp/qc-npm-cache` in the scratch web copy | Passed; 158 existing locked packages installed |
| `npm run build --prefix test/scratch/build/web` | Passed; TypeScript + Vite export + deployment manifest |
| `npm run typecheck --prefix test/scratch/build/web` | Passed |
| `npm test --prefix test/scratch/build/web` | Passed: 31 tests in 2 files |
| `npm run check:manifest --prefix test/scratch/build/web` | Passed: complete observer ABI hash and SHA-256 inventory, 18 assets |
| `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/root/.cache/ms-playwright/chromium-1247/chrome-linux64/chrome node test/scratch/build/web/scripts/interaction-check.mjs` | Passed: 27 interaction/design scenarios; no page errors, console errors or Axe violations |
| Same executable override, `node test/scratch/build/web/scripts/browser-check.mjs` | Passed: production public reads, fund ledger and all 5 derivation comparisons; no wallet |
| `/root/.local/share/svm/0.8.26/solc-0.8.26 --bin test/scratch/build/artifacts/browser/CanaryGuard.sol -o test/scratch/snippet-compile --overwrite` | Passed: the actual browser-copied integration example compiles |
| `PYTHONPATH=/tmp/quantum-canary-art312 python3 web/scripts/ink-art.py` | Passed: Pillow 12.3.0 generated literal one-bit PNGs; optional rebuild only |

Vite reports its advisory that the primary uncompressed JS chunk exceeds 500 kB. It is approximately 547 kB / 173 kB gzip, with the existing viem/React stack. No dependency or build configuration was changed to suppress that advisory.

`evidence/delivery-integrity.json` records the final source/export consistency, pinned handoff/network comparison, protected-path/original-art checks and conservative byte budget. The static export is 2,597,314 bytes; the complete deliverable file set, including retained browser evidence and the existing contract sources/dependencies, is approximately 7.31 MB uncompressed, below the 8,388,608-byte limit. No cache, dependency installation, old build chunk or registry archive is delivered. `evidence/browser/interaction-report.json` and `live-report.json` contain timestamps and precise observations from the final production export.

## Meaningful interactions

The production export is served under `/preview/`, exercising relative assets and hash routing. The interaction harness intercepts only the configured public RPC endpoints and supplies an injected mock wallet; all transaction payloads terminate in that fixture.

Checked:

- Public reads with no wallet, exact bounty address clipboard, payment QR and independent IMD counter.
- Missing wallet feedback, exact unknown-chain switch → add supplied network → switch sequence, connected account/chain display, and immediate gating on chain changes.
- Zero/ambiguous ETH amount rejection and focus/`aria-invalid`; exact one-wei handling in unit tests; explicit irreversible-transfer consent.
- Rejected fund and payout signatures send nothing and recover. A zero-result payout simulation sends nothing.
- Fund uses the derived address, exact ETH value and empty calldata. Poke targets the observer with zero value and the correct selector. Payout targets the configured hook with zero value and the correct selector.
- Controls lock through pending receipts and route changes. Payout success uses the receipt's actual payment event; pending and cumulative totals refresh. Retirement remains gated after a refill. The production code checks replacements and offers an explicit uncertain-confirmation retry; replacement/cancellation/timeout branches were source-reviewed, not end-to-end simulated.
- Complete hook history, pending fees and retired state. Missing log pages leave the total unavailable while preserving other reads. An immutable recipient mismatch disables payout. Unit tests cover log pages, recipient/removed-event rejection, missing historical boundary, wrong chain, missing hook code and reorgs.
- Unfunded → awaiting poke → armed → tripped → refilled; first-recorded-trip retention; red paper and original color sticker only on TRIPPED.
- Actual canvas pixel changes while scrolling, unchanged pixels while paused, and static pixels between observations under reduced motion. The exact-data table remains available.
- Terminal automatically prints all real values; 5 OK comparisons; run-again recomputes; altered getter produces a textual MISMATCH and disables transactions. Unit coverage includes rejected candidate counters, square checks, parity and packed bytes. The unchanged derivation has 40 additional seed cases.
- Runtime ABI tampering fails before wallet controls; missing observer code, stale blocks and RPC outages disable writes; retry restores reads. IMD failure does not hide ETH.

## Browser review and evidence

An available Playwright MCP browser was used to navigate the actual export, inspect screenshots and computed state, follow Status/Verify/Integrate/Money links, check keyboard focus, and inspect desktop and 390/320px layouts. Its expected tool-managed preview descriptor was absent, so a bounded foreground static preview session using the repository's existing preview server supplied `/preview/`; it was closed after review. Automated Playwright scripts separately create and close their own previews.

All three pages were checked at **1440, 768, 390 and 320 CSS pixels**, plus **200% root text enlargement at 1440px**. No page-level horizontal overflow was observed. Code and the money table intentionally scroll in named regions. A focused 320px fee-table check moved its horizontal offset from 0 to 40px with ArrowRight. There is one visible primary heading per route. Screenshots were viewed, including the red instrument, fund controls, terminal, money flow and visible keyboard focus; they were not treated as screen-reader evidence.

Delivered evidence in `evidence/browser/` (the scripts wrote temporary `artifacts/browser/` output, which was copied here because that output directory is ignored by the workspace):

- `status-1440.jpeg`, `status-390.jpeg`, `verify-1440.jpeg`, `verify-390.jpeg`, `integrate-1440.jpeg`, `integrate-390.jpeg` — representative viewport captures.
- `verify-terminal.jpeg`, `money-flow.jpeg`, `money-mobile-320.jpeg`, `fund-controls.jpeg`, `tripped-desktop.jpeg`, `keyboard-focus.jpeg` — component/state evidence, using mock observations where appropriate.
- `live-status-desktop.jpeg`, `live-verify-desktop.jpeg`, `live-report.json` — real read-only production observations, separate from fixtures.
- `axe-status.json`, `axe-verify.json`, `axe-integrate.json` — no WCAG 2 A/AA, 2.1 AA or 2.2 AA tagged violations found by Axe.
- `computed-design.json` — loaded-font result, browser-computed colors and calculated contrast pairs.

The manual MCP session encountered intermittent HTTP 403 responses from PublicNode; the configured dRPC fallback returned valid reads. These were remote RPC failures, not missing static resources. The final live browser script recorded its own errors explicitly and passed. Public RPC availability remains outside the export's control.

## Better Interface — all six domains

The pinned workflow and core principles for all six domains were read before implementation. The pinned document-web-design method was used to rewrite root DESIGN.md from final source values. These guides were treated as design knowledge within this assignment's scope.

| Domain | Coverage | Evidence / limits |
| --- | --- | --- |
| Accessibility | Checked | Native controls, labelled inputs/QR, skip link, active-route state, visible focus, keyboard activation, semantic table/definition lists, live status text, stale/error gates, reduced motion and Axe on all routes. Screen-reader sessions and physical touch devices not performed. No modal/focus-trap flow exists. |
| Layout | Checked | Full-width hero/instrument, ledger rows, documented breakpoints, 4 widths, 200% root text enlargement, scroll regions, direct hash entry and mobile fee-table hint. Native browser zoom and RTL localization not performed; English-only site. |
| Writing | Checked | Exact requested headline, threshold/arming/refill limits, public seed attribution, explicit fee currencies/recipients and speculation/direct-funding distinction, verb-led actions and recoverable errors. Corrected source/brief discrepancies are documented below. |
| Typography | Checked | Two locally loaded families, available weights, ragged display type, bounded/justified reading measures, selectable wrapping addresses/hashes, numeric stability, mobile input/terminal size and no page overflow. No pseudolocalization or additional scripts supported. |
| Colors | Checked | Semantic hex tokens, red exclusive to current TRIPPED, text/state redundancy, nine measured browser-computed text pairs with overlay lower bounds. No invented claim of pixel-perfect contrast for every antialiased glyph or artwork pixel. Single intentional dark theme; high-contrast OS combinations not manually checked. |
| UI | Checked | Square flat rules, dithered print assets, original color trip sticker, visible controls/disabled/busy states, receipt locks, chart motion/pause/static behavior, terminal rerun and copy. Native details replace custom overlays. Slow-motion animation-panel and hardware-wallet checks not performed. |

## Findings, corrections and rechecks

| Severity / domain | Source location | Evidence and correction | Recheck |
| --- | --- | --- | --- |
| Medium / layout | `src/style.css:265` | Writing-mode changed the meaning of logical inline inset and put the vertical margin label over the headline. Used a physical left offset for this physical margin annotation. | Desktop screenshot and bounding rectangle place it outside the headline. |
| Medium / writing | `src/App.tsx:66` | Hiding command-strip line breaks joined adjacent words at mobile width. Added actual separating whitespace. | 390px/320px rendered command rows. |
| Medium / accessibility | `src/Seismograph.tsx:26` | A wall-clock static reference would move the reduced-motion grid on parent rerenders. Static time now comes from the actual observed timestamp (or page-open time before data). | Canvas byte comparisons show scrolling live and stable paused/reduced frames. |
| Low / typography | `src/style.css:1530` | Narrow terminal values were 11px. Increased them to 12px while retaining wrapping and small decorative line numbers. | Mobile transcript, overflow and Axe checks. |
| Medium / layout/UI | `src/MoneyFlow.tsx:86`, `src/style.css:1645` | A narrow fee table could clip without an explicit scrolling instruction. Added a visible mobile cue and associated description; retained a keyboard-focusable scroll region. | 320px review, responsive checks and Axe. |
| High / writing | `src/MoneyFlow.tsx:91`, `docs/fund-source.md:9` | Brief's absolute no-payout-after-retirement guarantee contradicts public launch source/README. State the old-claims exception explicitly and link the fixed source; UI independently blocks retired/tripped payouts. | Rendered copy, source review, retired-after-refill and payout tests. Deployed hook/source bytecode equivalence remains unverified. |
| Medium / writing | `src/MoneyFlow.tsx:92` | Requested 1 ETH example uses both rates on the original gross amount; public hook reserves 1% first. Label the requested example as headline-rate illustration and state exact pool-input calculation beside it. | Source arithmetic and rendered worked example reviewed; no trade quote or swap simulated. |
| Low / UI | `scripts/ink-art.py:12` | Threshold-only CSS would not produce true dithering. Created 1-bit error-diffusion copies without changing originals. | PNG format check, byte comparison of originals, visual inspection of printed logo/art. |
| Low / accessibility | `src/style.css:1170` | An indefinite decorative blink has no separate pause control. Limit it to four cycles/five seconds; reduced motion disables it. | Source duration/count and computed reduced-motion animation check. |

No unresolved observed interface defect blocks the assigned frontend flows. The contract-source discrepancy is not represented as repaired on chain.

## Measured contrast

From browser-computed tokens, standard sRGB relative luminance:

| Foreground / background | Flat ratio | Conservative lower bound with 12% dark overlay |
| --- | ---: | ---: |
| Working green / page | 14.28 | 10.94 |
| Muted / page | 8.95 | 6.97 |
| Bone / page | 14.66 | 11.23 |
| Muted / surface | 8.53 | 6.65 |
| Working green / surface | 13.62 | 10.43 |
| Alarm yellow / surface | 14.19 | 10.86 |
| Trip ink / trip paper | 9.68 | 7.47 |
| Primary button dark text / green fill | 14.28 | 10.94 |
| Focus / page | 14.66 | 11.23 |

The lower bound darkens only the lighter member by the overlay's maximum opacity, leaving the darker member unchanged; this is conservative, not an invented screenshot pixel measurement. Artwork, antialiasing and all forced-color combinations are not covered by these ratios. The faint decorative grid is not the sole representation of any value; exact data is accessible in text.

## Remaining limits

- No live funding, poke, payout, swap, token approval, factory fee claim or deployment was performed. Funded transactions use mocks only. Real wallet extensions, hardware wallets, mobile wallet in-app browsers, RPC failover under every provider error, every receipt replacement/cancellation/timeout branch and chain reorganizations in the browser remain untested beyond described source/unit coverage.
- The optional hook is not in the observer attestation. Code presence and recipient/getter bindings were checked, but exact public-source/deployed-bytecode equivalence was not established. Source behavior permits paying old claims after retirement; the UI guard cannot constrain other callers. No false immutable guarantee is advertised.
- Platform supply allocation, locked factory liquidity and 80/20 split are facts supplied by the requester. No factory/payer address was invented, and that factory policy was not independently exercised.
- Historical log access can fail or grow slow. The UI never labels a partial total as lifetime paid ETH. Latest-block observations may reorganize after display; use suitable finality in an integration.
- Screen-reader sessions, native 200% browser zoom, physical devices, RTL/pseudolocalization and manual forced-colors review were not performed. Axe passing is not a claim of complete accessibility conformance.
- The ENS site name is provided, but no canonical HTTPS gateway is given. An absolute social-preview image remains intentionally unset. No social links were added.
- Git metadata is prohibited by the assignment. Files are prepared in the working tree for its submission process; this worker did not run `git add` or `git commit`.

Licenses/attribution: Better Interface (Jakub Krehel, MIT), Impeccable documentation method (Paul Bakaus, Apache-2.0), and eth-frontend-ux (Austin Griffith, MIT) are retained in `docs/licenses/`.
