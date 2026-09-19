<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Audio stage reconciliation

Actual unchanged PCMOutput reproduced all 4096 float32 samples through symbolic post-FIR zero spans, media clock, epoch and close; wrong early-zero control loses three nonzero tail samples. Component feasibility passes. Ring materialization and detection scan remain, so no allocation/CPU saving claim.

Next: Measure a real zero-span producer after stateful processing and its transport benefit; browser scheduling and source replacement integration remain unqualified.

This is research evidence; production behavior and release qualification are unchanged. Original definitions and historical records remain intact.
