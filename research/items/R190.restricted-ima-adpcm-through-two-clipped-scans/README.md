<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# restricted IMA ADPCM through two clipped scans

Full key: `R190.restricted-ima-adpcm-through-two-clipped-scans`

Current decision: **stop_current_profile** (2026-09-19T23:33:14.118808+00:00).

Actual mono/stereo IMA-WAV parser feeds work-efficient compiled clipped-transition prefix scans: four-thread local prefixes/carry correction for step-index, then predictor. All8164mono and8136stereo frames exactly match compiled ordinary sequential decoder and installedFFmpeg8.1.2. Twenty-five extreme predictor/index synthetic cases also exact; invalid index rejected before publication. Current per-shift delta rule is explicitly pinned; old product-rounding formula disagrees at first sample13vs11 and is preserved in fixture run. Five alternating complete mono+stereo source/hash/WAVparse/nibble serialization/process/table/thread setup/output read/reinterleave jobs439.182ms parallel versus317.401ms compiled serial median ratio1.38368 fails<=0.9.

Stop this cold per-block threaded clipped-scan profile. Associative scan correctness is demonstrated with actual work-efficient CPU implementation and all transfer/synchronization costs charged, but no speedup here. A persistent runtime, larger blocks or GPU implementation needs new full-pass evidence; do not propagate across IMA arithmetic variants or claim currentFFmpeg equivalence for older rounding.

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

[Run](../../shared/runs/20260919T233314Z-ima-scan/run.json) · [Analysis](../../shared/runs/20260919T233314Z-ima-scan/analysis.md) · [Manifest](../../shared/runs/20260919T233314Z-ima-scan/manifest.json) · [History](history.jsonl) · [Evidence](evidence/index.json)
