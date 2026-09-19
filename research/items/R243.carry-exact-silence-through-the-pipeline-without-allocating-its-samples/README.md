<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Carry exact silence through the pipeline without allocating its samples

Full identity: `R243.carry-exact-silence-through-the-pipeline-without-allocating-its-samples`.

Current decision: **pursue** (2026-09-19T19:59:33.240223+00:00).

Actual unchanged PCMOutput reproduced all 4096 float32 samples through symbolic post-FIR zero spans, media clock, epoch and close; wrong early-zero control loses three nonzero tail samples. Component feasibility passes. Ring materialization and detection scan remain, so no allocation/CPU saving claim.

## Contract

Represent validated zero intervals symbolically while preserving output clock and every nonzero filter tail. Materialize for unsupported, nonlinear or noise-producing stages; compare with existing silence optimizations.

Next action: Measure a real zero-span producer after stateful processing and its transport benefit; browser scheduling and source replacement integration remain unqualified.

## Stages

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Source-grounded contract retained; current scope and falsifier narrowed in run analysis. |
| prepare | passed | Generated deterministic signal, independent FIR convolution, wrong-tail control, and actual unchanged PCMOutput source pinned. |
| screen | passed | Actual unchanged PCMOutput reproduced all 4096 float32 samples through symbolic post-FIR zero spans, media clock, epoch and close; wrong early-zero control loses three nonzero tail samples. Component feasibility passes. Ring materialization and detection scan remain, so no allocation/CPU saving claim. |
| correctness | passed | Scoped Node PCMOutput component fidelity and epoch/close controls passed; no browser or upstream producer qualification. |
| performance | pending | No benchmark: payload counts exclude descriptors, scan, ring materialization and browser cost. |
| results | passed | Commands, output identities, source/runtime manifest, limitations and expected adverse outcomes captured. |
| decision | passed | Scoped disposition recorded; integration and release qualification remain separate. |

[Run and environment](evidence/20260919T195933Z-symbolic-silence/run.json) · [Results](evidence/20260919T195933Z-symbolic-silence/results.json) · [Manifest](evidence/20260919T195933Z-symbolic-silence/manifest.json) · [Current metadata](item.json) · [History](history.jsonl) · [All evidence](evidence/index.json)

No production integration or release qualification is claimed. Historical bytes and original definition retained.
