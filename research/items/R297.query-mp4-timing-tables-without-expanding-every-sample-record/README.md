<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Query MP4 timing tables without expanding every sample record

`R297.query-mp4-timing-tables-without-expanding-every-sample-record`

Current decision: **pursue**. Direct run-index queries match all 96 independent FFprobe sample timings after explicit presentation/decode origin mapping, including signed negative CTTS. Out-of-range ordinals reject; unsigned CTTS control diverges. Pinned MOV source does allocate per-sample AVIndexEntry and can expand CTTS; earlier generic index cap does not establish a MOV bound.

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | Generated or reused hashed synthetic fixtures, executable harness and independent FFprobe/reference evidence for the bounded component. |
| screen | passed | Direct run-index queries match all 96 independent FFprobe sample timings after explicit presentation/decode origin mapping, including signed negative CTTS. Out-of-range ordinals reject; unsigned CTTS control diverges. Pinned MOV source does allocate per-sample AVIndexEntry and can expand CTTS; earlier generic index cap does not establish a MOV bound. |
| correctness | passed | Scoped pure timing query contract: all 96 DTS/duration/PTS values match independent FFprobe; negative signed CTTS and invalid ordinal controls executed. This does not pass full demux index correctness. |
| performance | pending | Equivalent-work performance not measured; relevant complete correctness and real owner workload remain prerequisites. |
| results | passed | Positive and negative variants preserved in immutable runs with manifests. |
| decision | passed | Scoped pursue decision; integration and production qualification separate. |

Next: Measure pinned Wasm MOV allocation on representative long sources; add sample offset/chunk mapping, malformed table corpus and source identity lifecycle before replacing its index.

Original contract and definition: [item.json](item.json). [History](history.jsonl). [Evidence index](evidence/index.json).

- [Run 20260919T200000Z-signed-timing](evidence/20260919T200000Z-signed-timing/run.json)
- [Run 20260919T200000Z-signed-timing-origins](evidence/20260919T200000Z-signed-timing-origins/run.json)

Research decision only; production integration and release qualification remain unassessed.
