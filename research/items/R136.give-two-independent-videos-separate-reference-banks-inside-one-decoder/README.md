<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Give two independent videos separate reference banks inside one decoder

Full identity: `R136.give-two-independent-videos-separate-reference-banks-inside-one-decoder`.

Current decision: **stop_current_profile** (actual_host_and_browser_component).

Two independently encoded prepared AV1 videos were relocated into disjoint reference banks in one actual decoder; all 54 pictures and timestamps match independent host and Chrome references. Seven alternating cold comparisons show certificate acquisition plus decode alone costs a median 34.69 times two ordinary decoders. This lower bound already fails the cost gate; header serialization would add cost. Stop this cold prepared-video profile; no physical-memory or general-stream claim.

Next action: Reopen for a materially cheaper certificate provider or a measured memory-constrained workload; keep separate source authorization and joint-epoch limits.

## Stages

| Stage | Status | Basis |
|---|---|---|
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | Authored real AV1 intra-only and inter-reference relocation preserving entropy tiles. |
| screen | passed | One actual decoder retains both independent reference banks. |
| correctness | passed | All54 full pictures and PTS exact; unrelocated keyframe destroys bank oracle; all frames and decoder owners closed. |
| performance | failed | Candidate cold-cost lower bound median34.69x baseline over7 alternating pairs. |
| results | passed | Two independently encoded prepared AV1 videos were relocated into disjoint reference banks in one actual decoder; all 54 pictures and timestamps match independent host and Chrome references. Seven alternating cold comparisons show certificate acquisition plus decode alone costs a median 34.69 times two ordinary decoders. This lower bound already fails the cost gate; header serialization would add cost. Stop this cold prepared-video profile; no physical-memory or general-stream claim. |
| decision | passed | Two independently encoded prepared AV1 videos were relocated into disjoint reference banks in one actual decoder; all 54 pictures and timestamps match independent host and Chrome references. Seven alternating cold comparisons show certificate acquisition plus decode alone costs a median 34.69 times two ordinary decoders. This lower bound already fails the cost gate; header serialization would add cost. Stop this cold prepared-video profile; no physical-memory or general-stream claim. |

[New run](../../shared/runs/20260919T231631Z-av1-reference-banks/run.json) · [Evidence index](evidence/index.json) · [Complete history](history.jsonl) · [Item contract](item.json)
