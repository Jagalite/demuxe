<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Seek inside authenticated encrypted media without decrypting the whole file

Current decision: **pursue**. Official Tink1.16.1 AES128-GCM-HKDF Streaming fixture interoperates with browser WebCrypto random-range reader. Full315345B plaintext and startup/distant/straddling/final ranges exactly match independent Tink decrypt. Browser wrong key/context/tag/position/final/truncation/source/cancel controls reject; official reference also rejects salt/nonce/header mutation, reorder and truncation.11 cold modeledHTTP jobs save97.03% ciphertext bytes and median94.86% latency against decrypt-once sequential input; range62.9ms remains slower than plaintext21.5ms. Pursue this authorized provider component only.

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | New executable probe and declared workload/controls registered with source/input/runtime evidence. |
| screen | passed | Official Tink1.16.1 AES128-GCM-HKDF Streaming fixture interoperates with browser WebCrypto random-range reader. Full315345B plaintext and startup/distant/straddling/final ranges exactly match independent Tink decrypt. Browser wrong key/context/tag/position/final/truncation/source/cancel controls reject; official reference also rejects salt/nonce/header mutation, reorder and truncation.11 cold modeledHTTP jobs save97.03% ciphertext bytes and median94.86% latency against decrypt-once sequential input; range62.9ms remains slower than plaintext21.5ms. Pursue this authorized provider component only. |
| correctness | passed | Official pinned Tink Python reference encrypt/decrypt is independent from browser AES-GCM/HKDF adapter. Full plaintext and16 correctness ranges plus99 timed ranges exact. Whole requested range publishes only after all affected segments authenticate. Wrong key/AAD/cipher/nonce-position/final flag/truncation/ETag and pending cancelled owner reject; official header/salt/nonce/reorder controls reject. No maintained demux integration or key-service qualification. |
| performance | passed | 11 alternating cold owner jobs of3 equivalent ranges, modeled256KiB/s+5msHTTP. Includes header,HKDF/import,auth,copies,cancel; sequential baseline reads/decrypts whole object once then serves3ranges.97.03% fewer ciphertext bytes exceeds80%; median latency ratio.0514 below1.25, bootstrap retained. Plaintext median21.5ms versus encrypted62.9ms exposes overhead. Trusted identity/key acquisition and browser launch common/excluded. |
| results | passed | Actual new execution raw outcomes, controls and scoped interpretation retained. |
| decision | passed | pursue: Official Tink1.16.1 AES128-GCM-HKDF Streaming fixture interoperates with browser WebCrypto random-range reader. Full315345B plaintext and startup/distant/straddling/final ranges exactly match independent Tink decrypt. Browser wrong key/context/tag/position/final/truncation/source/cancel controls reject; official reference also rejects salt/nonce/header mutation, reorder and truncation.11 cold modeledHTTP jobs save97.03% ciphertext bytes and median94.86% latency against decrypt-once sequential input; range62.9ms remains slower than plaintext21.5ms. Pursue this authorized provider component only. |

Next/reopen: Consider integrating the authorized immutable range adapter only where reviewed Tink-format storage and trusted key/context/object metadata are available. Independently review crypto boundary and real network workload before production; no automatic routing or user key handling changed.

[Current contract](item.json) · [History](history.jsonl) · [Evidence](evidence/index.json)
