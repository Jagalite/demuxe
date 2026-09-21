# Local-agent handoff — Demuxe batch 5

Read `REPORT.md`, `ITEMS.json` and `evidence/verification.json` first. These are standalone screens from Chromium 144 / FFmpeg 7.1.5, not maintained Demuxe qualification. No repository changes were pushed. Pin the actual worktree/commit before using the results, and map D-labels to the full existing R keys rather than allocating duplicate R identifiers.

## First: D26, requested Opus channel mapping

Find where the native remux path owns Opus initialization/channel metadata. Determine whether it already represents repeated/silent mapping entries. Use the smallest existing owner to encode the three explicit output requests, without adding a new general Ogg player. This package's Ogg writer establishes the mechanism; WebM MSE is the screened delivery destination.

Keep the output request explicit: these are changed channel arrangements, not preservation of the original layout, a stereo downmix, or an arbitrary mix matrix. Require exact coded-packet identity and decoder-local complete sample oracles. Retain `left.opus` as a decoder disagreement fixture: browser and libopus pass, FFmpeg's default decoder silences both channels here. Test the actual chosen decoder; do not blindly accept or reject all routes based on one oracle.

Next correctness gates: source replacement, old init/data epochs, malformed mapping, remux trim/gain retention, whole-track output, and exact streaming seek/tail behavior. MSE's 2.161-second duration differs from complete decoded PCM's 2.137 seconds on both baseline and mapped files. Do not claim this is an exact-duration streaming route yet. A full Ogg validator and authenticated source identity are outside this prototype.

## Next: D28, real stale suffix at the maintained append boundary

Extend current R037 cancellation tests rather than creating another recovery subsystem. Pause a real maintained read/transform completion, abort the in-progress fragment, then release the old completion both before and after a full random-access retry. Require that the old bytes never reach the maintained append queue. Verify the four included picture witnesses, full timing, actual selected audio, and cleanup. Abort is not rollback of already committed samples; make the permitted retry interval and timestamp replacement behavior explicit.

## Conditional: D27, configuration-aware continuation

Reuse existing avc3 support. Establish which sample description, display aspect, color and in-band SPS/PPS properties require fresh initialization, versus properties that can change under a proven continuation profile. Same aspect alone is not a sufficient general rule. The same-aspect source passes seek witnesses, but a transition-frame discrepancy in the first sequential run did not repeat; inspect `browser_sameaspect.json` and `browser_boundary.json` together.

Resolve compositor/display-size event ordering with a timestamped full-output witness before making a seamless claim. Keep in-band parameter sets. Keep the changed-aspect 192×115-vs-192×112 negative. Fresh init appending retained the SourceBuffer; do not confuse it with rebuilding the whole player or assume it implies internal decoder reuse.

## Preserve stop decisions: D29 and D30

Do not admit the clean-aperture or SPS-crop variants merely because host output is exact or browser playback reaches EOF. Their browser presentation rectangles are wrong here. Try another environment only as a separately named destination qualification, not as a way to erase the failed profile.

Keep D30's missing-preroll cases in exact-excerpt tests. `appendWindowStart` and negative timestamp offset are not safe substitutes for a decoder-history/presentation-boundary separation. The positive here is the normal keep-preroll/seek baseline; no new complete zero-based excerpt player has been implemented. Add exact public start/end suppression, audio, replay, cancellation and backward seek before R044 correctness acceptance.

## Do not expand the project from this package

Do not replace FFmpeg, construct a universal route-search system, add speculative format tables, or build an ended-track-retirement subsystem from these results. R017's current record already identifies working unequal-tail baseline behavior and asks for measured residual cost first.

No CPU, energy, hardware-acceleration or aggregate savings are measured. Benchmark only after the relevant maintained correctness gate passes, against the existing cheapest correct route with equivalent output and complete setup/retention/cleanup costs.
