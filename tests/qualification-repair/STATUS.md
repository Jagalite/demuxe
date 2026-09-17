# Qualification repair branch status

This branch contains the September16 qualification repairs against application
4c15320cc96eb6664e68f5eaed0be212a77c4934. It is work for integration review, not a
release-qualified build. Native/worker interfaces and production defaults are unchanged.

Implemented and tested:
- Paused Native candidates report prepared separately from verified output.
- Source-scoped alternate audio selects a qualified transactional plan, with rollback.
- Narrow HEVC/TS remux construction and WebCodecs configuration fallback handling.
- Permanent targeted regressions and optional-build prerequisite audit.

Recorded validation:24000 injected routing cases (seed1592639710),24 focused
contracts,15 maintained browser lifecycle cases, targeted Chrome152.0.7977.83 and
PlaywrightFirefox146.0.1 startup/track tests, and a core-only installed consumer.
These test groups overlap and must not be summed as unique cases. The Chrome32-case
screen qualified30 cases; its final evidence-reset refinement was covered by targeted
tests rather than another full matrix. Stock Firefox155.0.1 remains unconfirmed.

Outstanding findings (the subsequent fix request was interrupted before implementation):
1. Native resume within20ms of EOF can finish normally but reject play after10s.
2. Native error polling can start concurrent asynchronous transport validators.
3. Firefox Software sustained output remains approximately13fps for the30fps P720
   fixture. Time is concentrated inside native rendering; conversion versus
   synchronization is not isolated. No speculative native fix is included.
4. Embedded ASS can extend reported duration beyond AV; subtitle-only-tail seeks
   remain unresolved. No duration truncation or timeout suppression is included.
5. Matching optional FLAC/Opus and Native ASS artifacts remain blocked by absent
   locked archives,Emscripten4.0.14 and Meson. Core packaging is not optional-asset
   qualification. No scratch binaries were substituted.

Existing experimental gates and explicit lossy permission requirements remain intact.
The lab preserves raw results, fixture generation commands/hashes, original failing
captures, review reproducers and exact runtime hashes. Fixture binaries are not part
of this source patch; see README.md for corpus setup.
