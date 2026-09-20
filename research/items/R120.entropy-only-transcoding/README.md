<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Entropy-only transcoding

Full identity: `R120.entropy-only-transcoding`.

Current decision: **pursue** (actual_full_stream_entropy_translation_and_full_slice_restart).

Actual restricted CABAC-to-CAVLC syntax translation preserves 117,746 nonzero coefficients and all 78 independently decoded I/P pictures. Final clean-build complete-job cost is 0.824175x lossless pixel decode/reencode baseline (8 alternating pairs); 70,639 versus 153,570 output bytes. This establishes a restricted native entropy-conversion operation, not passthrough savings, Baseline-only hardware compatibility or a playback-tier increase.

Next action: Retain as a qualified restricted research operation. Production integration requires explicit admission checks and broader decoder/content/browser validation; only extend codec tools with new exact syntax and picture oracles.

## Stages

| Stage | Status | Basis |
|---|---|---|
| define | passed | Restricted actual 4:2:0 I/P CABAC input, exact quantized syntax and independently reconstructed output contract, adverse controls and <=0.9 whole-job threshold declared before measurement. |
| prepare | passed | Pinned MIT parser, original writer/checkpoint extensions, independent FFmpeg oracle, four generated profiles and cold clean locked build verified. |
| screen | passed | Real quantized CABAC syntax translated to CAVLC and full mid-slice macroblock parsing restarted in new processes; no fallback or pixel encoding in translation. |
| correctness | passed | 78 exact independently decoded pictures and matching original quantized syntax; fresh-process complete-slice restores, multiple boundaries, wrong coefficient/state/source and interruption controls passed. |
| performance | passed | Final rebuilt eight alternating equivalent complete-job pairs, predeclared <=0.9 median ratio: 0.824175; observed range 0.792708–0.846725. |
| results | passed | Actual restricted CABAC-to-CAVLC syntax translation preserves 117,746 nonzero coefficients and all 78 independently decoded I/P pictures. Final clean-build complete-job cost is 0.824175x lossless pixel decode/reencode baseline (8 alternating pairs); 70,639 versus 153,570 output bytes. This establishes a restricted native entropy-conversion operation, not passthrough savings, Baseline-only hardware compatibility or a playback-tier increase. |
| decision | passed | Actual restricted CABAC-to-CAVLC syntax translation preserves 117,746 nonzero coefficients and all 78 independently decoded I/P pictures. Final clean-build complete-job cost is 0.824175x lossless pixel decode/reencode baseline (8 alternating pairs); 70,639 versus 153,570 output bytes. This establishes a restricted native entropy-conversion operation, not passthrough savings, Baseline-only hardware compatibility or a playback-tier increase. |

[New run](../../shared/runs/20260920T040000Z-entropy-full-slice/run.json) · [Evidence index](evidence/index.json) · [Complete history](history.jsonl) · [Item contract](item.json)
