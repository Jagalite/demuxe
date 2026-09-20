<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# FLAC frame-range microstream

Full key: `R223.flac-frame-range-microstream.report-continuity`

Current decision: **stop_current_profile** (2026-09-19T22:23:12.889048+00:00).

Actual8s48kstereoFLAC has84frames; original42-frame suffix starting193536 yields190464samples/3.968s with truthfultotal and explicitlyunknownzeroMD5. Everycompletecodedframe hash unchanged; hostPCM and allChrome native/reference/render float samples exactly match continuoussuffix. CorruptedCRC rejected. Five alternating coldindex/read/copy/microdecode pairs64.865ms versus34.579ms fullsource decode+crop, ratio1.87585 fails0.9. Separate encodedmicrofile randomseek testfails libFLAC SEEK_ERROR at1/5000/189952 dueunchangedabsolute frame numbers; sequentialmicrodecode remains valid.

Stop current cold indexed suffix-microdecode costprofile; pursue no productionroute from this result. Exactsequential source-range restart is demonstrated, but standalone encodedfile randomseek is not. Reopen on cachedindex/range-source workload with fullcost and truthfulmetadata. Headerrebasing changescompleteframeidentity and is separate variant.

Shared immutable component run; no production qualification.

| Stage | Status |
| --- | --- |
| define | passed |
| prepare | passed |
| screen | passed |
| correctness | passed |
| performance | failed |
| results | passed |
| decision | passed |

[Run](../../shared/runs/20260919T222312Z-flac-microstreams/run.json) · [Analysis](../../shared/runs/20260919T222312Z-flac-microstreams/analysis.md) · [Manifest](../../shared/runs/20260919T222312Z-flac-microstreams/manifest.json) · [History](history.jsonl) · [Evidence](evidence/index.json)
