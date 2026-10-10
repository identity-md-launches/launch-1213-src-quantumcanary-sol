# Quantum Canary design

## Overview

A cold, dense public instrument for donors, independent verifiers and contract integrators. The site reads like a technical dispatch: a large ragged headline, numbered sections, justified reading columns, ledgers, shell commands and a terminal transcript. Its tone is direct about the alarm, money flow and limits of observation. The Status headline uses the requested wording. This is deliberately a single dark theme.

There are three hash-routed pages. Status carries the balance instrument, direct funding, poke, optional community fund, PGP-style statement and section 06 provenance. Verify explains the construction in six steps, prints the browser derivation and provides a copyable AI verification prompt. Integrate presents the observer interface, compact public key and a permanent-latch example. The shared shell is a document, not a grid of cards. The app has no eyebrow labels, split copy/picture hero, glow, blur or rounded surfaces.

Source of truth: `web/src/style.css`, `App.tsx`, `components.tsx`, `Seismograph.tsx`, `Verify.tsx`, `Actions.tsx`, `MoneyFlow.tsx`, `Provenance.tsx`, `market-chain.ts`, `useMarket.ts`, `PublicKey.tsx`, `VerificationGuide.tsx` and `Integrate.tsx`. Browser evidence and limitations are recorded in `web/VALIDATION.md`.

## Colors

The canonical CSS tokens are hex values in `web/src/style.css:root`:

| Token | Value | Use |
| --- | --- | --- |
| `--bg` | `#090e0b` | Near-black page and inputs |
| `--surface` | `#0d1510` | Strip paper, transcript and code |
| `--hover` | `#1a2c20` | Hover controls and comparison rows |
| `--text` | `#a6edb6` | Phosphor green working text, headlines, controls |
| `--muted` | `#a0b5a6` | Secondary text, measurement metadata |
| `--reading` | `#e2e0d2` | Bone reading text, notices and mismatch text |
| `--line` | `#355340` | Structural rules |
| `--control` | `#72967d` | Control boundaries and important side rules |
| `--alarm` | `#eee56b` | Alarm concept, threshold line, principal ETH balance |
| `--trip` | `#ffb1a8` | TRIPPED ink only |
| `--trip-bg` | `#361210` | TRIPPED paper only |
| `--focus` | `#e2e0d2` | Keyboard focus perimeter |

Yellow never denotes routine calls to action or every metric. Red does not denote generic wallet errors or a derivation mismatch; those use bone text and an explicit label. The single most prominent number is the canary ETH balance. Status always includes text, never color alone.

The canvas paint palette in `Seismograph.tsx` matches these tokens; faint grid ink is `#27422f`, or `#653028` on tripped paper. Hex-dump texture is decorative `#204329` at 40% opacity. All nine tested text pairs exceed 4.5:1, including conservative 12% overlay attenuation. Measured examples: working text/page 14.28:1; bone/page 14.66:1; muted/surface 8.53:1; tripped ink/paper 9.68:1. See the recorded computed values rather than treating these numbers as a claim about every antialiased pixel.

## Typography

Exactly two families are loaded locally:

- **IBM Plex Mono**, regular 400 and semibold 600, with monospace fallback. WOFF2 is bundled from the existing `@fontsource/ibm-plex-mono` dependency. Body, data, code, navigation and controls use it. Numeric data uses tabular figures. Synthetic weights/styles are disabled.
- **Anton**, regular 400, then Arial Narrow/sans-serif fallback. `web/public/fonts/anton-latin-400.woff2` supplies display headlines and the rotated margin annotation. Anton's OFL is in `public/licenses/Anton-OFL.txt`.

The root is 16px with 1.65 body line height. Reading passages use 14–16px by role; most instrument/control text is 12–14px. Main Status type is `clamp(3.15rem, 7.6vw, 6.8rem)`, 1.08 leading, −0.015em tracking; the narrowest breakpoint uses 3.15rem/1.12. Page introductions use `clamp(3.5rem, 8vw, 7rem)` and mobile overrides. Section headings use `clamp(2rem, 4.1vw, 3.2rem)` at 1.18 leading; subsection headings are Plex Mono 1.0625rem/600. Real section numbers are inline with headings, not eyebrow text.

Display headings are left aligned, uppercase through CSS, and deliberately ragged. Long-form reading measures cap at 66ch; print-like two-column passages are justified with hyphenation on desktop. They become left-aligned single columns below 48rem. Addresses/hashes wrap at any character, remain selectable, and are never irretrievably truncated. Solidity/ABI code keeps indentation in keyboard-scrollable preformatted areas. The AI prompt uses `white-space: pre-wrap` and `overflow-wrap: anywhere` so its exact copyable text reflows within the existing code panel; the clipboard adds no visual line breaks. Public-key data uses `--small-size` (13px), selectable full-length hex and the inherited 1.65 line height. Construction prose is capped at 75ch; each actual getter value is a separate block line. Added USD values use `.usd-value` at .8125rem/1.65 in the existing muted token with tabular digits. Token identity and payout rows use the existing small text sizes; no typeface was added. Inputs remain 16px on mobile. The mobile terminal is 12px; decorative line numbers can be smaller.

