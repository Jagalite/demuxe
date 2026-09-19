<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# prepared texture video to several GPU destinations

Current disposition: **pursue**. Setup blocker resolved. Correctness and performance **pending**; define, prepare, screen, results and decision passed.

Pinned Basis encoder/transcoder built; genuine two-frame ETC1S texture video transcoded to BC1 and BC3 and rendered through actual WebGPU. Both destinations preserve frames/order through forward, reverse and repeat probes. Native PNG exact gate differs by one channel code at interpolation; independent normalized-endpoint/nearest-rounding math matches every GPU byte. Original failure retained; absent-tool blocker resolved.

Two 16x16 opaque prepared frames only. Host native transcoding, not browser Wasm. Native reference is floor-rounded, GPU is nearest-rounded on observed blocks. No general alpha, long-video temporal state, source-cancel, upload backpressure, CPU/memory/latency or shipping route qualification.

Next: Declare explicit compressed-codec reconstruction precision contract, preserving original exact-native-PNG negative, then test alpha and temporal dependencies/cancellation with browser transcoder before any performance comparison.

[Current record](item.json) · [History](history.jsonl) · [Analysis](evidence/20260919T200653Z-basis/analysis.md) · [Results](evidence/20260919T200653Z-basis/results.json)
