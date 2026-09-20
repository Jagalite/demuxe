<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# WebM Cues placement changes request timing, not total work here

Current decision: **pursue**. Equal-size front and tail Cues representations preserve every encoded packet hash and reject invalid relocated pointers. All 22 cold browser target pictures equal the independent original source. Under 256KiB responses with 20ms delay, front Cues save median 18.05% complete metadata/seek/picture/cleanup latency (95% bootstrap [12.46%,27.38%]); median total bytes improve only 2.86%. Two candidate owners transfer 45.71% more bytes, retained as variability, so this is timing rather than uniform traffic reduction.

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | New executable probe and declared workload/controls registered with source/input/runtime evidence. |
| screen | passed | Equal-size front and tail Cues representations preserve every encoded packet hash and reject invalid relocated pointers. All 22 cold browser target pictures equal the independent original source. Under 256KiB responses with 20ms delay, front Cues save median 18.05% complete metadata/seek/picture/cleanup latency (95% bootstrap [12.46%,27.38%]); median total bytes improve only 2.86%. Two candidate owners transfer 45.71% more bytes, retained as variability, so this is timing rather than uniform traffic reduction. |
| correctness | passed | All packet timing/flags/payload hashes identical under independent FFprobe, all source Clusters unchanged. Independent original native picture at25.0167s matches all22 front/tail owners; bad relocated cue pointer rejected; each owner closes. |
| performance | passed | Predeclared11 alternating fresh-owner pairs, actual cold file read/hash, metadata, seek, full640x360RGBA hash and cleanup. Median saving18.05% exceeds5%; median byte ratio.9714 below1.1. 95% median saving interval[12.46%,27.38%]. Offline authoring separately measured1.64/2.03ms; this is static authored representation, not runtime per-seek rewriting. No universal network benefit. |
| results | passed | Actual new execution raw outcomes, controls and scoped interpretation retained. |
| decision | passed | pursue: Equal-size front and tail Cues representations preserve every encoded packet hash and reject invalid relocated pointers. All 22 cold browser target pictures equal the independent original source. Under 256KiB responses with 20ms delay, front Cues save median 18.05% complete metadata/seek/picture/cleanup latency (95% bootstrap [12.46%,27.38%]); median total bytes improve only 2.86%. Two candidate owners transfer 45.71% more bytes, retained as variability, so this is timing rather than uniform traffic reduction. |

Next/reopen: Consider front Cues when authoring this static WebM profile; measure representative networks before integration. No general request-count or traffic-reduction claim.

[Current contract](item.json) · [History](history.jsonl) · [Evidence](evidence/index.json)
