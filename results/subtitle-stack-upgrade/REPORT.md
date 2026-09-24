<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Media stack upgrade and subtitle timing probe

## Stack and build

The source lock now pins FFmpeg and the adaptation build to n9.0.2; mpv to
`2a4eb8067ca68ec19adf23daf8ccbb1a05afd6ed`; dav1d to 1.5.4; libass to
0.17.5; libplacebo to v7.360.1. zimg remains at its latest release tag,
release-3.0.6. Exact archive SHA-256 values are in `sources.lock.json`.

The baseline, full Software, production YUV, Hybrid, remux and subtitle
engines linked. `build/beta-build.json` and `build/lgpl-closure.json` passed
after the final input snapshot. Upgrade fixes: rebase mpv/FFmpeg patches,
remove an HLS seek patch now upstream, choose mpv's subprocess stub on
Emscripten, update H.264 SIMD dispatch field names, clear new VO transform
capabilities in the RGB override, remove FFmpeg's obsolete postproc option,
and pair the expanded subtitle avcodec with its matching full avutil archive.
The source fetcher now verifies lock identity before reuse; the source-build
guard retires stale objects when locks or patches change.

## Small regression gate

| Check | Result |
| --- | --- |
| Software H.264, HEVC, AV1, MPEG-2, MPEG-4, ProRes | Six browser smokes passed decoded frames, audible PCM, seek and 1.5x rate; H.264 reached EOF (`software-smoke.json`) |
| Hybrid H.264, HEVC, AV1 | Three browser routing/playback smokes passed (`results/media-routing-integration/chrome-2026-09-24T03-51-35.850Z/result.json`) |
| Production YUV | BT.709 limited-range color patch passed with zero RGB fallback frames and max color error 0/255 (`results/software-yuv-integration/yuv-chrome-2026-09-24T03-52-33.594Z/result.json`) |
| Native subtitle service | SRT, ASS, PGS, VobSub direct and forced-remux smokes passed seeking, clears, track and visibility changes, EOF, cleanup; zero mpv A/V chains (`build/upgrade-test/subtitle-smoke.log`, `subtitle-remux-generalization.log`) |
| SIMD | Six maintained differential/dispatch checks passed (`build/upgrade-test/simd-3.log`) |
| Licensing/build record | Passed (`build/lgpl-closure.json`, `build/beta-build.json`) |

The old `tests/mpv-subtitle-service.mjs` initially selected native-direct
under this Chrome build while asserting native-remux. Its route intent is now
explicit with `nativeRemux: 'always'`; the test then passed. A WebVTT MKV
probe selected Hybrid rather than the Native mpv subtitle route, so it does
not qualify `sub-lines` for that production route.

## `sub-lines` findings

Test-only bridge and scheduler are under `experiments/subtitle-stack-upgrade/`;
all production subtitle scheduling remains unchanged. Raw snapshots are the
JSON files here. The probe stops the host's repeated rAF render scheduling
only for its browser page and invokes the existing renderer at deadlines.

| Fixture | At 4.2 s, `sub-lines` | Deadline result |
| --- | --- | --- |
| Overlapping SRT | `[3,11]`, `[4,5]` | Scheduled 5 s; short line cleared at 5.001 s while long line remained (`overlap.json`) |
| Overlapping static ASS, distinct text | `[3,11]`, `[4,5]` | Scheduled 5 s; short line cleared at 5.003 s (`ass.json`) |
| mov_text | `[3,4]`, `[4,5]` | Scheduled 5 s; displayed line cleared at 5.003 s (`movtext.json`) |
| Static ASS, two styles with identical text | **Only `[3,11]`** | **Failed:** no 5 s wake, both lines remained until 11 s (`ass-same.json`). Normal 60 Hz rendering changed `Same\nSame` to `Same` by 5.47 s (`baseline-same.json`). |

The last case is a correctness blocker. mpv's `sub_get_lines()` deduplicates
overlapping events by plain text and merges their ends. Distinct ASS styles
can therefore change pixels at an end time omitted by `sub-lines`. The
property solves the original distinct-text overlap counterexample but is not
an authoritative list of every possible visual boundary.

In the three-cue embedded SRT fixture, the list at 1.5 s and 5 s contained
1–4 s and 200–210 s, but omitted the 380–390 s cue (`discovery.json`). At a
199.5 s seek it still omitted 380 s; a later timing read gained it before
the 200 s render (`discovery-late.json`). Thus events can be discovered with
no intervening full render, but `sub-lines` has neither a completeness
horizon nor a notification that an earlier unknown event was added.

PGS and VobSub returned `MPV_ERROR_PROPERTY_UNAVAILABLE` (`count=-10`) in
their probes. The pinned libass integration contains an `is_animated`
detector, but mpv enables its packet animation check only for still-image
video output; the subtitle-only service has no VO. `sub-lines` exposes no
animation flag. The normal animation path was not replaced or qualified.

## Decision

Keep deadline scheduling experimental. A production text scheduler needs a
bounded, core-locked native query of raw current/known event boundaries
without plain-text deduplication, an existing mpv/libass animation signal,
and a discovery wakeup or bounded fallback while the future is incomplete.
Use one epoch-guarded timer; on each wake, seek/rate/track/visibility/lifecycle
change, re-query current media PTS and authoritative mpv state before
rendering. Retain frame cadence for animated ASS and PGS/VobSub until their
timing and update state are independently proven. No whole-Chrome CPU claim
was made and no broad performance campaign ran.
