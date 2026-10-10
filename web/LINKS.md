# External-link verification summary

Rechecked on 2026-10-10. **The required all-200 gate remains unmet.** The fresh 43-destination inventory returned **42 HTTP 200 and 1 HTTP 403 with curl**. The independent Chromium sweep returned **9 HTTP 200, 32 HTTP 403 and 2 HTTP 503**. Required URLs are unchanged; no challenge or error response is counted as a successful page.

Finding `1286424d74d3f8f7140f61b3320fb52f0200306d4e621d1a653b26f590f62580` reproduces. Clicking **CANARY on DexScreener** in Status section 04 at 1440×900 opened the exact mandated destination with HTTP 403. After eight seconds it still displayed `Performing security verification` under the title `Just a moment...`. Both GitHub source-file destinations returned HTTP 200 to curl but HTTP 503 with title `Unicorn! · GitHub` in Chromium. This confirms intermittent/client-dependent availability, rather than an incorrect source path.

## Coverage and method

Served the unchanged `dist/` with `web/scripts/preview-server.mjs`. Captured Status, Verify and Integrate at both 1440×900 and 390×844, with live verified mainnet reads at block **26,163,961**, at 2026-10-10T18:55:31.877Z. The inventory includes all external anchors on each active route, shared footer and collapsed disclosures, all three AI-prompt references, and absolute head metadata. It contains the current 20 payout transaction destinations. Duplicate URLs share a result; fragment variants remain separate. New payout hashes replace older observations naturally, without application changes.

Ran the existing `web/scripts/link-check.py` unchanged except redirecting its input/output directory to `/tmp/quantum-canary-link-revision/`. Each request is GET with redirects, a 20-second total timeout and one non-200/error retry with desktop browser headers. It finished at 2026-10-10T18:56:15.351899+00:00 with **exit 1**. Exact URLs were used without substitutes, query changes or alternate source hosts. Every current destination is listed below.

Chromium 154.0.8037.0 independently navigated to each destination in a fresh page from 2026-10-10T18:56:01.202Z through 2026-10-10T18:56:12.617Z. HTTP status comes from the main-document response, with final URL, content type and page title recorded. Browser navigation had a 20-second DOM-content-loaded timeout. The supplied browser tool could not launch because its expected Chrome executable was missing; the installed Playwright Chromium headless shell ran the preview and navigation checks directly. The browser sweep completed all 43 requests; its all-200 result is **false**.

The methods are reported separately: all Etherscan links and X returned 200 to curl but 403 in Chromium; the two GitHub source-file pages returned 200 to curl but 503 in Chromium. DexScreener returned 403 in both. These results are observations from this worker, not a guarantee of availability to other clients. No automatic retries beyond the stated bounded checks or challenge bypass were attempted.

Machine-readable route membership and labels are in [external-links.json](evidence/browser/external-links.json). [link-report.json](evidence/browser/link-report.json) records all curl attempts, response codes, final destinations and byte counts, the complete browser sweep, route inventory timestamps/viewports and the actual DexScreener click observation. The unchanged export produced no page/console/request errors during the local route inventory.

## Every current destination

