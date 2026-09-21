<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# append moof and mdat separately

## Production integration — 2026-09-21

**production_integrated_conditional**. Large bounded owned MP4 callback buffers append without application gathering; small/unknown batches retain the generic path. Copy reduction and extra append calls are measured; current Player output/lifecycle gates pass.

[Maintained implementation](../../../docs/PRODUCTION-PIPELINE.md) · [Current qualification and tradeoffs](../../shared/runs/20260921T203100Z-production-pipeline/analysis.md). Release not published.

## Retained earlier research evidence


Current decision: **pursue**. Separate moof/mdat appends preserve all96 complete native reference pictures on the same AVC/AAC source and avoid the application gather allocation. Eleven alternating fresh-owner pairs show6.05% median complete-job savings;95% bootstrap interval1.19–13.47%. This supports the bounded no-gather component, not a general muxer or physical-memory claim.

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | New executable probe and declared workload/controls registered with source/input/runtime evidence. |
| screen | passed | Separate moof/mdat appends preserve all96 complete native reference pictures on the same AVC/AAC source and avoid the application gather allocation. Eleven alternating fresh-owner pairs show6.05% median complete-job savings;95% bootstrap interval1.19–13.47%. This supports the bounded no-gather component, not a general muxer or physical-memory claim. |
| correctness | passed | New baseline/candidate each match96independent whole-file native RGBA hashes at requested frame times. All22timed owners verify three fullimages and cleanup. Actual unchangedAVC/AAC coded bytes supplied in either one gathered media append or separate moof/mdat appends; previously accepted shared A/V marked-output, abort/stale and EOF controls retained. No new exact PCM/lip-sync or partially produced live-mux qualification. |
| performance | passed | Predeclared11alternating pairs,5%median saving gate passes6.0480%, bootstrap95median[1.1893,13.4682]%. Includes freshMSE owner, actual baseline allocation/gather copy, allappends, three correct-image seeks/hashes, teardown. Resident source/reference preparation excluded equally. Fivecandidate versus threebaseline appends; copy avoidance is not zero-copy or physicalmemory evidence. |
| results | passed | Actual new execution raw outcomes, controls and scoped interpretation retained. |
| decision | passed | pursue: Separate moof/mdat appends preserve all96 complete native reference pictures on the same AVC/AAC source and avoid the application gather allocation. Eleven alternating fresh-owner pairs show6.05% median complete-job savings;95% bootstrap interval1.19–13.47%. This supports the bounded no-gather component, not a general muxer or physical-memory claim. |

Next/reopen: Bounded research stage complete. Reopen for maintained muxer ownership integration or a new payload-size/append-scheduling workload; preserve full lifecycle/output gates before claiming deployment savings.

[Current contract](item.json) · [History](history.jsonl) · [Evidence](evidence/index.json)
