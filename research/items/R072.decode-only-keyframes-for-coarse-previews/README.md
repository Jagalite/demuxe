<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Decode only keyframes for coarse previews

Disposition: **pursue**. correctness: **passed**, performance: **passed**.

Implemented an explicit source-scoped coarse-keyframe job contract and actual144-frame720p H264 test withBframes andclosed24-frameGOPs. All six candidate320x180 RGB images match independent full-decode-from-start reference exactly; outputPTS0..5seconds match full decoder. Every admitted key packet contains a real IDR NAL, not merely anI-picture label. Wrongsource, ordinaryexactplaybackintent, unprovenopenGOP andnonkeyframe requests reject. Nine alternating coldhostprocess tasks include demux/decode/scale/write/read/exit: full-decode/select 88.266ms vs skip_frame=nokey 44.696ms; saving49.36%,95%[43.90553400896843, 55.51652174356154], passes10%lower-boundgate. This qualifies an explicit host coarse-storyboard job, not an arbitraryexactseek, browser/Wasm integration, cache, or silent ordinaryplayback frame dropping.

Next: Scoped host coarse-preview gates complete. Retain explicit coarse intent, independently proved IDR boundaries and actual sourcePTS. Browser/persistentdecoder integration or openGOP eligibility requires a separate bounded contract.

[Current record](item.json) · [History](history.jsonl) · [Run analysis](evidence/20260919T220620Z-coarse-job/analysis.md)
