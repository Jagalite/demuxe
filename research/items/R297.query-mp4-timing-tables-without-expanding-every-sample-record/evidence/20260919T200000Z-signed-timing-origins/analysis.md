<!-- SPDX-License-Identifier: CC-BY-4.0 -->

Direct run-index queries match all 96 independent FFprobe sample timings after explicit presentation/decode origin mapping, including signed negative CTTS. Out-of-range ordinals reject; unsigned CTTS control diverges. Pinned MOV source does allocate per-sample AVIndexEntry and can expand CTTS; earlier generic index cap does not establish a MOV bound.

Scoped pure timing query contract: all 96 DTS/duration/PTS values match independent FFprobe; negative signed CTTS and invalid ordinal controls executed. This does not pass full demux index correctness.

Next: Measure pinned Wasm MOV allocation on representative long sources; add sample offset/chunk mapping, malformed table corpus and source identity lifecycle before replacing its index.

Preserved run outcome: passed bounded component.
