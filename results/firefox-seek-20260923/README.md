<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Firefox buffered seek recovery — 2026-09-23

The broad Firefox guard in `RemuxPlayer.canSeekBuffered()` is replaced by one
bounded presentation retry. The original failure occurs after a remux restart
in the rapid fractional-seek sequence with Native ASS and FLAC adaptation:
`seeked` completes at the target but no video frame callback arrives. Removing
the guard alone failed all three recorded trials. Absence of that callback does
not prove absence of a displayed image or identify a Firefox decoder defect.
Additional local probes without ASS or with longer spacing passed; they do not
establish that every Firefox source or timing has the same problem.

The new path allows ordinary buffered seeks in every remux generation. If a
completed, paused seek has not produced a verified callback after 100 ms, it
rearms the callback and seeks to the same buffered timestamp once. It preserves
the worker, MediaSource, SourceBuffer, route and playback intent. A callback
matching the emitted source-frame interval is still required. The original
10-second failure deadline remains; a second missing callback is not accepted.
Source retirement, cancellation, changed playhead, lost buffered eligibility
and decoder errors cannot trigger an obsolete retry. Diagnostics expose the
cumulative count as `backend.seekPresentation.bufferedRetries`.

Paused testing also found that the old 1 ms movement threshold could skip
verification when crossing a frame boundary (6.3326 → 6.3331). A changed source
frame now requires verification even for a smaller movement.

## Validation

- Firefox 146.0.1: 6/6 sequences, three playing and three paused; 36 seeks.
- Chrome 153.0.8010.53: 6/6 equivalent sequences; 36 seeks.
- All 12 post-restart seeks in each browser retained their original producer,
  MediaSource and SourceBuffer. Firefox used one bounded retry; Chrome used none.
- Low-frame-rate paused seek and pixel-identity checks passed in both browsers.
- Native ASS direct, remux, FLAC and destroy-during-load checks passed in both
  browsers (8/8 cases), including subtitle pixels and worker cleanup.
- 33 Node contracts passed, including stale frames, early callbacks, retry
  exhaustion, cancellation, errors, source retirement and frame boundaries.
  The frame-race contracts now run in CI. The expanded browser harness remains
  part of `scripts/qualify-optional-runtime.py`.

The matched Firefox sample measures six post-restart playing seeks per variant.
Median public seek completion was **251.54 ms** with the original guard and
**42.25 ms** with the candidate, including its one retry. The original guard
restarted all six; the candidate retained all six sessions. These are local
fixture timings, not a CPU, memory or general browser performance benchmark.

## Evidence and reproduction

`evidence.json` records source, fixture, engine and harness hashes, commands,
the exact baseline timing harness, and summaries of the additional checks.
The baseline runtime files match commit
`5ed5b883f66edacb593cfcfb1efa05949152ca13` byte for byte for the affected player,
remux and ASS modules. Both variants used the same RC7 LGPL engine bytes.
`unguarded-firefox.json` preserves the negative experiment; the three other
JSON files preserve the baseline measurement and final browser results.

With the corresponding engine assets and optimization fixtures installed:

```sh
npm run build
node --test tests/native-seek-frame-race.mjs tests/remux-buffering.mjs tests/seek-boundary-contracts.mjs
BROWSER=firefox node tests/native-fractional-seek.mjs
BROWSER=chrome node tests/native-fractional-seek.mjs
BROWSER=firefox CASES=low-fps node tests/optimization-review-regressions.mjs
BROWSER=chrome CASES=low-fps node tests/optimization-review-regressions.mjs
BROWSER=firefox CASES=direct,remux,flac node tests/native-ass.mjs
BROWSER=chrome CASES=direct,remux,flac node tests/native-ass.mjs
```

This is focused runtime validation using headless desktop browsers and local
fixtures. It does not replace the next release's complete catalogue or qualify
Firefox's separately excluded unequal-track windowed adaptation path. No media
engine was rebuilt or relabeled for this fix.
