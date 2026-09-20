<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Parallelize phase-vocoder accumulation without resetting phase at job boundaries

Full key: `R351.parallelize-phase-vocoder-accumulation-without-resetting-phase-at-job-boundaries`

Current decision: **stop_current_profile** (2026-09-20T00:05:14.434491+00:00).

Actual four spawned worker simple phase-vocoder prefix accumulation: Hann1024/hop256/rate0.8, adjacent interpolation, ties-even residual wrap, ordered cross-worker phase carry, complete inverse FFT/normalized overlap-add cropped to120000samples. Independent sequential phase loop waveform max absolute error1.882e-12<=1e-9; resetting phase at each job yields0.724error. All worker executors close. Five alternating complete cold source/hash/STFT/process transfer/startup/prefix/compose/iFFT/OLA jobs373.316ms versus sequential27.632ms ratio13.5103 fails0.9. Uncropped tail diagnostic retained; no transient fidelity claim.

Stop this process-based simple phase-vocoder profile on end-to-end cost. Correct boundary phase is demonstrated, but repeated prestarted shared-memory work or another explicitly chosen stretcher requires new gates. No production time-stretch replacement or maintained renderer qualification.

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

[Run](../../shared/runs/20260920T000514Z-phase-scan/run.json) · [Analysis](../../shared/runs/20260920T000514Z-phase-scan/analysis.md) · [Manifest](../../shared/runs/20260920T000514Z-phase-scan/manifest.json) · [History](history.jsonl) · [Evidence](evidence/index.json)
