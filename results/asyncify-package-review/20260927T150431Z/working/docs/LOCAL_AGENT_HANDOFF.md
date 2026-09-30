# Local-agent handoff: complete the unqualified service gates

Use `docs/REVIEW.md` and `results/REVIEW_SUMMARY.json` as the scope of evidence.
Do not treat the passing scheduler tests as a completed libmpv/FFmpeg port.

1. Verify an untouched package; rerun the infrastructure suites in a working copy using the actual local toolchain.
   Record any SDK/Binaryen differences. Fix failures without disabling guards or weakening negative-control reasons.
2. Start with actual serialized FFmpeg: build fresh remux and selected-audio transcode profiles under JSPI and Asyncify,
   using the prepared scripts. Build outside production directories. Bind the experimental engine to finite Blob/range
   sources and the existing Demuxe packet/metadata/output qualification fixtures. Confirm browser-native video remains
   outside mpv; no video transcoding is added to this task.
3. Compare each engine against the current pthread baseline: actual probe metadata; selected packet payload and timestamps;
   decoded reference PCM under the same declared precision policy; priming/padding; short reads, EOF, failed HTTP reads,
   cancellation only after a real pending read, source replacement and repeated close/recreate. Negative C statuses are normal
   operation results; unexpected ccall rejection/traps poison the module and require disposal. Never retry a corrupted instance.
4. For full mpv, implement one explicit continuation owner in the pinned Emscripten environment. Investigate a fiber-backed
   adapter or a tightly audited raw-driver integration. Do not combine two Asyncify state machines in one module. Preserve
   genuine mpv dispatch/thread-pool code unless a full-service reproducer justifies a narrowly documented change.
5. Build and run the actual current subtitle service (vid=no, aid=no) with the non-shared source path:
   create -> initialize -> load -> select -> real overlay pixels -> distinct second cue -> backward seek/replay ->
   source replacement -> observed-pending-read cancellation -> destroy/recreate. Verify zero AO/VO chains.
   Compare with the pthread subtitle baseline. ASS/SRT/mov_text, attached fonts and bitmap recovery are individual gates.
6. Keep mpv audio separate. No non-shared PCM or consumption-clock implementation is supplied by this package. It needs
   its own bounded transport, epochs, real-consumption feedback, timing, pause/speed/seek/EOF/underrun and device tests.
7. After media proof, add runtime-specific qualification, asset/cache identities and routing. Preserve existing isolated
   pthread behavior; admit Asyncify only for the exact independently qualified component. Authentication, source identity,
   cancellation, asset failure and arbitrary traps are not “JSPI unavailable” and must not trigger blind fallback.

Return changed source files/patches, verified source/artifact hashes, exact commands, raw failing and passing runs,
a runtime-by-service result matrix, measured resource/performance data where actually obtained, and remaining blockers.
Separate four stages: infrastructure proof; actual component correctness; player integration; release qualification.
Do not publish, push, rewrite production architecture, broaden codec support, or claim all major blockers cleared
without the user's explicit request and the corresponding evidence.
