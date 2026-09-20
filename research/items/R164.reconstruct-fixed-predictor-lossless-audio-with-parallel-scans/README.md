<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Reconstruct fixed-predictor lossless audio with parallel scans

Full key: `R164.reconstruct-fixed-predictor-lossless-audio-with-parallel-scans`

Current decision: **stop_current_profile** (2026-09-19T23:12:00.504788+00:00).

Real fixed-order1 FLAC escape-residual entropy traversal feeds compiled four-thread local scans, carry composition and four-thread output correction. All6168 signed16 samples including extrema exactly match independent FFmpeg and compiled serial predictor recurrence. Actual source-read/hash/entropy parser/intermediate file transfer/executable startup/output read and thread creation/join included equally; serial baseline is compiled, not Python-loop comparison. Identity, CRC, truncation, valid-CRC wrong predictor guards reject; omitted carry changes PCM. Five alternating complete jobs103.304ms parallel versus59.639ms serial median ratio1.73214 fails<=0.9; raw timings variable and retained. Original compiled kernel and build command pinned.

Stop this short24-block cold threaded scan profile. Parallel prefix reconstruction is demonstrated only for fixed-order1 escape residuals; measured small workload does not amortize threads/process/transfer costs. Larger blocks, persistent ownership or a different runtime require new declared measurements. No generic Rice decode or full FLAC parallel decoder qualification, and no production edits.

No production integration or release qualification. Original provisional directory renamed after capture; replay into a new output directory. Exact original protocol and all measured samples retained.

| Stage | Status |
| --- | --- |
| define | passed |
| prepare | passed |
| screen | passed |
| correctness | passed |
| performance | failed |
| results | passed |
| decision | passed |

[Run](../../shared/runs/20260919T231200Z-flac-scan/run.json) · [Analysis](../../shared/runs/20260919T231200Z-flac-scan/analysis.md) · [Manifest](../../shared/runs/20260919T231200Z-flac-scan/manifest.json) · [History](history.jsonl) · [Evidence](evidence/index.json)
