<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Native ASS missed-deadline fix

The AC-3/ASS failures in [the Auto retest](../AUTO-AUDIO-RETEST-E974CBDF.md)
left the subtitle canvas at about 0.011 seconds with zero bitmap bytes while
playback advanced. The authored cue starts at 0.500 seconds and ends at 35.800.
The passing repeat rendered at 0.517 seconds and recorded one deadline wake.

The 100 ms pump cancels and replaces the worker's deadline. If it crosses a cue
boundary before the timer fires, the next-boundary query advances to the cue's
end. The decoded timing epoch need not change when playback crosses a cue, so
that pump previously requested no render. Historical records lack per-message
traces; the precise interleaving in those failures remains inferred.

`web/mpv-subtitle-worker.js` now remembers the next visual boundary from the
last render independently of the timer. A crossing pump requests one render,
even if the pending deadline was cancelled. An accepted render refreshes the
boundary, and seek/selection clears the old timeline's boundary. The query uses
the exact rendered time so timer look-ahead cannot lose a nearby transition.
Static cues still avoid per-pump bitmap rendering.

## Validation

- `node --test tests/subtitle-deadline-race.mjs tests/subtitle-overlay.mjs`:
  11 passed. The six new tests execute the production worker's RPC handlers
  with controlled timers and a constant-epoch static-cue oracle. They cover
  missed start/end, sub-millisecond proximity, a delivered timer, and
  seek/selection resets. Against the original frozen worker, the three
  missed-boundary tests fail as expected.
- `node --test tests/runtime-capability-contracts.mjs`: 8 passed.
- Worker syntax, diff whitespace, and license boundary checks passed.
- Three fresh headed Chrome runs of the original full AC-3/ASS correctness
  case passed on `native-transcode-mpv`, including marked audio/video,
  subtitle drawing, pause/resume, rate, seeks to 6/1/10 seconds, EOF and cleanup.
  All three result archives passed integrity verification.

| Run | First subtitle render | Bitmap bytes | Magenta pixels | Archive |
| --- | ---: | ---: | ---: | --- |
| 1 | 0.512000 s | 86,016 | 4,725 | [Result](../../results/head-to-head/ass-deadline-fix-20260927-01/summary.json) |
| 2 | 0.521342 s | 86,016 | 4,725 | [Result](../../results/head-to-head/ass-deadline-fix-20260927-02/summary.json) |
| 3 | 0.506667 s | 86,016 | 4,725 | [Result](../../results/head-to-head/ass-deadline-fix-20260927-03/summary.json) |

The snapshot `build/head-to-head/assets-ass-deadline-fix-20260927-01` clones
`assets-audio-auto-e974cbdf-20260926-01` and changes only the subtitle worker.
Its manifest records the parent manifest hash and new worker hash. The original
fixtures, generated JavaScript, and Wasm remain identical; unrelated working-tree
audio changes are excluded. All three natural repeats recorded one timer wake;
the controlled regression tests specifically exercise the lost-wakeup recovery.

Supplemental `tests/subtitle-visual-first-cue.mjs` checks printed successful
first-cue visibility for SRT, mov_text and ASS in direct/remux lanes, at
0.510–0.524 seconds. Its Node process remained alive after the browser exited
and was terminated; these observations are not a clean suite completion.

This is bounded correctness evidence, not a CPU comparison or broad release
qualification. Historical failed archives and published CPU cells are unchanged.

## Review follow-up

Review found two additional redraw gaps: the pump's automatic clock recovery
could seek without requesting a redraw, and its first update could miss a timing
epoch change since the last render. The worker now invalidates on automatic
clock recovery, clears its old boundary, and records the render's timing epoch
for the next pump comparison. Three new regressions failed before these changes
and passed afterward.

The timer mock now separates demux waits from actual controlled deadline timers,
asserts delivered notifications, and tests pause cancellation/resume recovery.
The focused suite now has 23 passing tests (10 deadline, 5 overlay, 8 capability).

The new `tests/subtitle-deadline-race-browser.mjs` runs the original and fixed
worker on the same frozen AC-3/ASS runtime, delaying deadline timers by 2 seconds
in both arms. With **zero deadline wakeups**, the original worker retained an
empty canvas while the fixed worker produced 4,725 marked pixels and 86,016
bitmap bytes at 0.512 seconds. Both arms destroyed all workers and the runner
exited successfully. [Controlled browser result](../../results/subtitle-deadline-race/2026-09-27T01-54-02.200Z/result.json).
An earlier harness attempt aborted during startup, before output comparison;
[that failed attempt](../../results/subtitle-deadline-race/2026-09-27T01-53-30.407Z/result.json)
is retained separately.

The reviewed runtime is frozen in
`build/head-to-head/assets-ass-deadline-review-20260927-01`; only its subtitle
worker differs from the original Auto retest runtime. Existing historical and
first-fix snapshots remain unchanged.

All three normal full correctness repeats of the reviewed runtime passed,
including subtitles, pause/resume, rate, seeks, EOF and cleanup:
[run 1](../../results/head-to-head/ass-deadline-review-20260927-01/summary.json),
[run 2](../../results/head-to-head/ass-deadline-review-20260927-02/summary.json),
[run 3](../../results/head-to-head/ass-deadline-review-20260927-03/summary.json).
All three archives passed integrity verification. License checks, worker syntax,
and diff whitespace checks passed; the current worker hash matches the reviewed
snapshot. No CPU or release qualification was added.

Repository evidence policy keeps generated screenshots, request logs and Python
bytecode local. Committed reports, JSON results and manifests retain their
identities; full archive integrity verification above used the complete local
archives, including those excluded files.
