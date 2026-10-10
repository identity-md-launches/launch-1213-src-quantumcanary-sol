# External-link verification summary

Checked 2026-10-10T18:29:29.691377+00:00. **12 of 31 destinations returned HTTP 200; DexScreener and 18 Etherscan destinations returned HTTP 403. The requested all-200 gate remains unmet.** Required URLs are preserved; an HTTP challenge/error is not represented as a success.

The production browser enumerated every external anchor on Status, Verify and Integrate, including the shared footer and collapsed disclosures, all three URLs in the AI prompt, and absolute head metadata. Every distinct destination was requested using GET with redirects followed; non-200 responses were retried with desktop browser headers. The checker uses curl with a 20-second total timeout and emits each result as it completes. The original urllib checker did not finish and produced no usable report; only the completed bounded run is counted here. Duplicate destinations across pages share the same recorded result.

Machine-readable URLs, route membership, labels, attempts, redirect destinations and response codes are in [link-report.json](evidence/browser/link-report.json) and [external-links.json](evidence/browser/external-links.json).

| Destination | Pages | HTTP |
| --- | --- | --- |
| [CANARY on Uniswap](https://app.uniswap.org/explore/tokens/ethereum/0x709927ed370da2b7ac5bd0b2df1fb172892b3b56) | status, verify, integrate | 200 |
| [CANARY on DexScreener](https://dexscreener.com/ethereum/0x34eac7f9a4c9b76df13ac4d0fbdc58055578ea9d3c1ea64d166c405476d49cd5) | status, verify, integrate | 403 |
| [PoolManager](https://etherscan.io/address/0x000000000004444c5dc75cb358380d2e3de08a90) | status | 403 |
| [Canary bounty](https://etherscan.io/address/0x379C0A5704C211f26eadd26e670246E242Af9e7E) | status | 403 |
| [Observer address](https://etherscan.io/address/0x626517225096671868609c1bbf9c1b416a4efd9a) | integrate | 403 |
| [Observer source](https://etherscan.io/address/0x626517225096671868609c1bbf9c1b416a4efd9a#code) | status, verify, integrate | 403 |
| [Observer Read Contract (AI prompt)](https://etherscan.io/address/0x626517225096671868609c1bbf9c1b416a4efd9a#readContract) | verify | 403 |
| [CANARY address](https://etherscan.io/address/0x709927ed370da2b7ac5bd0b2df1fb172892b3b56) | status | 403 |
| [IMD address](https://etherscan.io/address/0xd34a99bc0f67ae1bbd63c660e6d0b0dd03e263b7) | status | 403 |
| [Hook address](https://etherscan.io/address/0xdf3cc71b7a8f85a5a1b515072eae679ed21e60cc) | status | 403 |
| [Hook source](https://etherscan.io/address/0xdf3cc71b7a8f85a5a1b515072eae679ed21e60cc#code) | status | 403 |
| [CANARY token](https://etherscan.io/token/0x709927ed370da2b7ac5bd0b2df1fb172892b3b56) | status | 403 |
| [Hook payout 0x013539209f8916815f42bd2691cd0df1c2169e0cb1fd49a36111b97614a66105](https://etherscan.io/tx/0x013539209f8916815f42bd2691cd0df1c2169e0cb1fd49a36111b97614a66105) | status | 403 |
| [Hook payout 0x2f76bf946a78758976485b599bf2b851b2886c9052a49fd0933b6ef35965f2b0](https://etherscan.io/tx/0x2f76bf946a78758976485b599bf2b851b2886c9052a49fd0933b6ef35965f2b0) | status | 403 |
| [Hook payout 0xa37131b9e076a06099a5e3a79e990ce248b796a0ddf940b2861b98fe7f263a99](https://etherscan.io/tx/0xa37131b9e076a06099a5e3a79e990ce248b796a0ddf940b2861b98fe7f263a99) | status | 403 |
| [Hook payout 0xa99de90b87bfe37beeccaa317e3f24b3e61d2cfc8da54ced5dfd51ed46aee502](https://etherscan.io/tx/0xa99de90b87bfe37beeccaa317e3f24b3e61d2cfc8da54ced5dfd51ed46aee502) | status | 403 |
| [Hook payout 0xb2364e3abc501480f9cd566a335c570a9b675b7c6f9ec4cf8469064ef88bd7e1](https://etherscan.io/tx/0xb2364e3abc501480f9cd566a335c570a9b675b7c6f9ec4cf8469064ef88bd7e1) | status | 403 |
| [Hook payout 0xcc4f921d0fe68d7bedf1ec5e8c6d6e8a1adb3496a1a2aa8c7d70241b6c01d939](https://etherscan.io/tx/0xcc4f921d0fe68d7bedf1ec5e8c6d6e8a1adb3496a1a2aa8c7d70241b6c01d939) | status | 403 |
| [Hook payout 0xe1972122e021b815f63ed46c9d1dbd7e8724b19d446961c3d3ae0b30a1977af5](https://etherscan.io/tx/0xe1972122e021b815f63ed46c9d1dbd7e8724b19d446961c3d3ae0b30a1977af5) | status | 403 |
| [Hook payout 0xe1995c7a40ca73208ac4511a4ca391cf84b4e34a593c7d030bf6fcda1cc047b3](https://etherscan.io/tx/0xe1995c7a40ca73208ac4511a4ca391cf84b4e34a593c7d030bf6fcda1cc047b3) | status | 403 |
| [Hook and token build](https://explorer.imd.fun/jobs/69561148-b678-420c-bf0b-3b6fb49af48f) | status | 200 |
| [This site](https://explorer.imd.fun/jobs/b68f0623-1b19-4525-9e78-0107eb8cc556) | status | 200 |
| [Canary build job on the IMD explorer](https://explorer.imd.fun/jobs/ffb47362-cdd3-498f-8c1c-911c27666c35) | status, verify, integrate | 200 |
| [CANARY on the IMD explorer](https://explorer.imd.fun/token/0x709927ed370da2b7ac5bd0b2df1fb172892b3b56) | status, verify, integrate | 200 |
| [Contract source on GitHub](https://github.com/identity-md-launches/launch-1213-src-quantumcanary-sol) | status, verify, integrate | 200 |
| [GitHub source](https://github.com/identity-md-launches/launch-1213-src-quantumcanary-sol/blob/main/src/QuantumCanary.sol) | verify | 200 |
| [Hook and token source on GitHub](https://github.com/identity-md-launches/launch-1235-src-quantumcanaryhook-sol) | status, verify, integrate | 200 |
| [published hook source](https://github.com/identity-md-launches/launch-1235-src-quantumcanaryhook-sol/blob/e69c854c9ea623bc155f74a8edd8c85e857cf2ac/src/QuantumCanaryHook.sol) | status | 200 |
| [Canonical site metadata URL](https://quantum-canary.sites.imd.fun/) | status, verify, integrate | 200 |
| [Social preview metadata image](https://quantum-canary.sites.imd.fun/social-preview.png) | status, verify, integrate | 200 |
| [X: @Quantum_Canary](https://x.com/Quantum_Canary) | status, verify, integrate | 200 |

All eight real hook-payout transaction links visible at the observed mainnet head are included. No trip was recorded, so no real `trippedBlock` link was rendered. Future payout, trip and wallet-receipt URLs cannot be enumerated in advance; their route construction is covered by the interaction tests. No transaction was broadcast to create link evidence, and mock hashes were not requested as real transactions.

The four press downloads and attested ABI download are relative export assets, not external links. The browser checks retrieved all four original PNGs with HTTP 200 and compared their bytes. Every exported file, including the ABI and local social preview, is inventoried and verified in `dist/imd-deployment.json`. The absolute social image URL returned 200 for the currently hosted image; this is not a claim that the new export was published.
