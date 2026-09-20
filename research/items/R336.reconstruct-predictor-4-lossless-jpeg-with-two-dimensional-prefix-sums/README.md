<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Reconstruct predictor-4 lossless JPEG with two-dimensional prefix sums

Full key: `R336.reconstruct-predictor-4-lossless-jpeg-with-two-dimensional-prefix-sums`

Current decision: **stop_current_profile** (2026-09-20T00:16:58.867872+00:00).

Actual SOF3 grayscale8bit predictor4/Pt0/no-restart Huffman JPEG384x256: all98304 parsed signed residuals match independently derived image differences; two modular row/column NumPy prefix scans with128initial seed reconstruct every pixel exactly against authored pixels and independent FFmpeg decoder. Initial row/column, negative wrap residuals and positive residuals pass; wrong seed, truncated entropy, wrong predictor and restart controls detected. Five alternating full cold Python/NumPy startup/read/parse/scans/write171.471ms vs ordinary FFmpegdecode/write34.703ms ratio4.94112 fails0.9. No GPU execution or generic Huffman/restart/precision admission.

Stop this CPU Python entropy/two-scan implementation on complete cost. A compiled parser or GPU parallel scan may reopen under the same exact boundary contract and a new end-to-end benchmark. Only the explicit canonical four-bit category Huffman table and one-million-pixel bound are admitted; no JPEG-LS or predictor substitution claim.

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

[Run](../../shared/runs/20260920T001658Z-jpeg-scan/run.json) · [Analysis](../../shared/runs/20260920T001658Z-jpeg-scan/analysis.md) · [Manifest](../../shared/runs/20260920T001658Z-jpeg-scan/manifest.json) · [History](history.jsonl) · [Evidence](evidence/index.json)
