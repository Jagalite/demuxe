<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Tune FLAC effort without changing frame duration

Full key: `R071.tune-flac-effort-without-changing-frame-duration`

Current decision: **stop_current_profile** (2026-09-19T22:38:22.367612+00:00).

ActualmaintainedWasmadapter source copied/linkedisolated atFLAClevels0/5 againstsamecachedlockedFFmpeg7.1.1 libraries; explicitframe_size4608bothprofiles. Two30s48kstereoS16tonal/seedednoise sources: all1440000samples perchannel exacthost/nativebrowser,720copiedH264packets unchanged,313FLACpackets with312x4608+2304durationidentical. ActualnativeMSEseek/audiblePCM/nearendEOF andowner cleanup passallfour; cancellation after20actualadaptersteps terminatesreader/worker andfreshjobpasses. Fivealternating fullworker/File-reader setup+Wasmencode+transfer+nativedecode/render pairs:tonal749.845ms vs743.720ms ratio1.00824,bytes1.85582;noise689.940ms vs752.485ms ratio0.91688,bytes1.07099. Bothfail declaredcost<=0.9 andbytes<=1.25 combinedgate; tonalbytepenaltyalone large.

Stop general level0-at-fixed4608frames profile. Noise improvesmeasuredcost8.3percent but missespredeclared10percent; no repeat-to-pass. MatchedWasmproduction-family encoder gap resolved withouteditingservedruntime orproduction source. Fixedframe research policy is explicit and notthedefaultencoderconfiguration; noautomaticlevelchange or physicalplayback claim.

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

[Run](../../shared/runs/20260919T223822Z-flac-effort/run.json) · [Analysis](../../shared/runs/20260919T223822Z-flac-effort/analysis.md) · [Manifest](../../shared/runs/20260919T223822Z-flac-effort/manifest.json) · [History](history.jsonl) · [Evidence](evidence/index.json)
