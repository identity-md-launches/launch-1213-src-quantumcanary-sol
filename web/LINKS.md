# External-link verification summary

Rechecked on 2026-10-10. **The required all-200 gate remains unmet.** The current 43-destination inventory returned **10 HTTP 200, 31 HTTP 403 and 2 HTTP 503 with curl**; an independent Chromium navigation sweep returned **9 HTTP 200, 32 HTTP 403 and 2 HTTP 503**. These are observed third-party responses, not evidence that the configured destinations are wrong. Every required URL is preserved. No challenge/error response is counted as a successful page.

The review's three reported failures reproduce: DexScreener returns a Cloudflare verification page (403), and both GitHub source-file destinations return `Unicorn! · GitHub` (503). An earlier hook-source browser navigation loaded the source, but the later full sweep returned 503 again. A final fresh DexScreener navigation still displayed `Performing security verification` after a browser wait. These services have not recovered consistently; this revision does not mark the gate complete.

## Coverage and method

First reran the existing bounded checker against the prior 31-link inventory: 10 returned 200, 19 returned 403, and both source-file URLs returned 503. Then served the unchanged `dist/` using `web/scripts/preview-server.mjs`, opened all three routes in Chromium and captured a fresh inventory at 2026-10-10T18:43:37.206Z (verified Ethereum observation at block 26,163,901). There are now 20 live hook payout links, so the current inventory has 43 distinct destinations rather than 31. No application source changed to produce that difference.

Inventory covers every external anchor on Status, Verify and Integrate, including the shared footer and collapsed disclosures, all three URLs in the AI prompt, and absolute head metadata. Duplicate destinations share results. The existing `web/scripts/link-check.py` logic ran unchanged with only its input/output paths redirected into `test/scratch/link-revision/`; GET follows redirects, has a 20-second timeout and retries a non-200 response once with desktop browser headers. It finished at 2026-10-10T18:43:43.249856+00:00 with exit 1. Every destination was also navigated from `about:blank` in Chromium; statuses come from `PerformanceNavigationTiming.responseStatus`, with titles/final URLs recorded, and the X failure confirmed in the browser network log. Browser requests ran from 2026-10-10T18:44:06.167Z through 2026-10-10T18:45:15.599Z. Exact URLs were used without substitutes or query-string changes.

Machine-readable route membership and labels are in [external-links.json](evidence/browser/external-links.json). [link-report.json](evidence/browser/link-report.json) preserves curl attempts, final destinations, response codes and byte counts, the browser sweep, the initial reproduction and final DexScreener observation. The two methods are reported separately: X returned the actual profile HTML with curl (200), while browser navigation returned 403. A successful web-reader extraction without an exposed HTTP status was not counted as proof of 200.

## Every current destination

