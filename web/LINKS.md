# External-link verification summary

Checked 2026-10-10T15:12:44.859757+00:00. Every distinct external anchor in the exported Status, Verify and Integrate pages, including the shared footer and collapsed contract disclosures, was requested using GET. Duplicate occurrences share the same destination and result. Redirects were followed; non-200 URLs were retried once with desktop browser headers; the final GitHub 503 was also retried separately. The machine-readable evidence is `evidence/browser/link-report.json`.

**Final check: 7 of 17 destinations returned HTTP 200, 9 Etherscan URLs returned HTTP 403, and the pinned GitHub hook-source page returned HTTP 503.** The pinned source page returned 200 in the earlier check but 503 in the final run and follow-up retry; its valid immutable URL is preserved. An additional real Chromium navigation to the observer source page also returned 403 with the title “Just a moment…” and a Cloudflare challenge. No 403 is represented as a 200. The required Etherscan destinations remain intact; the all-200 requirement cannot be confirmed from this worker.

| Destination | HTTP status |
| --- | --- |
| [CANARY on Uniswap](https://app.uniswap.org/explore/tokens/ethereum/0x709927ed370da2b7ac5bd0b2df1fb172892b3b56) | 200 |
| [PoolManager address](https://etherscan.io/address/0x000000000004444c5dc75cb358380d2e3de08a90) | 403 |
| [Canary bounty address](https://etherscan.io/address/0x379C0A5704C211f26eadd26e670246E242Af9e7E) | 403 |
| [Observer address (Integrate)](https://etherscan.io/address/0x626517225096671868609c1bbf9c1b416a4efd9a) | 403 |
| [Observer source / footer contract](https://etherscan.io/address/0x626517225096671868609c1bbf9c1b416a4efd9a#code) | 403 |
| [CANARY address](https://etherscan.io/address/0x709927ed370da2b7ac5bd0b2df1fb172892b3b56) | 403 |
| [IMD address](https://etherscan.io/address/0xd34a99bc0f67ae1bbd63c660e6d0b0dd03e263b7) | 403 |
| [Hook address](https://etherscan.io/address/0xdf3cc71b7a8f85a5a1b515072eae679ed21e60cc) | 403 |
| [Hook source on Etherscan](https://etherscan.io/address/0xdf3cc71b7a8f85a5a1b515072eae679ed21e60cc#code) | 403 |
| [CANARY token on Etherscan](https://etherscan.io/token/0x709927ed370da2b7ac5bd0b2df1fb172892b3b56) | 403 |
| [Hook and token build job](https://explorer.imd.fun/jobs/69561148-b678-420c-bf0b-3b6fb49af48f) | 200 |
| [Site build job](https://explorer.imd.fun/jobs/b68f0623-1b19-4525-9e78-0107eb8cc556) | 200 |
| [Canary build job / contract build](https://explorer.imd.fun/jobs/ffb47362-cdd3-498f-8c1c-911c27666c35) | 200 |
| [CANARY / CANARY launch on IMD explorer](https://explorer.imd.fun/token/0x709927ed370da2b7ac5bd0b2df1fb172892b3b56) | 200 |
| [Contract source on GitHub](https://github.com/identity-md-launches/launch-1213-src-quantumcanary-sol) | 200 |
| [Hook and token source on GitHub](https://github.com/identity-md-launches/launch-1235-src-quantumcanaryhook-sol) | 200 |
| [Published hook source revision](https://github.com/identity-md-launches/launch-1235-src-quantumcanaryhook-sol/blob/e69c854c9ea623bc155f74a8edd8c85e857cf2ac/src/QuantumCanaryHook.sol) | 503 (earlier 200) |

The obsolete `imd.fun/launch/1213` and `imd.fun/launch/1235` destinations are absent from the source UI and export. CANARY explorer links, all three provenance jobs, both repositories, the pinned hook source and Uniswap are included above.

The live contract had no recorded trip and no `BountyPaid` events through the observed head, so no real block-history or transaction-history links were rendered during the audit. Future `/block/<trippedBlock>` and `/tx/<transactionHash>` links cannot be enumerated in advance. Their exact Etherscan construction is covered by mocked interaction checks; fabricated mock hashes were not requested as real transactions. No live transaction was broadcast for verification.

The press downloads and ABI download are relative local assets. Browser checks retrieved all four original PNGs with HTTP 200 and matched their bytes to `web/public/art`. The local 1200×630 social preview also returned 200. Its absolute metadata URL becomes available on the supplied domain when this export is published; this run does not claim to have published it.
