<!-- SPDX-License-Identifier: CC-BY-4.0 -->

Actual restricted CABAC residual-block checkpoint foundation passed: eight 4x4 non-DC luma blocks after coded-block flag restore in a fresh Wasm module using 1604-byte pointer-free records plus source-bound RBSP. Complete binary-symbol traces, coefficients, arithmetic registers, all 1024 contexts and all 120 neighbor bytes match uninterrupted parser state; independent host decoding confirms 30 full pictures unchanged. Corrupt context/neighbor checks and wrong-source imports reject; deliberately omitted neighbor state changes all eight post-state oracles. Five alternating cold component cost pairs, charging initial prefix decode/sidecar generation, serialization, source retention, new module restoration, ten replay sets and cleanup, cost 1.410x baseline (range 1.218–2.196), failing the predeclared <=0.9 threshold. This is one-block residual syntax continuation, not full mid-slice macroblock grammar or reconstructed-picture restart. The full target remains a setup block, not an experimental codec failure.

- Only progressive 8-bit non-DC 4x4 luma residual category2, after coded_block_flag; not block grammar before that flag.
- Source-independent output oracle is full host-decoded YUV; suffix syntax/state oracle is uninterrupted pinned FFmpeg parser (same algorithm, separate fresh replay state).
- Recorded source is the whole compressed RBSP and checkpoint includes qmul/scan/initial block; no output trace or expected coefficient supplied to replay.
- No whole-memory snapshot: fresh zeroed H264 structs are populated with named logical fields and rebased source pointers.
- Neighbor omission control proves entire restored post-state differs; not claim neighbor values influence this already-selected residual parser branch.
- Baseline repeats instrumented prefix parsing/export and candidate restores same requested eight residual blocks; complete-slice consumer remains absent.
- One bounded 30-frame 160x96 CABAC I/P source, no field/high-bit-depth/8x8/DC/general entropy grammar.
- Runtime module fetch/compile/initialization measured; offline compiler/library construction is installation setup, not claimed runtime sidecar preparation.
- Wasm engines may cache compilation across pages; alternating paired trials and range retained, no energy/production claims.

Next: Implement an explicit complete macroblock-boundary schema covering macroblock position, prediction/motion/reference/QP and neighbor caches, then continue complete slice syntax and reconstruct suffix pictures independently. Include non-RAP/reference dependencies, source change/cancel, and whole-job preparation/retention cost. Do not reuse the residual-only timing as a full-slice performance verdict.
