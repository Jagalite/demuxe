<!-- SPDX-License-Identifier: CC-BY-4.0 -->

Livefutureboundary same-rateAAC switch renderswith2.667ms boundedquietgap, but actualfailedincominginit afterremove destroysoldfuture andendsMediaSource. Stop currentdestructivecommit profile; API/MIME preflight andsameobject identity are nottransactionalcorrectness.

Correctness: Exactsame48kAAC440-to880 fixtures, future-audio. ActualPCM5msquietgap gatepasses(2.667ms vsuninterrupted0); oldvideo/sourcebuffer identities, stalegeneration,seek/EOFcontrols passvalidcase. Actualwrongvideo-only MP4 initialization suppliedasincomingaudio rejects withappenderror; afterremove oldaudio0–2.005333s, futureto6s lost, MediaSourceended. Pausedcase seeks.25beforecommit; livecase commitsaround.51. Thisdemonstrates non-atomicfailedcommit, not genericMSEswitch failure. FullPCMidentity notclaimed.

Performance: Currenttransaction correctnessfails actualfailedappend ownership gate. Stop beforeefficiencybenchmark; validcaseincidental timings/frequency or quietgap pass cannotauthorize performancequalification.

Next/reopen: Reopen withpreparedincoming track/config admission and a realtransaction recoverystrategy that preservesoldfuture acrossfatalappend failure; prove cancellation/sourceidentity beforepublishing. A newMediaSource rebuild mustbeexplicit fallback, not claimedas retained-owner rollback. Keep R052rate-change, videoqueue andvideoconfig outcomes separate.

Bounded research result, not production or release admission.
