<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# exact FLAC smart-cut/concat

Full key: `R270.exact-flac-smart-cut-concat`

Current decision: **stop_current_profile** (2026-09-19T20:56:27.118329+00:00).

Real exact smartcut exports retain the proven63828-sample output and12 copied interior subframes, but whole export median369.428ms versus41.722ms fresh FFmpeg trim/reencode is8.85446x, failing0.90 target. Includes packet scans, Python CRC/header work, two edge decoder/encoder jobs, reads/writes and teardown;14 exports independently decode exact.

Stop this short-clip Python/subprocess smartcut cost profile. Reopen with a persistent in-process edge codec/frame index or materially longer export workload; no cost inference from copied-frame count.

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

[Run](../../shared/runs/20260919T205627Z-flac-cost/run.json) · [Analysis](../../shared/runs/20260919T205627Z-flac-cost/analysis.md) · [Manifest](../../shared/runs/20260919T205627Z-flac-cost/manifest.json) · [History](history.jsonl) · [Evidence](evidence/index.json)
