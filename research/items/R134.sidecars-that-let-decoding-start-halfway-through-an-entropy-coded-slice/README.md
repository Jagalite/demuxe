<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Sidecars that let decoding start halfway through an entropy-coded slice

Current decision: **blocked — full restart setup**. Actual residual component: correctness passed, cost failed.

Actual restricted CABAC residual-block checkpoint foundation passed: eight 4x4 non-DC luma blocks after coded-block flag restore in a fresh Wasm module using 1604-byte pointer-free records plus source-bound RBSP. Complete binary-symbol traces, coefficients, arithmetic registers, all 1024 contexts and all 120 neighbor bytes match uninterrupted parser state; independent host decoding confirms 30 full pictures unchanged. Corrupt context/neighbor checks and wrong-source imports reject; deliberately omitted neighbor state changes all eight post-state oracles. Five alternating cold component cost pairs, charging initial prefix decode/sidecar generation, serialization, source retention, new module restoration, ten replay sets and cleanup, cost 1.410x baseline (range 1.218–2.196), failing the predeclared <=0.9 threshold. This is one-block residual syntax continuation, not full mid-slice macroblock grammar or reconstructed-picture restart. The full target remains a setup block, not an experimental codec failure.

Next: Implement an explicit complete macroblock-boundary schema covering macroblock position, prediction/motion/reference/QP and neighbor caches, then continue complete slice syntax and reconstruct suffix pictures independently. Include non-RAP/reference dependencies, source change/cancel, and whole-job preparation/retention cost. Do not reuse the residual-only timing as a full-slice performance verdict.

[Executed foundation](../../shared/runs/20260920T005800Z-cabac-logical-checkpoint/analysis.md) · [Current stages](item.json) · [History](history.jsonl)