| Destination | Pages | curl GET | Chromium |
| --- | --- | --- | --- |
| [CANARY on Uniswap](https://app.uniswap.org/explore/tokens/ethereum/0x709927ed370da2b7ac5bd0b2df1fb172892b3b56) | status, verify, integrate | 200 | 200 |
| [CANARY on DexScreener](https://dexscreener.com/ethereum/0x34eac7f9a4c9b76df13ac4d0fbdc58055578ea9d3c1ea64d166c405476d49cd5) | status, verify, integrate | 403 | 403 |
| [PoolManager](https://etherscan.io/address/0x000000000004444c5dc75cb358380d2e3de08a90) | status | 200 | 403 |
| [Canary bounty](https://etherscan.io/address/0x379C0A5704C211f26eadd26e670246E242Af9e7E) | status | 200 | 403 |
| [Observer address](https://etherscan.io/address/0x626517225096671868609c1bbf9c1b416a4efd9a) | integrate | 200 | 403 |
| [Observer source](https://etherscan.io/address/0x626517225096671868609c1bbf9c1b416a4efd9a#code) | status, verify, integrate | 200 | 403 |
| [Observer Read Contract (AI prompt)](https://etherscan.io/address/0x626517225096671868609c1bbf9c1b416a4efd9a#readContract) | verify | 200 | 403 |
| [CANARY address](https://etherscan.io/address/0x709927ed370da2b7ac5bd0b2df1fb172892b3b56) | status | 200 | 403 |
| [IMD address](https://etherscan.io/address/0xd34a99bc0f67ae1bbd63c660e6d0b0dd03e263b7) | status | 200 | 403 |
| [Hook address](https://etherscan.io/address/0xdf3cc71b7a8f85a5a1b515072eae679ed21e60cc) | status | 200 | 403 |
| [Hook source](https://etherscan.io/address/0xdf3cc71b7a8f85a5a1b515072eae679ed21e60cc#code) | status | 200 | 403 |
| [CANARY token](https://etherscan.io/token/0x709927ed370da2b7ac5bd0b2df1fb172892b3b56) | status | 200 | 403 |
| [Hook payout 0x14d11c1154019cbd2fcaf804e15fe4e4c97d7f84de6437d55e1dfd6bf2e1e218](https://etherscan.io/tx/0x14d11c1154019cbd2fcaf804e15fe4e4c97d7f84de6437d55e1dfd6bf2e1e218) | status | 200 | 403 |
| [Hook payout 0x3138ed19a9d8bf4c786c1e8458de2980768c6cc30c8063cd8d34f1351f52af8e](https://etherscan.io/tx/0x3138ed19a9d8bf4c786c1e8458de2980768c6cc30c8063cd8d34f1351f52af8e) | status | 200 | 403 |
| [Hook payout 0x46509ae10762ab2d7b4a8154ff98e6d09392f97fa7d09e71acbfb02b7bddc36b](https://etherscan.io/tx/0x46509ae10762ab2d7b4a8154ff98e6d09392f97fa7d09e71acbfb02b7bddc36b) | status | 200 | 403 |
| [Hook payout 0x52aaf86cd4e40120a22cc070ff9e22bb125da84725e5f0c52e0582742bf7e3d6](https://etherscan.io/tx/0x52aaf86cd4e40120a22cc070ff9e22bb125da84725e5f0c52e0582742bf7e3d6) | status | 200 | 403 |
| [Hook payout 0x58df30d680defe71f9cf24144f6eb375ecc329d400f37df7eeedbb03cc4a520c](https://etherscan.io/tx/0x58df30d680defe71f9cf24144f6eb375ecc329d400f37df7eeedbb03cc4a520c) | status | 200 | 403 |
| [Hook payout 0x65769788a531dcbf21beb2bc959c8c18e89d1029152172cd963063376f1f4e11](https://etherscan.io/tx/0x65769788a531dcbf21beb2bc959c8c18e89d1029152172cd963063376f1f4e11) | status | 200 | 403 |
| [Hook payout 0x6f78fe6ece3393f6391e76f6ffa7172bbbba101c604d0f93ca97ed0729fd3e2f](https://etherscan.io/tx/0x6f78fe6ece3393f6391e76f6ffa7172bbbba101c604d0f93ca97ed0729fd3e2f) | status | 200 | 403 |
| [Hook payout 0x719a2d04625a6e165fd3ac2cf973d78df2653f3f24a968f209327f4bec807c9c](https://etherscan.io/tx/0x719a2d04625a6e165fd3ac2cf973d78df2653f3f24a968f209327f4bec807c9c) | status | 200 | 403 |
| [Hook payout 0x7304fba04b516f18ab05f0bd194fdfae56cb9c17909fce1686c1f38f7a39ec84](https://etherscan.io/tx/0x7304fba04b516f18ab05f0bd194fdfae56cb9c17909fce1686c1f38f7a39ec84) | status | 200 | 403 |
| [Hook payout 0x7818205134ae588ef8377370670663f3d6db0811aff7f9c546732a10741c353b](https://etherscan.io/tx/0x7818205134ae588ef8377370670663f3d6db0811aff7f9c546732a10741c353b) | status | 200 | 403 |
| [Hook payout 0x89e0577bb31e41dfc8a93e9a565ca7732a29d45c4c6c88568d38251bb9fdf50c](https://etherscan.io/tx/0x89e0577bb31e41dfc8a93e9a565ca7732a29d45c4c6c88568d38251bb9fdf50c) | status | 200 | 403 |
| [Hook payout 0x9e69c19f5f061c89520d0d46acf20f92dd5bf1ee4ca6d78949991450f0d9905d](https://etherscan.io/tx/0x9e69c19f5f061c89520d0d46acf20f92dd5bf1ee4ca6d78949991450f0d9905d) | status | 200 | 403 |
| [Hook payout 0xa8560b296b818a1acba49307e673d95880e8dc695be4ca996316e2e0bb1a2141](https://etherscan.io/tx/0xa8560b296b818a1acba49307e673d95880e8dc695be4ca996316e2e0bb1a2141) | status | 200 | 403 |
| [Hook payout 0xb1788a3ad5cd1bbe1fd5c8b0ff44b03b1141e9739b802be60f91820c4fc047d7](https://etherscan.io/tx/0xb1788a3ad5cd1bbe1fd5c8b0ff44b03b1141e9739b802be60f91820c4fc047d7) | status | 200 | 403 |
| [Hook payout 0xb4d3c7402d89fc2ff0c73c80da547b476c8cd169c3feca8809b36170d204d5ba](https://etherscan.io/tx/0xb4d3c7402d89fc2ff0c73c80da547b476c8cd169c3feca8809b36170d204d5ba) | status | 200 | 403 |
| [Hook payout 0xd05cd5587779c4be3b6429809a9ec26eab946c8283d75e97abd8bb5218baa4ea](https://etherscan.io/tx/0xd05cd5587779c4be3b6429809a9ec26eab946c8283d75e97abd8bb5218baa4ea) | status | 200 | 403 |
| [Hook payout 0xd68b8251c0e10b2703a73cfa1e925ed435e648e6c77c833bd2895cf37096f44b](https://etherscan.io/tx/0xd68b8251c0e10b2703a73cfa1e925ed435e648e6c77c833bd2895cf37096f44b) | status | 200 | 403 |
| [Hook payout 0xddfdf1a6a15f492bcae4918562a31bcd9d05953d8f7a1c902cc3807a24fe642e](https://etherscan.io/tx/0xddfdf1a6a15f492bcae4918562a31bcd9d05953d8f7a1c902cc3807a24fe642e) | status | 200 | 403 |
| [Hook payout 0xfa5b58482c28febdf0008e2eda67e48fe20cdeb01a7746d932ce92169e65a805](https://etherscan.io/tx/0xfa5b58482c28febdf0008e2eda67e48fe20cdeb01a7746d932ce92169e65a805) | status | 200 | 403 |
| [Hook payout 0xfad84ad99c7ff9622dd1ae58d05381f499bdb39527c072cdf2d9f4af141e1b92](https://etherscan.io/tx/0xfad84ad99c7ff9622dd1ae58d05381f499bdb39527c072cdf2d9f4af141e1b92) | status | 200 | 403 |
| [Hook and token build](https://explorer.imd.fun/jobs/69561148-b678-420c-bf0b-3b6fb49af48f) | status | 200 | 200 |
| [This site](https://explorer.imd.fun/jobs/b68f0623-1b19-4525-9e78-0107eb8cc556) | status | 200 | 200 |
| [Canary build job on the IMD explorer](https://explorer.imd.fun/jobs/ffb47362-cdd3-498f-8c1c-911c27666c35) | status, verify, integrate | 200 | 200 |
| [CANARY on the IMD explorer](https://explorer.imd.fun/token/0x709927ed370da2b7ac5bd0b2df1fb172892b3b56) | status, verify, integrate | 200 | 200 |
| [Contract source on GitHub](https://github.com/identity-md-launches/launch-1213-src-quantumcanary-sol) | status, verify, integrate | 200 | 200 |
| [GitHub source](https://github.com/identity-md-launches/launch-1213-src-quantumcanary-sol/blob/main/src/QuantumCanary.sol) | verify | 200 | 503 |
| [Hook and token source on GitHub](https://github.com/identity-md-launches/launch-1235-src-quantumcanaryhook-sol) | status, verify, integrate | 200 | 200 |
| [published hook source](https://github.com/identity-md-launches/launch-1235-src-quantumcanaryhook-sol/blob/e69c854c9ea623bc155f74a8edd8c85e857cf2ac/src/QuantumCanaryHook.sol) | status | 200 | 503 |
| [Canonical site metadata URL](https://quantum-canary.sites.imd.fun/) | status, verify, integrate | 200 | 200 |
| [Social preview metadata image](https://quantum-canary.sites.imd.fun/social-preview.png) | status, verify, integrate | 200 | 200 |
| [X: @Quantum_Canary](https://x.com/Quantum_Canary) | status, verify, integrate | 200 | 403 |

## Remaining gate

**Incomplete.** The all-200 requirement can only be claimed after a fresh inventory and successful responses from every destination. No repository-only repair for these third-party responses is demonstrated. The configured URLs, page copy, design, behavior and complete static export are preserved. The reviewer response disputes repairability within this repository; it does not dispute the reproduced failure or claim completion.

Transaction-receipt links from future wallet writes cannot be inventoried without sending those transactions. No real wallet was connected and no transaction was signed or broadcast. Those future links remain untested.
