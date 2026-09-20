<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Replace general FLAC predictors with equivalent fixed predictors

Full key: `R234.replace-general-flac-predictors-with-equivalent-fixed-predictors`

Current decision: **stop_current_profile** (2026-09-19T23:25:33.880396+00:00).

Actual authored zero-shift LPC coefficients exactly equal fixed predictors1..4; converter preserves every warmup and Rice residual bit while changing predictor syntax/framing. All1028samples match original and independent ordinary encoding exactly in FFmpeg/Chrome, libFLAC integrity/render/end/closed pass. Near coefficient, nonzero shift, CRC and truncation reject. A real ordinary FFmpeg encoding of same PCM had one order7/shift13 non-binomial LPC subframe and zero eligible opportunities; no broader prevalence inference. Five cold transform/write/decode jobs48.462ms versus simply decoding original already-valid LPC41.689ms ratio1.16245 fails<=0.9. Authored output2066 vs2075bytes.

Stop this cold LPC-syntax conversion profile. Mathematical conversion is exact only for admitted zero-shift binomial predictors, but direct decoding is cheaper here and the one ordinary encoding showed no opportunity. Do not invent re-encoding work in baseline or infer normal-catalogue exposure from authored equivalent fixtures. Reopen only with measured eligible frequency or repeated-decode savings including preparation.

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

[Run](../../shared/runs/20260919T232533Z-flac-lpc/run.json) · [Analysis](../../shared/runs/20260919T232533Z-flac-lpc/analysis.md) · [Manifest](../../shared/runs/20260919T232533Z-flac-lpc/manifest.json) · [History](history.jsonl) · [Evidence](evidence/index.json)
