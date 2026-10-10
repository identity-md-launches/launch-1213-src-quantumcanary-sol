# Quantum Canary design

## Overview

Quantum Canary is a public Ethereum observatory for bounty donors, independent verifiers and integration developers. Its implemented identity is dark, monospace, technical and slightly manifesto-like: canary yellow for emphasis, phosphor green for verified results, a restrained balance trace, and the supplied canary artwork. It deliberately has one dark theme.

Status prioritizes the balance and alarm, followed by arming details, donation and poke. Verify stages the derivation in four numbered steps. Integrate puts the deployment address beside a copyable Solidity example. The Status hero arrangement is page-specific; the shared header, page introductions, typography, panels and controls form the reusable system.

## Colors

All application colors are defined in `web/src/style.css`. Primitives are named by hue/tone; components use semantic tokens.

| Semantic token | Value | Role |
| --- | --- | --- |
| `--bg-page` | `#0b100d` | Root background, inset inputs |
| `--bg-surface` | `#101812` | Monitor, funding, code and proof surfaces |
| `--bg-hover` | `#172019` | Hover surfaces and alarm banner |
| `--border` | `#33463a` | Structural borders and chart grid |
| `--text` | `#e8ede6` | Headings, body, neutral controls |
| `--text-muted` | `#a0b09f` | Supporting text and metadata |
| `--accent`, `--focus` | `#e9ee68` | Primary action, focus, canary emphasis |
| `--success` | `#92f5a8` | Balance trace, curve values, matches, armed state |
| `--danger` | `#ffaaa0` | Errors, mismatches and tripped state |

Color always has a text counterpart: MATCH/MISMATCH, named alarm states and persistent transaction messages. Solid yellow marks the current principal action; secondary controls have an outlined neutral surface. The supplied art retains its original colors. QR codes intentionally use black-on-white treatment with a quiet border.

Computed-token contrast checks: primary text/page 16.17:1; muted/page 8.41:1; muted/surface 7.93:1; muted/banner 7.32:1; green/surface 13.65:1; red/banner 9.16:1; button text/yellow 15.44:1. These are measured flat color pairs, not a claim about every image-backed or antialiased pixel. See `web/VALIDATION.md`.

## Typography

`web/src/main.tsx` imports local Latin IBM Plex Mono at weights 400, 500 and 600 from `@fontsource/ibm-plex-mono`. Fallbacks are `SFMono-Regular`, Consolas and monospace. Normal text is 400, headings/actions usually 500, the wordmark 600. Browser font loading was checked.

The root is 16px. Semantic type tokens are `--text-caption` 12px, `--text-small` 13px, `--text-body` 15px and `--text-title` clamp(36.8px, 4.7vw, 66.4px). Body copy uses 1.75 line height and a 70ch maximum measure. H1 uses 1.13 line height and −.06em tracking; H2 uses 24–32px (some Status section headings 28.8–40px), 1.25 line height and −.045em tracking. H3 is 16px/1.5. Small instrument metadata is 10–11px; explanatory captions remain 12px. At widths below 30rem, H1 is 36px.

Numbers use tabular figures. Headings balance their wrapping; descriptions use pretty wrapping. Exact addresses and hashes wrap anywhere and remain selectable. Code uses the same mono family, preserves whitespace and wraps long lines. The mobile amount input stays 20px. Do not truncate a value that is being verified.

## Layout

The shared content maximum is 1264px, including 40px side padding. Padding reduces to 28px at 64rem and 18px at 30rem. The spacing vocabulary is 8, 16, 24, 32, 48 and 80px, exposed as `--space-1` through `--space-6`; component-specific chart and dense instrument spacing is explicit in the stylesheet.

`.section-grid` is a two-column content/action pattern with a 70px gap, reducing to 36px at 64rem and one column at 48rem. `.metrics` moves from four columns to two. `.integration-grid` places metadata beside code, then stacks. `.page-intro` gives each page a heading, description and optional visual.

