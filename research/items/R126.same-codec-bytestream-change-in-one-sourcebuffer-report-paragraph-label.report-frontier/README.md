<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Same-codec bytestream change in one SourceBuffer [report paragraph label]

Current decision: **pursue**. Same VP9 codec changes WebM→MP4 on one SourceBuffer with24 exact full-frame queries and23 subsequent continuous presented frames plus the independently verified first frame. Cross-boundary seeks, stale source publication rejection, real wrong-codec initialization rejection and declared rebuild recovery pass.

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | New executable probe and declared workload/controls registered with source/input/runtime evidence. |
| screen | passed | Same VP9 codec changes WebM→MP4 on one SourceBuffer with24 exact full-frame queries and23 subsequent continuous presented frames plus the independently verified first frame. Cross-boundary seeks, stale source publication rejection, real wrong-codec initialization rejection and declared rebuild recovery pass. |
| correctness | passed | Source-report video-only bytestream capability:12fps one-secondVP9/WebM followed byone-secondVP9/fMP4. All24fullRGBA reference images match; continuousPTS/image sequence, reverse/forward seeks, retainedSB, source-generation replacement andcleanup verified. Adverse actualAVC/fMP4 underVP9 MIME rejects and explicitfullownerrebuild restores oldreference; no transactional retained rollback asserted. No audio orgeneralcodecs. |
| performance | not_applicable | The exact report card asks whether same-codec bytestream change works, not whether it reduces complete cost. Capability endpoint complete without manufacturing a savings claim or benchmark. |
| results | passed | Actual new execution raw outcomes, controls and scoped interpretation retained. |
| decision | passed | pursue: Same VP9 codec changes WebM→MP4 on one SourceBuffer with24 exact full-frame queries and23 subsequent continuous presented frames plus the independently verified first frame. Cross-boundary seeks, stale source publication rejection, real wrong-codec initialization rejection and declared rebuild recovery pass. |

Next/reopen: Bounded video-only capability stage complete. Reopen for selected A/V, maintained controller ownership or new destination profiles; keep full rebuild recovery explicit after fatal parser failure.

[Current contract](item.json) · [History](history.jsonl) · [Evidence](evidence/index.json)
