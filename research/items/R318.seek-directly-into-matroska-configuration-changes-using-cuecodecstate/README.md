<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Seek directly into Matroska configuration changes using CueCodecState

Current decision: **pursue**. A genuine two-epoch Matroska fixture now proves CueCodecState-directed seeking across different AVC initialization states in both directions. All independent host YUV images and timestamps match. Ignoring the second state causes a real decoder error; a missing RAP, malformed state offset and stale source are rejected. Eleven paired complete jobs show 29.55% median savings versus sequential epoch replay.

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | New executable probe and declared workload/controls registered with source/input/runtime evidence. |
| screen | passed | A genuine two-epoch Matroska fixture now proves CueCodecState-directed seeking across different AVC initialization states in both directions. All independent host YUV images and timestamps match. Ignoring the second state causes a real decoder error; a missing RAP, malformed state offset and stale source are rejected. Eleven paired complete jobs show 29.55% median savings versus sequential epoch replay. |
| correctness | passed | Two 10-frame, 10 fps AVC epochs share dimensions but differ in baseline CAVLC versus high-profile CABAC configuration. The second BlockGroup contains CodecState and its cue references that actual Segment-relative element; first cue uses the initial TrackEntry. No in-band SPS/PPS masks stale initialization. Four initial seek targets [1,0,1,0] and all 880 timed target pictures match independent host-decoded YUV420 hashes, dimensions and absolute timestamps exactly. Wrong initialization yields zero pictures and EncodingError. Stale source identity, invalid state position and non-RAP entry reject. Every frame and decoder closes. This is a narrow browser component, not maintained Matroska demux integration or arbitrary codec-state support. |
| performance | passed | Predeclared 11 alternating pairs of four fresh seek owners [1,0,1,0]. Both return 40 exact target pictures per job; cue-directed mode submits 40 packets, sequential replay submits 60. Includes source hash/index parsing, state lookup, decoder creation/configure/decode/flush, target plane copies/hashes and cleanup; resident byte transfer and independent oracle preparation excluded equally. Median complete-job saving 29.5472%, bootstrap 95% median [24.0741,42.0798]%; 5% gate passed. No remote-range, physical memory or energy claim. |
| results | passed | Actual new execution raw outcomes, controls and scoped interpretation retained. |
| decision | passed | pursue: A genuine two-epoch Matroska fixture now proves CueCodecState-directed seeking across different AVC initialization states in both directions. All independent host YUV images and timestamps match. Ignoring the second state causes a real decoder error; a missing RAP, malformed state offset and stale source are rejected. Eleven paired complete jobs show 29.55% median savings versus sequential epoch replay. |

Next/reopen: Pursue this source-bound configuration-seek component. Maintained demux integration must propagate CodecState correctly and preserve explicit RAP dependencies, source identity and owner cleanup; other codec/container profiles require separate admission.

[Current contract](item.json) · [History](history.jsonl) · [Evidence](evidence/index.json)