## Layout

`.document-shell` is at most 1280px wide with 64px inline padding; at 100rem and above it becomes 1400px/80px. Standard section spacing is 3rem, reduced to 2.25rem on mobile. Within-group gaps use .5rem, .75rem, 1rem and 1.5rem; columns use 2–3rem. One continuous set of ruled sections carries hierarchy.

The header is in normal flow. Navigation wraps instead of opening a menu. The Status hero is full width; the tiny vertical margin annotation occupies the outer margin, never a second hero column. The hero's reading passage uses newspaper columns. The strip chart spans the document and has a fixed 228px drawing height; its heading/caption can wrap.

The three shell commands form a horizontal ruled strip. Below 30rem they become three horizontal rows. Funding uses two editorial columns above 48rem and one below it. Metrics and fee readouts are ledger rows; they become stacked term/value rows below 30rem. The flow table has a labelled, keyboard-focusable horizontal scroll region on narrow displays; the page itself does not scroll horizontally. ABI/Solidity areas scroll independently. Section 04 preserves the headline/explanation columns, with a 64px dithered logo and token identity directly below the corrected headline in DOM order. Below 48rem it stacks before the original explanatory paragraphs with a 1.5rem gap. The mid-price definition list reuses `Field`; the payout table stays within the page with 33%/34%/33% block/amount/transaction columns and wrapping exact amounts. Provenance is a native ordered list followed by the existing reading columns. Footer links and the four press downloads wrap naturally, including DexScreener, Uniswap and X. The Status public key sits immediately after the bounty address and before the existing QR inside the funding column; Integrate places its compact counterpart immediately after the observer address. Public-key rows wrap the copy buttons below values when needed, with .75rem gaps and no fixed value width. The compact variant uses 1rem block padding and .75rem between rows instead of 1.25rem. Construction is a native ordered list with 2rem inset, .5rem item padding and 1.5rem item gaps. The AI panel header wraps without shrinking the copy target.

Breakpoints in source: 100rem, 68rem, 48rem and 30rem. Shell padding steps from 80/64px to 40px, 24px and 16px. The network label hides below 68rem, the margin annotation below 48rem. Tested browser widths: 1440, 768, 390 and 320 CSS pixels; all three routes reflowed. 200% root text enlargement was checked separately from native browser zoom.

## Elevation & Depth

Everything is flat. Solid/dashed rules denote sections, controls, code and the statement. There are no shadows, glass layers or gradients used as glows. A fixed, pointer-transparent `body::after` overlays subtle CRT scanlines and a vignette at 12% opacity. The overlay is decorative and disabled in forced-colors/print. The hero's background hex dump uses the actual read seed hash and is hidden from assistive technology.

## Shapes

`--radius: 0px` is used by buttons and inputs. All surfaces and data rows have square corners. The statement uses a dashed border, code and the instrument use thin solid rules, and redaction bars are text glyphs with a readable description. No rounded card component exists.

The four original mascot PNGs stay intact. `public/art/ink/{logo,mascot,hero}.png` are literal one-bit Floyd–Steinberg prints, sized 128, 320 and 360 pixels and made by `scripts/ink-art.py`. The header, funding margin and statement use those versions. `.ink-art` uses screen blending and 82% opacity. The original full-color `sticker.png` is reserved for an actual, current TRIPPED banner. The payment QR keeps a high-contrast quiet zone.

## Components

