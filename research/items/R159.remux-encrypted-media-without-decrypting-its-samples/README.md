<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Remux encrypted media without decrypting its samples

Current decision: **pursue**. Ciphertext-preserving remux into one valid CENC fragment now reaches actual browser CENC decryption, visible red output, seek and EOF. Full independent decrypted pixels and ciphertext/IV identity pass; wrong-IV and wrong-key controls detect corruption. Direct-file false-positive EOF and protected canvas limitations retained.

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | New executable probe and declared workload/controls registered with source/input/runtime evidence. |
| screen | passed | Ciphertext-preserving remux into one valid CENC fragment now reaches actual browser CENC decryption, visible red output, seek and EOF. Full independent decrypted pixels and ciphertext/IV identity pass; wrong-IV and wrong-key controls detect corruption. Direct-file false-positive EOF and protected canvas limitations retained. |
| correctness | passed | Owned generated24-frame AVC video only, one key/KID, CENC with explicit IV/subsample records, one fragment. All ciphertext/senc bytes preserved; reconstructed moof-relative saio offsets. Full host independent decrypted pixels equal clear baseline; wrong IV changes output. Normal Chrome MSE CENC pipeline gives visible red screenshot pixel[248,36,0,255],seek0.8,EOF,34reported frames including seek replays; wrong key produces PIPELINE_ERROR_DECODE and no observed frames. Session/MediaKeys/URL/browser cleanup. Canvas readback remains black; no exact browser compositor-pixel proof, arbitrary multitrack/cbcs/key rotation/third-party licenses claim. |
| performance | not_applicable | Capability-only encrypted-container construction without decrypting samples; no efficiency claim. Correct old direct-file destination does not exist in this test profile, so no forced savings benchmark. All host decryption here is independent owned-key oracle, never candidate remux operation. |
| results | passed | Actual new execution raw outcomes, controls and scoped interpretation retained. |
| decision | passed | pursue: Ciphertext-preserving remux into one valid CENC fragment now reaches actual browser CENC decryption, visible red output, seek and EOF. Full independent decrypted pixels and ciphertext/IV identity pass; wrong-IV and wrong-key controls detect corruption. Direct-file false-positive EOF and protected canvas limitations retained. |

Next/reopen: Pursue restricted owned one-track CENC fragment construction. Before broader admission, add multiple fragments, audio, key rotation and cbcs controls and source/lifecycle tests; retain exact container offsets and ciphertext identity. No DRM bypass or production route changes.

[Current contract](item.json) · [History](history.jsonl) · [Evidence](evidence/index.json)