At 48rem the header wraps, navigation spans a second row, primary content stacks and the Status illustration becomes a subdued background character. At 30rem the proof steps become one column, the Verify illustration is omitted, smaller actions wrap, the footer becomes a vertical list, and SVG labels are enlarged to compensate for chart scaling. Donation controls stay inside the page gutters.

The final export was checked at 1440, 768, 390 and 320 CSS pixels across all routes, with no page-level horizontal overflow. All routes also reflowed under 200% root text enlargement. This is not native browser zoom or a physical-device test.

## Elevation & Depth

The interface is flat. Tone, spacing and 1px borders establish structure; there are no elevated cards or modal shadows. The seismograph has a faint second trace for phosphor glow and a static scanline overlay with `pointer-events: none`. The overlay cannot intercept controls. The hero art fades at its edge with a radial mask. Step entrances are brief translations/fades, not a continuous display effect.

## Shapes

The common radius is `--radius: 3px`. Buttons, inputs and panels are nearly square. Circular forms are reserved for the logo, status dots and numbered verification steps. The integration “bool” motif has a small fixed rotation. Artwork is not recolored or regenerated.

## Components

- `web/src/components.tsx`: `Copy` provides clipboard feedback and a selectable-text fallback message; `AddressValue` pairs a full address explorer link with copy; `QR` emits an Ethereum payment URI with the runtime chain ID; `Field` renders a semantic term/value pair; `Seismograph` renders real session samples, pause/resume and a table equivalent. The `amount` helper formats exact integers without floating-point conversion.
- `web/src/App.tsx`: shared header/footer, hash navigation and the private `SignalBanner` pattern. The active route uses `aria-current`. The skip link focuses the main landmark without changing the route. Alarm labels distinguish unknown/stale, unfunded, awaiting poke, armed and tripped states. A TRIPPED banner uses the supplied sticker.
- `web/src/Actions.tsx`: donation amount/review/consent and poke. Controls reflect prepare, sign, confirm, success, error and uncertain states. Pending state persists across hash-page changes. Wrong chain, stale reads and failed verification prevent signing. Transaction controls are native buttons; the sole form uses a bound label, `aria-invalid`, inline recovery text and focus on invalid input.
- `web/src/Verify.tsx`: `Value`, `Compare` and `.ritual` are page-local proof patterns. Every comparison includes computed and contract values plus explicit match text. Four steps enter with a 500ms `cubic-bezier(.2,0,0,1)` animation, staggered by 100ms, only when reduced motion is not requested. The data is immediately available in the DOM; no animation gates verification.
- `web/src/Integrate.tsx`: deployment metadata, full ABI download/disclosure, and a copyable Solidity snippet. It distinguishes the observer from the bounty address and explains live versus recorded alarms.

`.button` is the neutral control; `.primary` fills the principal action; `.small` serves copy/utility controls. Standard controls have 44px minimum height; small desktop utilities are 36px with spacing. Keyboard focus is a 2px yellow outline offset 5px, with a system Highlight override in forced colors. Hover rules apply only on hover-capable devices. Press scale is .96 with 150ms transitions and reduced-motion protection. Loading disables controls and retains explanatory text; errors persist near their flow.

## Do's and Don'ts

- Reuse `.page-intro`, `.section-grid`, `.panel`, semantic color tokens and the existing native controls when adding a page.
- Give a new page one visible H1, preserve the shared hash-navigation model, and keep reading possible without a wallet.
- Treat a displayed balance as an observation with a block and age. Do not fabricate chart history or show a failed read as zero.
- Derive contract addresses and ABI paths from the runtime manifest. Keep financial consequences and chain requirements beside their actions.
- Keep full proof values selectable and accessible. Use text as well as color for outcomes.
- Preserve the four supplied images and the deliberate dark theme. Do not add remote assets, gratuitous animation, extra themes or a competing component system.

Design guidance is adapted from Better Interface (Jakub Krehel, MIT) and the documentation method from Impeccable (Paul Bakaus, Apache-2.0), at the pinned commits recorded in `web/README.md`. Both licenses/notices are retained in `web/docs/licenses/better-interface.txt`.
