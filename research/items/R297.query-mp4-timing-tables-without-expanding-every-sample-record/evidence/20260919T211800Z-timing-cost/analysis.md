<!-- SPDX-License-Identifier: CC-BY-4.0 -->

Direct signed run-table queries preserve every packet timing. On the actual96sample source, sparse-query total preparation+query latency improved22.94%, but retained Python object graph shrank only4.32%, failing predeclared10% retention gate. Stop this representation/profile as an allocation optimization; do not infer FFmpeg memory savings.

Correctness: Both direct compressed candidate and sequentially expanded baseline independently match all96 FFprobe DTS/PTS/duration values with explicit timeline origins; signed negative CTTS retained; invalid ordinals reject. Full byte input parsed each new job. Pure immutable timing-table query component; not sample offsets, media decode, AVIO or FFmpeg owner integration.

Performance: Predeclared11 alternating pairs,200 fresh jobs per observation, each full table parse+prepare+eight fixed sparse queries; resident sourcebytes shared/excluded, no retained index acrossjobs. Median latency saving22.9436%, bootstrap95 median[6.8133%,24.5345%], passing5%. Measured recursive retained Python object graph baseline12,228bytes vs candidate11,700bytes:4.31796%, below10% required allocation saving. Timing table-only bounded local CPython results; no physical/Wasm/native memory or player startup claim.

Next/reopen: Reopen allocation optimization with compact packed run records or a representative source with long timing runs; predeclare new profile and gate, retain this negative. Native FFmpeg still expands indexes and requires an actual integration to claim savings.

Bounded research result, not production or release admission.
