<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Share one decoded audio source across many sample-rate consumers

Full key: `R327.share-one-decoded-audio-source-across-many-sample-rate-consumers`

Current decision: **stop_current_profile** (2026-09-19T20:56:27.118329+00:00).

Actual bounded fanout preserves all three sample-rate outputs. A stalled third consumer is terminated while two survivors remain exact; source1 is terminated midstream, all jobs reaped, distinct source2 restarts exactly, and an actual stale epoch publish cannot enter new queues. Queue payload never exceeds8192bytes per consumer. Matched host wall median41.852ms shared versus35.306ms three concurrent independent decoders is1.18542x and fails0.90 target.

Stop this four-process shared-source optimization profile for2s FLAC. Reopen with an expensive source decoder or in-process shared resamplers and repeat equal-work measurement; opaque process/pipe memory and energy remain unmeasured.

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

[Run](../../shared/runs/20260919T205627Z-shared-source-cost/run.json) · [Analysis](../../shared/runs/20260919T205627Z-shared-source-cost/analysis.md) · [Manifest](../../shared/runs/20260919T205627Z-shared-source-cost/manifest.json) · [History](history.jsonl) · [Evidence](evidence/index.json)
