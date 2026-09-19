<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Browser-side video normalization

Current disposition: **pursue**. Historical execution reconciled; no new media run.

Actual browser VP9 decode to AVC VideoEncoder to decoder: all72 frames and timestamps retained, every visible RGB frame exceeds32dB PSNR for explicitly lossy output. Wrong timestamp order rejected. Component viability only; source audio/mux/route costs not qualified.

Correctness: **passed**. Performance: **pending**.

All 72 VP9→AVC frames retain PTS; every visible RGB comparison exceeds the predeclared 32 dB lossy threshold (observed samples exceed 56 dB). Wrong timestamp order rejects; codecs close without errors. Accepted only for bounded lossy frame normalization, not mux/audio/route.

Next: Measure complete decode/encode/mux cost only for an explicit lossy-use workload; add source cancellation before integration.

[Current record](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json) · [Acceptance review](../../shared/runs/20260919T201644Z-top100-31-65-reconciliation/analysis.md)
