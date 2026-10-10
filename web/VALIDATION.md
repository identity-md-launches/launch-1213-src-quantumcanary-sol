# Quantum Canary addition-pass validation

This is a worker report, not independent certification. The requested frontend additions and local behavior checks are complete. **The all-external-links-return-200 acceptance gate remains unmet:** 12 of 31 requested destinations returned 200; DexScreener and 18 Etherscan destinations returned 403 after retries. Every URL and result is listed in [LINKS.md](LINKS.md). No required URL was substituted or removed.

## Scope and implementation

Preserved the existing static Vite/React/TypeScript app, design tokens, fonts, three hash routes, chart, wallet/transaction behavior, statement and existing copy. Additions are limited to live public-key blocks on Status/Integrate, the transcript key line, the six-step construction, the exact copyable AI prompt, the three-line swap recap, the specified market/social links, and shared Twitter metadata. Existing Verify sections were renumbered to accommodate the two inserted sections. No contracts were changed or deployed, and no dependency/build configuration or ignore file was changed.

The additions consume the existing single-block `Snapshot`; they neither create a second reader nor hard-code expected getter values. The encoder pads both coordinates to 32 bytes, prepends 04 for the uncompressed key and selects 02/03 from actual y parity for compression. The prompt interpolates the sentence/hash/counter/x/y/address on every render, with deployment and explorer identifiers from the runtime configuration. The prescribed punctuation remains verbatim, including the template's period after the exact sentence (which itself ends in a period). The live sentence is 101 ASCII bytes, as specified. Missing reads have no key or copyable placeholder prompt; stale/unverified results are labelled alongside the retained values.

## Commands and results

Node 24.21.0; unchanged pinned npm lockfile; Chromium headless shell 153.0.8010.12. Installation and all package commands ran in the isolated `/tmp/quantum-canary-addition/web/` mirror. The final source, entry HTML, package/lockfile, configuration, public assets, tests and scripts were compared to this mirror. Dependency trees/cache remain outside the repository. The supplied MCP browser tool failed because `/opt/google/chrome/chrome` is absent; the standard full Chromium executable also failed at crashpad initialization. The installed headless-shell executable successfully ran the actual production export via the scripts' bounded `/preview/` servers.

| Check | Result |
| --- | --- |
| `npm ci --cache /tmp/quantum-canary-npm-cache` | Pass with existing lockfile; npm reported 6 audit vulnerabilities in the unchanged dependency tree (2 moderate, 2 high, 2 critical). Dependencies are outside this task's modification budget. |
| `npm run typecheck` | Pass |
| `npm test` | Pass: 51 tests across 4 files |
| `npm run build` | Pass; relative-base production export generated; existing >500 kB chunk advisory only |
| `npm run check:manifest` | Pass; 1 attested contract, 19 exported assets, canonical ABI Keccak and final SHA-256 hashes verified |
| `forge inspect QuantumCanary abi --json` and canonical comparison | Pass; derived ABI equals the retained ABI and handoff hash `e3815bb0169ff5135066bea81d1deecbb0766c9ba91f4f79b98c712e8b730442`; Solidity source matches pinned commit `d620a4c5747e5ed64ab2db2573ef69eb1b02652a` |
| `node scripts/interaction-check.mjs` with installed headless shell | Pass: 37 interaction groups, no JavaScript/console failures; mocked RPC and injected wallet, no real broadcasts |
| `node scripts/browser-check.mjs` with installed headless shell | Pass: 6 live-read groups, no JavaScript/console/resource failures; real public mainnet reads, no wallet |
| `python3 scripts/link-check.py` | Completed with exit 1: 12 HTTP 200, 19 HTTP 403. The earlier unbounded urllib run ended without a report; the delivered checker uses curl with hard per-request timeouts. |
| `git diff --check` and delivery audit | Pass; see `evidence/delivery-integrity.json` for export bytes, input equality, protected-path checks and file budget |

The final build produced the same asset names/bytes as the export exercised by browser checks. `dist/imd-deployment.json` remains the runtime source of the observer address, chain, ABI paths and public RPCs. The pinned deployment/network source copies match byte-for-byte; the output's network and wallet-add-chain objects match unchanged. Every other exported file is inventoried; the manifest contains only permitted keys. No swap, quote, token approval or liquidity flow was added.

## Meaningful interaction coverage

New tests verify 65/33-byte lengths, coordinate padding, even and odd compression roots, the transcript's immediate key-after-address position, the exact sentence and all expected prompt values. A second fixture changes every getter to establish that the prompt does not silently recompute or substitute pinned values.

Production-browser checks copy both encodings on Status and Integrate, compare exact clipboard bytes, activate the AI copy button with the keyboard and simulate denied clipboard access with manual-selection recovery. They assert the six live value lines, insertion order, all requested hrefs and Twitter metadata on every route. Changed RPC x updates the key/construction/prompt while showing an unverified observation. Initial read failure shows no fabricated key or copyable prompt; recovery populates them. Stale data is explicitly marked.

Regression checks retain public reads, missing wallet, connection, wrong chain, exact `wallet_switchEthereumChain` → 4902 → unchanged `wallet_addEthereumChain` → switch, amount validation, consent, wallet rejection, exact transfer/poke/payout destinations and payloads, pending locks across navigation, confirmations, simulation/no-payment gates, retired/tripped/stale gates, ABI tampering, missing code, RPC retry, oracle/pool failure isolation, payout history, press downloads, QR, chart pause/reduced motion and all five terminal comparisons. An initial test run found an ambiguous `.code-panel pre` locator after adding the prompt; it now selects the Solidity example by its accessible name, and the entire suite passes.

