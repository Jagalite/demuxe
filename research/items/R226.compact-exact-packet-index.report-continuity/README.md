<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# compact exact packet index

Current decision: **stop_current_profile**. Exact source-bound compact packet scalars pass all 96 independent FFprobe tuples and stale/truncated/ordinal controls. The compact representation saves 12.55% serialized bytes versus actual MP4 table boxes, but cold complete jobs including sidecar authoring are 6.46 times slower (median saving -545.65%, bootstrap95 [-615.52%, -510.04%]). Stop this cold eight-query profile; current native seeks use av_seek_frame and no replaced padded persistent index was identified.

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | New executable probe and declared workload/controls registered with source/input/runtime evidence. |
| screen | passed | Exact source-bound compact packet scalars pass all 96 independent FFprobe tuples and stale/truncated/ordinal controls. The compact representation saves 12.55% serialized bytes versus actual MP4 table boxes, but cold complete jobs including sidecar authoring are 6.46 times slower (median saving -545.65%, bootstrap95 [-615.52%, -510.04%]). Stop this cold eight-query profile; current native seeks use av_seek_frame and no replaced padded persistent index was identified. |
| correctness | passed | All byte offsets, sizes, DTS, PTS, durations and key flags match independent FFprobe for 96 signed-CTTS samples. Source identity, truncated stream and invalid ordinal reject. Fixture-specific edit/DTS normalization is not general timeline support. |
| performance | failed | 11 alternating batches of 100 fresh-owner eight-query jobs. Source hash/table parsing common, sidecar authoring included. 12.55% serialized saving passes 10%; complete latency saving -545.65% fails predeclared 5%. Resident file read and oracle excluded equally. |
| results | passed | Actual new execution raw outcomes, controls and scoped interpretation retained. |
| decision | passed | stop_current_profile: Exact source-bound compact packet scalars pass all 96 independent FFprobe tuples and stale/truncated/ordinal controls. The compact representation saves 12.55% serialized bytes versus actual MP4 table boxes, but cold complete jobs including sidecar authoring are 6.46 times slower (median saving -545.65%, bootstrap95 [-615.52%, -510.04%]). Stop this cold eight-query profile; current native seeks use av_seek_frame and no replaced padded persistent index was identified. |

Next/reopen: Reopen only with a concrete persisted index owner and measured reuse sufficient to amortize authoring; do not add a redundant sidecar to current native seeking.

[Current contract](item.json) · [History](history.jsonl) · [Evidence](evidence/index.json)
