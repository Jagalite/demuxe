<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Parallelize recursive audio effects by correcting each chunk’s initial state

Full key: `R245.parallelize-recursive-audio-effects-by-correcting-each-chunks-initial-state`

Current decision: **stop_current_profile** (2026-09-19T23:09:55.373840+00:00).

Actual four-process zero-state chunk filtering and affine missing-history correction of96000samples plus4096zero tail. Complete100096outputs match ordinary scalar IIR recurrence within1.943e-16 under1e-12 tolerance; omitted correction changes output. Three/four actual worker PIDs per job captured; source/filter/cancel guards, queued-future cancellation and process-pool shutdown pass. Five alternating complete cold source/hash/process startup/serialization/scheduling/transfer/correction/aggregation/shutdown jobs157.772ms versus serial31.945ms ratio4.93891 fails<=0.9. Numeric source+zero-block payload1601536bytes is explicitly notRSS.

Stop this cold Python process-pool chunk-correction profile. The mathematical correction works at declared tolerance and full requested tail, but scheduling/transfer/startup dominate this workload. Persistent workers, another runtime or larger workload require a new matched predeclared experiment; no automatic route or general exact floating-point parallelization claim.

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

[Run](../../shared/runs/20260919T230955Z-filter-parallel/run.json) · [Analysis](../../shared/runs/20260919T230955Z-filter-parallel/analysis.md) · [Manifest](../../shared/runs/20260919T230955Z-filter-parallel/manifest.json) · [History](history.jsonl) · [Evidence](evidence/index.json)