| Destination | Pages | curl GET | Chromium |
| --- | --- | --- | --- |
| [CANARY on Uniswap](https://app.uniswap.org/explore/tokens/ethereum/0x709927ed370da2b7ac5bd0b2df1fb172892b3b56) | status, verify, integrate | 200 | 200 |
| [CANARY on DexScreener](https://dexscreener.com/ethereum/0x34eac7f9a4c9b76df13ac4d0fbdc58055578ea9d3c1ea64d166c405476d49cd5) | status, verify, integrate | 403 | 403 |
| [PoolManager](https://etherscan.io/address/0x000000000004444c5dc75cb358380d2e3de08a90) | status | 403 | 403 |
| [Canary bounty](https://etherscan.io/address/0x379C0A5704C211f26eadd26e670246E242Af9e7E) | status | 403 | 403 |
| [Observer address](https://etherscan.io/address/0x626517225096671868609c1bbf9c1b416a4efd9a) | integrate | 403 | 403 |
| [Observer source](https://etherscan.io/address/0x626517225096671868609c1bbf9c1b416a4efd9a#code) | status, verify, integrate | 403 | 403 |
| [Observer Read Contract (AI prompt)](https://etherscan.io/address/0x626517225096671868609c1bbf9c1b416a4efd9a#readContract) | verify | 403 | 403 |
| [CANARY address](https://etherscan.io/address/0x709927ed370da2b7ac5bd0b2df1fb172892b3b56) | status | 403 | 403 |
| [IMD address](https://etherscan.io/address/0xd34a99bc0f67ae1bbd63c660e6d0b0dd03e263b7) | status | 403 | 403 |
| [Hook address](https://etherscan.io/address/0xdf3cc71b7a8f85a5a1b515072eae679ed21e60cc) | status | 403 | 403 |
| [Hook source](https://etherscan.io/address/0xdf3cc71b7a8f85a5a1b515072eae679ed21e60cc#code) | status | 403 | 403 |
| [CANARY token](https://etherscan.io/token/0x709927ed370da2b7ac5bd0b2df1fb172892b3b56) | status | 403 | 403 |
| [Hook payout 0x3a5f1dbfb3b9e89e20f7ad4fb65a63249f13b2cc87d0d27b5983a8b74d2d56c9](https://etherscan.io/tx/0x3a5f1dbfb3b9e89e20f7ad4fb65a63249f13b2cc87d0d27b5983a8b74d2d56c9) | status | 403 | 403 |
| [Hook payout 0x3d3ebdfd1f657ee6d026ab60486cba3ecf309197c1f3633f8c2b43c5e7b3e8b5](https://etherscan.io/tx/0x3d3ebdfd1f657ee6d026ab60486cba3ecf309197c1f3633f8c2b43c5e7b3e8b5) | status | 403 | 403 |
| [Hook payout 0x3f051956a5201404fd8d7573880a53145741645fae13b1638d7a3d7ee71ac233](https://etherscan.io/tx/0x3f051956a5201404fd8d7573880a53145741645fae13b1638d7a3d7ee71ac233) | status | 403 | 403 |
| [Hook payout 0x48f6f462d3b3fcfa7f62dea0bc7328d3001ec1dfaea8d2f7dcfad91f50135f1c](https://etherscan.io/tx/0x48f6f462d3b3fcfa7f62dea0bc7328d3001ec1dfaea8d2f7dcfad91f50135f1c) | status | 403 | 403 |
| [Hook payout 0x666f52dd2392332779285d344948d6716469ae0bf25c73e41c491440a52eec4c](https://etherscan.io/tx/0x666f52dd2392332779285d344948d6716469ae0bf25c73e41c491440a52eec4c) | status | 403 | 403 |
| [Hook payout 0x6bfc21526deb5cdc93adb447dc5f426fc3fdb344abe5b9dfb5ca1559e0cf9af8](https://etherscan.io/tx/0x6bfc21526deb5cdc93adb447dc5f426fc3fdb344abe5b9dfb5ca1559e0cf9af8) | status | 403 | 403 |
| [Hook payout 0x6eb2d35472cfbecc12f906b065267a68589c1e2f42c6338b0f44241fed32f060](https://etherscan.io/tx/0x6eb2d35472cfbecc12f906b065267a68589c1e2f42c6338b0f44241fed32f060) | status | 403 | 403 |
| [Hook payout 0x84afe863b78a5e6a679c11a703792040bae2e9118aab06402804b6463183617c](https://etherscan.io/tx/0x84afe863b78a5e6a679c11a703792040bae2e9118aab06402804b6463183617c) | status | 403 | 403 |
| [Hook payout 0x864e579d8cede8f1be9d6acc6467f852219c3447b1e1efe647da4cb38c3476d0](https://etherscan.io/tx/0x864e579d8cede8f1be9d6acc6467f852219c3447b1e1efe647da4cb38c3476d0) | status | 403 | 403 |
| [Hook payout 0x8e1a65213ce514ce770d2f5dfcc79dbf56ed85f44dc5f331cf823f6f1f33d6ba](https://etherscan.io/tx/0x8e1a65213ce514ce770d2f5dfcc79dbf56ed85f44dc5f331cf823f6f1f33d6ba) | status | 403 | 403 |
| [Hook payout 0x9dd523f17871803b1a9b2aff41229b70039d6b2eb1cbdcca02010ce796910687](https://etherscan.io/tx/0x9dd523f17871803b1a9b2aff41229b70039d6b2eb1cbdcca02010ce796910687) | status | 403 | 403 |
| [Hook payout 0xa37131b9e076a06099a5e3a79e990ce248b796a0ddf940b2861b98fe7f263a99](https://etherscan.io/tx/0xa37131b9e076a06099a5e3a79e990ce248b796a0ddf940b2861b98fe7f263a99) | status | 403 | 403 |
| [Hook payout 0xb1a9a3e4bdfd52b8dfb54406a22e2172eee22f97f765efbd4b2e0895f4a9f34a](https://etherscan.io/tx/0xb1a9a3e4bdfd52b8dfb54406a22e2172eee22f97f765efbd4b2e0895f4a9f34a) | status | 403 | 403 |
| [Hook payout 0xb208932f7ecbd2c641ea79b628aefb1700ec590f5fe9cf975e9cb33e7b9fb667](https://etherscan.io/tx/0xb208932f7ecbd2c641ea79b628aefb1700ec590f5fe9cf975e9cb33e7b9fb667) | status | 403 | 403 |
| [Hook payout 0xb6284dcf2b7ab719a4c98b46e3c96ba61cd959727cbe0e53537976effd7329b4](https://etherscan.io/tx/0xb6284dcf2b7ab719a4c98b46e3c96ba61cd959727cbe0e53537976effd7329b4) | status | 403 | 403 |
| [Hook payout 0xce6264454093caf95ec8d5532ecf0244e4907e29bfcc6963a548e7d28aa10028](https://etherscan.io/tx/0xce6264454093caf95ec8d5532ecf0244e4907e29bfcc6963a548e7d28aa10028) | status | 403 | 403 |
| [Hook payout 0xd24b00e28617d3a47bee1b7967dba8b160880398b7eaa7f3a78de31d197c9424](https://etherscan.io/tx/0xd24b00e28617d3a47bee1b7967dba8b160880398b7eaa7f3a78de31d197c9424) | status | 403 | 403 |
| [Hook payout 0xd3de39a5db35db617357f78075d97c724f66371e3d87f114a83bdcef3a28ce79](https://etherscan.io/tx/0xd3de39a5db35db617357f78075d97c724f66371e3d87f114a83bdcef3a28ce79) | status | 403 | 403 |
| [Hook payout 0xe1972122e021b815f63ed46c9d1dbd7e8724b19d446961c3d3ae0b30a1977af5](https://etherscan.io/tx/0xe1972122e021b815f63ed46c9d1dbd7e8724b19d446961c3d3ae0b30a1977af5) | status | 403 | 403 |
| [Hook payout 0xe8001109bd4f63e27f9b22c0e4cc17e302512e8005e1d0fc96bbc8793601ff70](https://etherscan.io/tx/0xe8001109bd4f63e27f9b22c0e4cc17e302512e8005e1d0fc96bbc8793601ff70) | status | 403 | 403 |
| [Hook and token build](https://explorer.imd.fun/jobs/69561148-b678-420c-bf0b-3b6fb49af48f) | status | 200 | 200 |
| [This site](https://explorer.imd.fun/jobs/b68f0623-1b19-4525-9e78-0107eb8cc556) | status | 200 | 200 |
| [Canary build job on the IMD explorer](https://explorer.imd.fun/jobs/ffb47362-cdd3-498f-8c1c-911c27666c35) | status, verify, integrate | 200 | 200 |
| [CANARY on the IMD explorer](https://explorer.imd.fun/token/0x709927ed370da2b7ac5bd0b2df1fb172892b3b56) | status, verify, integrate | 200 | 200 |
| [Contract source on GitHub](https://github.com/identity-md-launches/launch-1213-src-quantumcanary-sol) | status, verify, integrate | 200 | 200 |
| [GitHub source](https://github.com/identity-md-launches/launch-1213-src-quantumcanary-sol/blob/main/src/QuantumCanary.sol) | verify | 503 | 503 |
| [Hook and token source on GitHub](https://github.com/identity-md-launches/launch-1235-src-quantumcanaryhook-sol) | status, verify, integrate | 200 | 200 |
| [published hook source](https://github.com/identity-md-launches/launch-1235-src-quantumcanaryhook-sol/blob/e69c854c9ea623bc155f74a8edd8c85e857cf2ac/src/QuantumCanaryHook.sol) | status | 503 | 503 |
| [Canonical site metadata URL](https://quantum-canary.sites.imd.fun/) | status, verify, integrate | 200 | 200 |
| [Social preview metadata image](https://quantum-canary.sites.imd.fun/social-preview.png) | status, verify, integrate | 200 | 200 |
| [X: @Quantum_Canary](https://x.com/Quantum_Canary) | status, verify, integrate | 200 | 403 |

All 20 real hook-payout transaction links visible in the captured live state are included. No trip was recorded, so no real `trippedBlock` link was rendered. Subsequent payout, trip and wallet-receipt URLs cannot be enumerated in advance. No transaction was broadcast to create evidence, and no mock hash was requested as a real transaction.

The four press downloads and attested ABI download are relative export assets, not external links. The existing export and all 19 manifest asset hashes were rechecked against their actual bytes; they are unchanged. The absolute social image response concerns the currently hosted image, not a claim that a new export was published.

The finding is answered as `disputed` in [the revision response](../.imd-responses.json) only because there is no repository fix for these reproduced third-party responses that preserves the mandatory URLs. The availability failure and unmet gate are acknowledged. No URL replacement, outage-hiding UI or unrelated change was made.