- **Shell / numbered sections — `App.tsx`, `.numbered-section`:** one visible main heading per route; inline real section numbers; skip link; active navigation underlined and bracketed. Hash section links scroll/focus funding, watch, money and footnotes. No sticky overlay obscures targets.
- **Controls — `.button`, `.text-button`:** 44px minimum principal targets, 40px for the instrument's text control. Primary transaction steps use green fill/black text. Peers are outlined or underlined. Hover is immediate; focus uses a two-pixel bone outline offset four pixels; disabled states remain labelled. Native buttons, links, inputs and details provide semantics.
- **`AddressValue`, `Copy`, `QR`, `Field` — `components.tsx`:** full copyable/explorer-linked addresses; announced copy result/failure; an Ethereum payment URI containing chain ID but no prefilled amount; semantic definition-list rows. Snapshot unavailability is an em dash, never a fabricated zero.
- **`PublicKey`, `ObservationNote` — `PublicKey.tsx`:** shared semantic key definition list with both SEC 1 encodings and separate x/y rows, built only from `Snapshot.pubKeyX/pubKeyY`. `compact` shortens the explanation and spacing on Integrate. Each encoding has the existing `Copy` button and announced success/manual-selection recovery. No value/copy button is substituted during initial loading; block, stale and unverified notes accompany retained data. Horizontal rules use `--line`; copy controls inherit existing styles.
- **`Construction`, `VerifyWithAI` — `VerificationGuide.tsx`:** numbered Verify sections 01 and 03 surround the existing terminal (02); the unchanged sentence/assumptions sections become 04/05. Six native list items pair one sentence with an actual getter line, followed by the two requested answers. The prompt uses the existing `.code-panel`/`.code-heading`, a selectable labelled `pre`, `Copy`, and the GitHub source link. Exact prompt interpolation uses live getters and runtime deployment configuration, without a wallet or fallback values. Full prompt content is always visible and wraps on narrow screens.
- **Swap recap — `MoneyFlow.tsx`, `.swap-recap`:** a three-item ordered list using the current reading text and spacing, immediately before the existing fee-route explanation/table; it adds no trade controls.
- **`SignalBanner` — `App.tsx`:** named UNAVAILABLE/NOT CURRENT, NOT YET FUNDED, AWAITING POKE, ARMED and TRIPPED states. `AWAITING POKE` preserves the deployed observer's arming requirement. Only current TRIPPED uses red and the color sticker.
- **`Seismograph` — `Seismograph.tsx`:** observed stepped balance, UTC grid, real threshold, pause/resume, static reduced-motion rendering and an exact-data table. Scroll is capped near 25fps and stops when hidden/inactive/stale. Jagged alarm marks are labelled as alarm graphics, not fabricated observations.
- **Funding/poke/payout — `Actions.tsx`, `MoneyFlow.tsx`:** amount review, irreversible-transfer consent, fresh-read/simulation gates, independent pending and receipt states, persistent recoverable errors and explorer receipts. The payout policy is stricter than the published hook: this UI disables it after trip or retirement. Read `web/docs/fund-source.md` for the material distinction.
- **Terminal — `Verify.tsx`:** 65ms line-by-line output from the unchanged derivation; five textual OK/MISMATCH comparisons, whole-transcript copy, run-again command, observation block and staleness. One uncompressed-key line follows the computed address. Reduced motion prints immediately. The decorative cursor blinks four times over five seconds and then stops; reduced motion disables blinking entirely.
- **USD and market reads — `components.tsx`, `MoneyFlow.tsx`:** `UsdValue` adds subdued dollar context without changing the native amount hierarchy. No figure renders when the oracle is missing, invalid or stale. `Pool mid price` and fixed-supply FDV reuse `Field`; failure is plain secondary text and does not change the alarm. No price chart or trading surface is added.
- **Hook payouts — `MoneyFlow.tsx`, `.payout-table`:** a semantic table with a caption, column headers, exact ETH, block and named Etherscan links, newest 20 first. Plain text distinguishes empty, unavailable and last-known data. The direct-donation boundary is always visible.
- **Provenance — `Provenance.tsx`, `.build-jobs`:** section 06 follows the statement. Three native numbered items link to public jobs; source repositories and the audit/build account follow in the same document typography.
- **Press and social — `App.tsx`, `web/index.html`:** shared footer `nav` labelled Press kit / CC0 links directly to the four original PNGs using native download attributes. The committed 1200×630 social image uses the exact Anton face, dark ground, phosphor headline with alarm yellow, and dithered hero on the right; it is separate from the unchanged on-page hero. Shared `index.html` includes `twitter:site=@Quantum_Canary` on all hash routes; the footer links X beside GitHub and DexScreener beside the market links.
- **Statement — `App.tsx`:** custom PGP-style boundary lines, manifesto reading columns, redacted private-key line, small print mascot. Explicitly labelled as statement formatting, not a digital signature.
- **Integration — `Integrate.tsx`:** runtime observer address and attested ABI download, a prominent live-check/latch caveat, selectable/copyable Solidity and disclosed full ABI. The guard's observation function persists a latch only in a successful transaction.

## Do's and Don'ts

Use `.numbered-section` and a real heading for a new section; use `Field` for a datum and a table for a flow. Keep actions native, visible and stateful. Use bone for sustained explanation, phosphor for working text, yellow for the alarm/principal balance, and red only for TRIPPED. Keep real values exact and expose freshness. Preserve the full seed and its building-agent attribution.

Do not add card grids, eyebrow labels, gradients as glows, a copy/picture split hero, extra font families, ornamental charts or speculative token promotion. A new route should reuse the shell, focus behavior, display heading, numbered sections and existing controls. Add a technical detail to the product only when it helps its reader act or verify something.

Better Interface and Impeccable attribution/licenses are retained in `web/docs/licenses/better-interface.txt`; the eth-frontend-ux notice is alongside it. Browser evidence supplements this source record; it is not a screen-reader, native-device or independent security certification.
