<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Switch same-codec audio at a future boundary without pausing

Current decision: **stop_current_profile**. Livefutureboundary same-rateAAC switch renderswith2.667ms boundedquietgap, but actualfailedincominginit afterremove destroysoldfuture andendsMediaSource. Stop currentdestructivecommit profile; API/MIME preflight andsameobject identity are nottransactionalcorrectness.

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | New executable probe and declared workload/controls registered with source/input/runtime evidence. |
| screen | passed | Livefutureboundary same-rateAAC switch renderswith2.667ms boundedquietgap, but actualfailedincominginit afterremove destroysoldfuture andendsMediaSource. Stop currentdestructivecommit profile; API/MIME preflight andsameobject identity are nottransactionalcorrectness. |
| correctness | failed | Exactsame48kAAC440-to880 fixtures, future-audio. ActualPCM5msquietgap gatepasses(2.667ms vsuninterrupted0); oldvideo/sourcebuffer identities, stalegeneration,seek/EOFcontrols passvalidcase. Actualwrongvideo-only MP4 initialization suppliedasincomingaudio rejects withappenderror; afterremove oldaudio0–2.005333s, futureto6s lost, MediaSourceended. Pausedcase seeks.25beforecommit; livecase commitsaround.51. Thisdemonstrates non-atomicfailedcommit, not genericMSEswitch failure. FullPCMidentity notclaimed. |
| performance | not_applicable | Currenttransaction correctnessfails actualfailedappend ownership gate. Stop beforeefficiencybenchmark; validcaseincidental timings/frequency or quietgap pass cannotauthorize performancequalification. |
| results | passed | Actual new execution raw outcomes, controls and scoped interpretation retained. |
| decision | passed | stop_current_profile: Livefutureboundary same-rateAAC switch renderswith2.667ms boundedquietgap, but actualfailedincominginit afterremove destroysoldfuture andendsMediaSource. Stop currentdestructivecommit profile; API/MIME preflight andsameobject identity are nottransactionalcorrectness. |

Next/reopen: Reopen withpreparedincoming track/config admission and a realtransaction recoverystrategy that preservesoldfuture acrossfatalappend failure; prove cancellation/sourceidentity beforepublishing. A newMediaSource rebuild mustbeexplicit fallback, not claimedas retained-owner rollback. Keep R052rate-change, videoqueue andvideoconfig outcomes separate.

[Current contract](item.json) · [History](history.jsonl) · [Evidence](evidence/index.json)
