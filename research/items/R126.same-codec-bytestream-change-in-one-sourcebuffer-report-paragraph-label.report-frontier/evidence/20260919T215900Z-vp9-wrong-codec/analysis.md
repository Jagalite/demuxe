<!-- SPDX-License-Identifier: CC-BY-4.0 -->

Same VP9 codec changes WebM→MP4 on one SourceBuffer with24 exact full-frame queries and23 subsequent continuous presented frames plus the independently verified first frame. Cross-boundary seeks, stale source publication rejection, real wrong-codec initialization rejection and declared rebuild recovery pass.

Correctness: Source-report video-only bytestream capability:12fps one-secondVP9/WebM followed byone-secondVP9/fMP4. All24fullRGBA reference images match; continuousPTS/image sequence, reverse/forward seeks, retainedSB, source-generation replacement andcleanup verified. Adverse actualAVC/fMP4 underVP9 MIME rejects and explicitfullownerrebuild restores oldreference; no transactional retained rollback asserted. No audio orgeneralcodecs.

Performance: The exact report card asks whether same-codec bytestream change works, not whether it reduces complete cost. Capability endpoint complete without manufacturing a savings claim or benchmark.

Next/reopen: Bounded video-only capability stage complete. Reopen for selected A/V, maintained controller ownership or new destination profiles; keep full rebuild recovery explicit after fatal parser failure.

Bounded research result, not production or release admission.
