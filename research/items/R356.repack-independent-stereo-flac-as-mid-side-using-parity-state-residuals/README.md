<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Repack independent stereo FLAC as mid-side using parity-state residuals

Full key: `R356.repack-independent-stereo-flac-as-mid-side-using-parity-state-residuals`

Current decision: **pursue** (2026-09-19T23:43:28.584526+00:00).

Actual independent stereo signed16 FLAC fixed-order1/Rice residuals transformed into valid mid-side FLAC. One-bit sum parity yields exact mid residual floor behavior and side residual difference; side warmup17bits, no full L/R amplitude reconstruction in transform. All3084stereo frames match original PCM exactly in host and Chrome including negative odd sums and signed16 extrema; dropping parity changes6084samples. Already-coupled source, CRC and truncation reject; libFLAC integrity and native render/end/closed pass. Five full cold read/parse/parity/Ricewrite/destination-decode jobs median103.409ms versus ordinary explicitmid_sideFLAC encode/destination-decode446.736ms ratio0.23148 passes<=0.9. Timings are highly variable and retained; candidate faster4of5pairs. Output6614/source8706bytes ratio0.75971 passes<=1.25.

Pursue bounded Rice-coded fixed-order1 independent stereo repacking for requested standalone mid-side FLAC. This is not a comparison against playing original already-valid stereo or proof of normal catalogue exposure; no stable76percent latency promise from noisy hostCLI timings. General predictors, Rice partitions, coupled inputs and production routing remain unqualified.

No production integration or release qualification. Original provisional directory renamed after capture; replay into a new output directory. Exact original protocol and all measured samples retained.

| Stage | Status |
| --- | --- |
| define | passed |
| prepare | passed |
| screen | passed |
| correctness | passed |
| performance | passed |
| results | passed |
| decision | passed |

[Run](../../shared/runs/20260919T234328Z-flac-parity/run.json) · [Analysis](../../shared/runs/20260919T234328Z-flac-parity/analysis.md) · [Manifest](../../shared/runs/20260919T234328Z-flac-parity/manifest.json) · [History](history.jsonl) · [Evidence](evidence/index.json)
