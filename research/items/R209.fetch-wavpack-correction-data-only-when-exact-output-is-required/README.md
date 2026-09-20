<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Fetch WavPack correction data only when exact output is required

Full key: `R209.fetch-wavpack-correction-data-only-when-exact-output-is-required`

Current decision: **stop_current_profile** (2026-09-20T00:00:33.526850+00:00).

Actual libwavpack5.9 hybrid stereo48k source384000frames; base-only intentionally differs, full correction exact, explicit lossy prefix then exact suffix from192000 tested. Hash-bound correction block map supports local range reads and rejects wrong source/manifest, cancellation, unaligned switch and truncation. Initial suffix-only correction yields exact suffix but decoder error for missing first block; preserved failed variant. Fetching first correction block plus suffix resolves actual decoder error. Five paired ten-playback jobs include complete correction-map setup:1680110 correction bytes vs2219900 baseline ratio0.75684 fails predeclared<=0.7; total base+correction ratio0.89834. Wall medians663.312vs867.815ms are noisy secondary observations, not CPU or network measurements.

Stop this ten-playback first-block-plus-suffix profile at its declared30% correction-byte saving gate; observed24.3% remains a real lesser saving. Reopen with different workload or a decoder API that does not require the first correction block. No silent lossless admission when correction is missing; no native browser/network/Wasm or production integration claim.

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

[Run](../../shared/runs/20260920T000033Z-wavpack-correction/run.json) · [Analysis](../../shared/runs/20260920T000033Z-wavpack-correction/analysis.md) · [Manifest](../../shared/runs/20260920T000033Z-wavpack-correction/manifest.json) · [History](history.jsonl) · [Evidence](evidence/index.json)
