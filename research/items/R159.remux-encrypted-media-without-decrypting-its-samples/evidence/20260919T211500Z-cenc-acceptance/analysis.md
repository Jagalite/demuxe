<!-- SPDX-License-Identifier: CC-BY-4.0 -->

Ciphertext-preserving remux into one valid CENC fragment now reaches actual browser CENC decryption, visible red output, seek and EOF. Full independent decrypted pixels and ciphertext/IV identity pass; wrong-IV and wrong-key controls detect corruption. Direct-file false-positive EOF and protected canvas limitations retained.

Correctness: Owned generated24-frame AVC video only, one key/KID, CENC with explicit IV/subsample records, one fragment. All ciphertext/senc bytes preserved; reconstructed moof-relative saio offsets. Full host independent decrypted pixels equal clear baseline; wrong IV changes output. Normal Chrome MSE CENC pipeline gives visible red screenshot pixel[248,36,0,255],seek0.8,EOF,34reported frames including seek replays; wrong key produces PIPELINE_ERROR_DECODE and no observed frames. Session/MediaKeys/URL/browser cleanup. Canvas readback remains black; no exact browser compositor-pixel proof, arbitrary multitrack/cbcs/key rotation/third-party licenses claim.

Performance: Capability-only encrypted-container construction without decrypting samples; no efficiency claim. Correct old direct-file destination does not exist in this test profile, so no forced savings benchmark. All host decryption here is independent owned-key oracle, never candidate remux operation.

Next/reopen: Pursue restricted owned one-track CENC fragment construction. Before broader admission, add multiple fragments, audio, key rotation and cbcs controls and source/lifecycle tests; retain exact container offsets and ciphertext identity. No DRM bypass or production route changes.

Bounded research result, not production or release admission.
