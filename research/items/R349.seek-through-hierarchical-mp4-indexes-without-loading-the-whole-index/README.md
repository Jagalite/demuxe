<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Seek through hierarchical MP4 indexes without loading the whole index

`R349.seek-through-hierarchical-mp4-indexes-without-loading-the-whole-index`

Current decision: **pursue**. Authored two-level SIDX lazily selects leaves 20,3,21,3; exact selected bytes and independent packet payload/timing match original source. Stale source identity and out-of-source reference reject. Root is supplied and logical local reads recorded.

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | Generated or reused hashed synthetic fixtures, executable harness and independent FFprobe/reference evidence for the bounded component. |
| screen | passed | Authored two-level SIDX lazily selects leaves 20,3,21,3; exact selected bytes and independent packet payload/timing match original source. Stale source identity and out-of-source reference reject. Root is supplied and logical local reads recorded. |
| correctness | pending | Exact leaf and independent packet/timing oracle pass. Complete picture/playback, cancellation and overlap controls remain pending. |
| performance | pending | Equivalent-work performance not measured; relevant complete correctness and real owner workload remain prerequisites. |
| results | passed | Positive and negative variants preserved in immutable runs with manifests. |
| decision | passed | Scoped pursue decision; integration and production qualification separate. |

Next: Add actual browser output and cancellation/overlap controls; evaluate genuine already-indexed source and total cold init/discovery/transfer before network benefit claim.

Original contract and definition: [item.json](item.json). [History](history.jsonl). [Evidence index](evidence/index.json).

- [Run 20260919T200000Z-hierarchy](evidence/20260919T200000Z-hierarchy/run.json)

Research decision only; production integration and release qualification remain unassessed.