Live verification at block 26,163,820 (2026-10-10 18:26:59 UTC) matched the supplied x/y point and all five locally recomputed values. It showed a 1 ETH threshold, an unarmed canary with approximately 0.060847 ETH, eight actual hook payout events, and valid independent market/oracle reads. See the timestamped `live-report.json` for exact observations, getter lines and full rendered AI prompt. No real wallet was connected; no write was signed, submitted or simulated against mainnet. Actual extension/device/funded transaction behavior is untested.

## Better Interface review

Read the pinned workflow, all six core domains and documentation method; also applied the pinned eth-frontend-ux guide within the existing site and the task's precedence. The supported interface remains English, dark-only and static-hosted.

| Domain | Coverage and evidence | Limitations |
| --- | --- | --- |
| Accessibility — Checked | Native labelled sections, definition lists, ordered steps, named copy buttons with announced results, selectable prompt, focusable pre, unchanged skip link. Clipboard keyboard path and failure recovery. Axe WCAG 2 A/AA, 2.1 AA and 2.2 AA scans pass on all three routes. | No screen-reader session, physical touch device, browser-native zoom or exhaustive forced-colors session. |
| Layout — Checked | All routes at 1440, 768, 390 and 320 CSS px; no document overflow. Long keys/prompt URLs wrap; Status insertion precedes QR; Integrate compact variant stays with observer. 200% root text enlargement reflows. Desktop/mobile screenshots viewed. | Text enlargement is not native browser zoom. No localized/RTL product variants exist. |
| Writing — Checked | Requested copy/prompt preserved; each step pairs one explanatory sentence with actual values. Descriptive market/source/social links, precise copy labels and loading/stale/unverified states. Existing assumption caveats remain. | The two requested short answers are intentionally simplified; the existing detailed limits remain below. External availability cannot be guaranteed. |
| Typography — Checked | Local Anton 400 and Plex Mono 400/600 loaded. Existing display hierarchy and 13px data role retained; 75ch construction prose, natural narrow wrapping, no truncated hex or added visual newline in copied prompt. | Native mobile font rendering, Safari and Firefox untested. |
| Colors — Checked | Existing semantic tokens reused; computed browser colors measured for 9 pairs. New key/step ink on page is 14.28:1, prompt ink on surface 13.62:1, muted labels on page 8.95:1; conservative 12% overlay bounds remain above 4.5:1. | Token/background measurements are not claims about every antialiased pixel. Single dark theme only. |
| UI — Checked | Existing flat rules, native copy control, loading/no-data, copied/error, stale/unverified, reduced-motion terminal and chart states exercised. Added blocks have no new animation or wallet requirements. | No hardware-wallet/extension testing or 10%-speed DevTools animation replay. |

### Findings, fixes and rechecks

| Severity / source | Finding and correction | Evidence |
| --- | --- | --- |
| Medium — `src/Actions.tsx:105`, `src/Integrate.tsx:11` | Address-only surfaces concealed the public point from readers. Shared `PublicKey` now exposes both SEC 1 encodings and separate x/y with copy controls; compact copy on Integrate. | Live expected-key match, both route clipboard checks and desktop/mobile screenshot inspection. |
| Medium — `src/VerificationGuide.tsx:10`, `src/Verify.tsx:49` | The existing terminal lacked the requested plain construction and uncompressed-key line. Added the six numbered steps and immediate key row, retaining the original computation and comparisons. | Six getter assertions, transcript sequence test, 5/5 live comparisons. |
| Medium — `src/VerificationGuide.tsx:31`, `src/PublicKey.tsx:6` | A static prompt/key could be mistaken for live verified state. Getter interpolation and local observation notes avoid pinned fallback values and identify stale/unverified reads. | Initial-outage, changed-getter and stale browser cases; dynamic prompt unit test. |
| Medium — `src/style.css:666`, `src/style.css:733` | 132-character keys and long prompt URLs require narrow-width treatment. Scoped wrapping, natural-height rows, wrapping panel header and full selectable content prevent clipping. | 320px screenshots, four-width overflow checks and 200% text enlargement; no global layout/token changes. |
| Low — `scripts/interaction-check.mjs` | The added second code panel made the old generic pre selector ambiguous. Scoped the test to its existing accessible name. | Full 37-group rerun passes. |
| Remaining external limitation — `src/config.ts:31` and runtime explorer links | DexScreener plus 18 Etherscan destinations return 403 even after retry. The requested destinations remain unchanged. | Completed 31-URL report; all-200 gate remains unmet. |

## Evidence, size and remaining limits

Current JSON reports and a bounded set of reviewed screenshots are under `evidence/browser/`. Images whose filenames start `addition-` use mocked contract state; `live-` additions use actual Ethereum reads. Mobile full-viewport screenshots supplement tall element captures; no screenshot is described as a physical-device test. Redundant prior screenshots were removed to retain a compact complete submission. The four original press PNGs, social preview and all runtime assets remain intact in source/export. Root [DESIGN.md](../DESIGN.md) documents the final source-derived tokens, typography, components and responsive behavior.

The export is 2,672,501 bytes. The final full delivery budget is audited in `evidence/delivery-integrity.json` against 8,388,608 bytes; dependencies, registry archives and caches are absent, with no ignore-file changes or submodules. This is a local source/export delivery, not a deployment or publication. Social caches, optional hook bytecode reconstruction, native-wallet confirmations and live funded actions remain untested. No failure of an external URL was relabelled as a successful check.
