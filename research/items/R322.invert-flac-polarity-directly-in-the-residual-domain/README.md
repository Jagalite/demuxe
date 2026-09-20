<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Invert FLAC polarity directly in the residual domain

Full key: `R322.invert-flac-polarity-directly-in-the-residual-domain`

Current decision: **pursue** (2026-09-19T23:06:13.478041+00:00).

Actual signed16 FLAC fixed predictors0 through4,21bit escape residuals: warmups/residuals negated and frame CRCs regenerated. Streaming recurrence checks sample headroom with at most4 previous samples, so no claim of avoiding all reconstruction work. Every2570 output sample matches independent integer polarity oracle in host and Chrome; double inversion restores original compressed bytes. Each predictor rejects -32768 both at first sample and predicted body; generalLPC with validCRC, residual overflow, CRC corruption and truncation reject. Independent libFLAC integrity and native render/end/closed pass. Five alternating full source-read/parse/headroom-check/coded-transform/write/destination-decode jobs49.868ms versus ordinary decode/PCM-negate/FLAC-encode/destination-decode95.074ms ratio0.52452 passes<=0.9; output/source bytes1.0.

Pursue only standalone lossless polarity-inverted FLAC for admitted fixed predictors0..4 with these bounded escape residuals and validated integer headroom. This is not a comparison against simply negating already-decoded playback PCM, and sample reconstruction for validation remains charged. Rice partitions, shifted LPC, broader workloads and production integration remain unqualified; no default route change.

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

[Run](../../shared/runs/20260919T230613Z-flac-polarity/run.json) · [Analysis](../../shared/runs/20260919T230613Z-flac-polarity/analysis.md) · [Manifest](../../shared/runs/20260919T230613Z-flac-polarity/manifest.json) · [History](history.jsonl) · [Evidence](evidence/index.json)
