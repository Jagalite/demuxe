<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# global MP4 sidx materially changes remote access

Current decision: **stop_current_profile**. Global SIDX preserves the exact full1920x1080 target picture and source packet identity, but the current cold metadata-plus20s-seek workload saves only5.47% completed-response bytes and0.47% complete-operation latency. Both predeclared benefit gates fail; retain the earlier source-report results as different workload observations rather than generalizing their large savings.

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | New executable probe and declared workload/controls registered with source/input/runtime evidence. |
| screen | passed | Global SIDX preserves the exact full1920x1080 target picture and source packet identity, but the current cold metadata-plus20s-seek workload saves only5.47% completed-response bytes and0.47% complete-operation latency. Both predeclared benefit gates fail; retain the earlier source-report results as different workload observations rather than generalizing their large savings. |
| correctness | passed | Two preflights and22timed fresh browser-context owners all produce the same exact full1920x1080 target image and correct requested20s position, with element/context cleanup. Existing same-length indexed/no-SIDX variants retain independently verified2002packet metadata identity. Source-authored static file endpoint only; no arbitraryremoteauth, all-file playback or physicalnetwork claim. |
| performance | failed | 11alternating cold contexts,64KiB response cap plus20ms server delay. Median completed-response-byte saving5.4685%, bootstrap95[5.4685,6.3992]%, belowdeclared20%. Complete native load+seek+fullimagehash+elementcleanup saving0.4744%, bootstrap95[0.0300,0.7553]%, belowdeclared5%. Context creation/closing and resident serverfixture setup excluded equally; source alreadyhasindex. No sample dropping. Browser request strategy andwaitingforloadeddata differ from metadata-only/early-seek sourceprofiles. |
| results | passed | Actual new execution raw outcomes, controls and scoped interpretation retained. |
| decision | passed | stop_current_profile: Global SIDX preserves the exact full1920x1080 target picture and source packet identity, but the current cold metadata-plus20s-seek workload saves only5.47% completed-response bytes and0.47% complete-operation latency. Both predeclared benefit gates fail; retain the earlier source-report results as different workload observations rather than generalizing their large savings. |

Next/reopen: Reopen with an independently declared realistic delivery workload, including metadata-only versus early-seek policy if applicable. Do not change the failed thresholds or infer globalSIDX has no utility; currentcompletejob fails material-benefit gates.

[Current contract](item.json) · [History](history.jsonl) · [Evidence](evidence/index.json)
