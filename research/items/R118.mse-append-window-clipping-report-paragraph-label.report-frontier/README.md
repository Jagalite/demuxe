<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# MSE append-window clipping [report paragraph label]

Current decision: **stop_current_profile**. Append-window filtering receives every source byte and produces a reported[1,7] range, but a seek to1.5s inside that range displays the source4s RAP picture rather than the required1.5s picture. All35tested interiorpictures aftertheRAP are exact. Stop using this unqualified codedwindow as an exact clip; buffer ranges andEOF do not prove dependency-correct output.

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | New executable probe and declared workload/controls registered with source/input/runtime evidence. |
| screen | passed | Append-window filtering receives every source byte and produces a reported[1,7] range, but a seek to1.5s inside that range displays the source4s RAP picture rather than the required1.5s picture. All35tested interiorpictures aftertheRAP are exact. Stop using this unqualified codedwindow as an exact clip; buffer ranges andEOF do not prove dependency-correct output. |
| correctness | failed | AVC/AAC source,48-frame GOP, appendWindow[1,7],315345sourcebytes delivered.35interiorfullimages match independent native reference andEOF reaches7s. Adverse non-RAP leftboundary: seekcurrentTime1.5 completes but observedfullhash1a5f71... equals sourceframe48, notrequiredsourceframe17hashf14b65.... Invalidwindow assignment rejects andfullsource reappend restores exact.3s image; cleanup passes. Rawprobe passedboolean only coversdeclaredinterior/filtering checks, notfailededgefidelity; acceptance explicitly retains distinction. |
| performance | not_applicable | Literal source report already says allinputbytes aretransported/parsed. No transport-saving claim andno benchmark after dependency-sensitive wrong-picture finding. |
| results | passed | Actual new execution raw outcomes, controls and scoped interpretation retained. |
| decision | passed | stop_current_profile: Append-window filtering receives every source byte and produces a reported[1,7] range, but a seek to1.5s inside that range displays the source4s RAP picture rather than the required1.5s picture. All35tested interiorpictures aftertheRAP are exact. Stop using this unqualified codedwindow as an exact clip; buffer ranges andEOF do not prove dependency-correct output. |

Next/reopen: Reopen with a keyframe/dependency admission or preroll-preserving presentationtrim contract, then verify everyrequestededgepicture andselectedaudio. Preserve codedfiltering capability as positive; do not treatreportedbufferedrange as exact requestedcontent.

[Current contract](item.json) · [History](history.jsonl) · [Evidence](evidence/index.json)
