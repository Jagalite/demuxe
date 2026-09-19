# Demuxe — R318–R323 reconstructed continuity test results

**18 September 2026 · 6 executed component pilots · 45/45 QA checks passed · no production source changes**

**Baseline:** `9abfd1b22300cf273fc0bd1a8290261281c8f3f3` (current Demuxe main observed for this run).

## Provenance

**RECONSTRUCTED CONTINUITY BATCH.** The archive contains exact R313–R317 proposals and later conversation context contains R324–R331, but no persisted/retrievable original R318–R323 definitions were found. The six cards tested here were therefore created for this run and are not claimed to recover missing originals. Their exact definitions are frozen in `R318-R323-agent-catalog.json`.

## Decision summary

| ID | Verdict | Decisive result |
|---|---|---|
| R318 | **PROMISING preview primitive** | 30 reverse H.264 frames were hash-identical when one GOP was decoded once and reversed from cache. Median one-GOP decode 63.24 ms vs 1925.06 ms for 30 independent reverse-frame decodes: **30.4×**. |
| R319 | **PROMISING component** | Paeth checkpoint replay was byte-exact for all queried bands, reconstructing 191 vs 671 rows (**71.5% less row work**) and **3.61×** faster in the Python component harness. |
| R320 | **PROMISING repeated-query cache** | 180 fixed-FIR mix-energy queries matched direct output with max relative error 9.66e-16. Query-only speedup **123.9×**; including cache construction, only **1.37×** at this workload. |
| R321 | **PROMISING / strong** | Exact biquad output resumed from stored recurrence state. Work fell **96.9%**; measured component speedup **32.4×**. |
| R322 | **PROMISING seek primitive** | GIF-style disposal-state checkpoints reproduced every sampled composited frame exactly, cut replay work **90.7%**, and measured **10.8×** faster random seeking. |
| R323 | **PROMISING integrity primitive** | 64 KiB leaves in a 16 MiB object were authenticated with 8 sibling hashes (256-byte proof); corruption was rejected. Range verification measured **215.8×** faster than rehashing the whole object for each request. |

## R318 — Decode a GOP once for exact reverse-frame playback

A six-second 320×180 H.264 fixture used 30-frame GOPs. For frames 120–149, the candidate decoded the GOP once in forward dependency order, retained the 30 decoded YUV420 frames, and presented their hashes in reverse. All 30 matched the independently decoded full-stream oracle exactly.

This validates a reverse-preview cache, not reversal of H.264 packet order. The speed comparison intentionally represents the bad-but-realistic repeated seek/decode fallback: 1925.06 ms versus 63.24 ms. Production value depends on a hard decoded-frame memory budget and GOP length.

## R319 — Checkpoint PNG Paeth row state

The test applies PNG filter type 4 (Paeth) to controlled RGBA scanlines. A checkpoint stores exactly the prior reconstructed row every 32 rows. Every queried band reconstructed from the nearest checkpoint was byte-identical to replaying from row zero.

The durable result is dependency-work reduction (71.5%), not the Python timing itself. This begins *after* compressed bytes have been inflated; ordinary PNG DEFLATE still needs its own seek/checkpoint strategy before this becomes a file-level ROI decoder.

## R320 — Gram cache after a fixed FIR effect

Six synchronized stems were filtered once by the same fixed 65-tap FIR. The candidate cached the 6×6 Gram matrix of those filtered stems. For 180 random gain vectors, `g^T G g` matched directly mixed-and-measured output to maximum relative error 9.66e-16.

The cache is tiny (288 bytes) but construction cost matters: 7.81 ms to build, then 0.087 ms for all cached queries, versus 10.78 ms direct. This is an amortized analysis optimization, not a replacement for producing output samples.

## R321 — Exact IIR seek checkpoints

A stable biquad was run in a fixed float64 direct-form recurrence. Storing its complete two-value state every 1024 samples allowed later segment requests to resume from the nearest checkpoint and reproduce the sequential oracle **bit-for-bit** for all tested positions.

For the measured seeks, processed input fell from 143,790 to 4,526 samples and runtime from 73.77 to 2.28 ms. The checkpoint state occupied only 1104 bytes in this fixture. Coefficient, precision, denormal, and processing-order identity are part of the cache key.

## R322 — Animated-image disposal checkpoints

The controlled compositor exercised GIF-style keep, restore-to-background, and restore-to-previous semantics over 120 frames. Checkpoints store the canvas *after prior disposal* and before the checkpoint frame. Random seeks from those states reproduced the uninterrupted oracle exactly.

The workload reduced frame compositions from 23,361 to 2,171, at a retained-state cost of 294,912 bytes. This proves the state-checkpoint concept; parsing palettes, transparency, interlace, timing, and malformed real GIF streams remain separate qualification.

## R323 — Merkle-proof cached-range verification

A 16 MiB object was split into 256 fixed 64 KiB leaves under a SHA-256 binary Merkle tree. Each leaf requires 8 sibling hashes—a 256-byte proof—to authenticate against the trusted root. All tested authentic leaves passed, while a one-bit mutation was rejected.

The timing baseline re-establishes whole-object SHA-256 identity for every independent range request; if an application already has a trusted current whole-object verification result and immutable cache state, it would not need to repeat that baseline. The useful claim is narrower: a range can be cryptographically tied to a trusted object root without reading the other 255 leaves.

## Evidence boundary

These are component/sandbox experiments. Host FFmpeg process timings do not predict Wasm cost. R319 begins after inflation. R320 answers a scalar quadratic metric, not rendered audio. R322 uses a controlled GIF-style composition model, not a full GIF parser. R323 assumes authenticated immutable tree metadata. No production Demuxe file was changed.