<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# ETC1S video to two GPU formats

Pinned Basis encoder/transcoder built; genuine two-frame ETC1S texture video transcoded to BC1 and BC3 and rendered through actual WebGPU. Both destinations preserve frames/order through forward, reverse and repeat probes. Native PNG exact gate differs by one channel code at interpolation; independent normalized-endpoint/nearest-rounding math matches every GPU byte. Original failure retained; absent-tool blocker resolved.

Exact native-PNG gate failed with maximum channel difference 1. A green block interpolates endpoint values 8 and 0 at weight 1/3: CPU reference produces 2, GPU produces 3. Independent normalized RGB565 endpoint math with nearest rounding matches all five actual renders exactly. This diagnosis is separate from the unchanged failed gate and does not introduce a silent tolerance. Truncated blocks rejected; deliberate block corruption changed output; no GPU validation errors; buffers/textures/device destroyed.

Two 16x16 opaque prepared frames only. Host native transcoding, not browser Wasm. Native reference is floor-rounded, GPU is nearest-rounded on observed blocks. No general alpha, long-video temporal state, source-cancel, upload backpressure, CPU/memory/latency or shipping route qualification.

Declare explicit compressed-codec reconstruction precision contract, preserving original exact-native-PNG negative, then test alpha and temporal dependencies/cancellation with browser transcoder before any performance comparison.
