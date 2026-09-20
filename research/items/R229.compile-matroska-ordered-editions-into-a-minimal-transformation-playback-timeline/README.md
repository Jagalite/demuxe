<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Compile Matroska ordered editions into a minimal-transformation playback timeline

Current decision: **pursue**. Actual source-authored Matroska ordered edition77 compiles authorized A0–1s+B0–2s+A0–1s intervals into a4s packet-copy timeline with identical selected AVC/PCM/subtitle configurations. All196 packet hashes/timestamps,96 decoded YUV pictures,192000 PCM samples and4 timed subtitle packets match independent source slices. Five forward/back/repeat virtual seeks exact. Wrong edition, bounds, source hash, linked UID and track role reject. Pursue scoped finite ordered-edition compiler; no browser/production ordered-chapter support inferred.

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | New executable probe and declared workload/controls registered with source/input/runtime evidence. |
| screen | passed | Actual source-authored Matroska ordered edition77 compiles authorized A0–1s+B0–2s+A0–1s intervals into a4s packet-copy timeline with identical selected AVC/PCM/subtitle configurations. All196 packet hashes/timestamps,96 decoded YUV pictures,192000 PCM samples and4 timed subtitle packets match independent source slices. Five forward/back/repeat virtual seeks exact. Wrong edition, bounds, source hash, linked UID and track role reject. Pursue scoped finite ordered-edition compiler; no browser/production ordered-chapter support inferred. |
| correctness | passed | Compiler reads real EBML EditionFlagOrdered, EditionUID, ChapterTimeStart/End and ChapterSegmentUID bytes; trusted source map binds exact files/hashes and track UIDs. Independent source packet/decoded A/V/subtitle oracle exact. Identical AVC extradata/color and selected audio/subtitle configs explicitly checked. Unauthorized/stale/wrong-track/wrong-edition/out-of-bounds controls reject; all child processes exit. Independent chapter boundaries only. |
| performance | not_applicable | Source-defined capability/minimal-transformation endpoint: all encoded packets remain identical and FFmpeg performs copy only. No speed or memory benefit claimed; a full transcode is not the cheapest equivalent baseline and was not manufactured for benchmarking. Repeated/open-ended editions, incompatible tracks and browser-owner transition costs are outside this profile. |
| results | passed | Actual new execution raw outcomes, controls and scoped interpretation retained. |
| decision | passed | pursue: Actual source-authored Matroska ordered edition77 compiles authorized A0–1s+B0–2s+A0–1s intervals into a4s packet-copy timeline with identical selected AVC/PCM/subtitle configurations. All196 packet hashes/timestamps,96 decoded YUV pictures,192000 PCM samples and4 timed subtitle packets match independent source slices. Five forward/back/repeat virtual seeks exact. Wrong edition, bounds, source hash, linked UID and track role reject. Pursue scoped finite ordered-edition compiler; no browser/production ordered-chapter support inferred. |

Next/reopen: Pursue an explicit authorized finite ordered-edition map with matching selected tracks/configs and independent boundaries. Browser timeline ownership and general subtitle/language/config transitions need separate integration work.

[Current contract](item.json) · [History](history.jsonl) · [Evidence](evidence/index.json)
