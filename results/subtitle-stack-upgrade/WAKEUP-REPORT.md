<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Subtitle-only mpv wakeup probe

## Existing mechanisms

Pinned mpv exposes `mpv_set_wakeup_callback`, but it signals client event
queue activity rather than subtitle visual deadlines. The SRT control had four
client callbacks before playback and four after 9.5 seconds, despite six cue
boundaries; with host rAF removed it rendered only twice at startup and never
displayed the first cue (`wakeup-srt-client.json`).

`mpv_render_context_set_update_callback` belongs to `vo_libmpv`. The subtitle
service sets `vid=no`, `aid=no` and has zero A/V chains, so there is no VO
render context or video-driven subtitle update. `update_subtitles()` normally
follows mpv's video/playback loop or the service's explicit render call. Its
still-image OSD redraw path also requires a VO. This service keeps mpv paused
and feeds it browser PTS on render, so mpv's ordinary core timers do not know
the next browser-clock subtitle boundary. The current `sd_ass.c` animation
check is enabled for a still-image VO, not this subtitle-only route.

## Test-only native wakeup

The experiment uses a copied `libmpv.a` with the one line of plain-text
deduplication suppressed in `dec_sub.c`. A 50-line native service addition
reads the in-memory mpv subtitle event list internally, chooses the earliest
future start or end, arms one logical Emscripten deadline with an epoch guard,
and posts only
`subtitleWake` to the host. The host calls the unchanged render path using
current browser PTS. Seek/selection cancel stale timers. No event text/list
crosses into Demuxe and no production file or pinned source archive changes.
The test asset mirror ensures the main subtitle worker and four pthreads load
matching test-only Wasm. This is a functional sketch, not a production timing
interface or CPU qualification.

| Fixture and mode | Window | Native deadline wakeups | Full renders | Key result |
| --- | ---: | ---: | ---: | --- |
| Static SRT, ordinary mpv client callback | 9.5 s | 0 | 2 | First cue never appeared; client callback count stayed 4 → 4 |
| Static SRT, native deadline callback | 9.5 s | 7 | 9 | Cue starts at 1.004, 3.073, 8.043 s; clears at 2.036, 7.088, 9.010 s |
| Styled ASS with identical text, native deadline callback | 11.3 s | 5 | 7 | `Same` at 3.053 s, `Same\nSame` at 4.011 s, `Same` at 5.004 s, clear at 11.052 s |

The SRT and ASS native callback runs used `native-direct-mpv` with zero mpv
A/V chains. Paused seek into and out of a cue returned correct subtitle text
on both fixtures. SRT's extra startup/early wake rendered an unchanged frame
at 0.936 s, so even this short probe does not imply exact one-render-per-boundary
behavior. Reported times are media PTS at render requests, not a qualified
pixel presentation latency measurement. Raw data are
`wakeup-srt-client.json`, `wakeup-srt-deadline.json`, and
`wakeup-ass-deadline.json`.

## Late discovery

At media PTS 199.5 s, the late-event fixture initially exposed two known
events: `[1,4]`, `[200,210]`. With no further full render, one run still knew
only those two at PTS 202 s, and client callback count remained 4. In the
deadline arm, the third `[380,390]` event appeared in the internal list by
PTS 199.685 s while client callback count remained 4 and before the next
deadline render. Thus mpv may discover more packets asynchronously, but the
ordinary libmpv client callback does not reliably report that discovery to
this service. Raw evidence is in `wakeup-late-client.json` and
`wakeup-late-deadline.json`.

## Decision

**SMALL MPV PATCH LOOKS VIABLE** for static text events already known to mpv:
the native service can emit a bounded invalidation callback while mpv retains
demux, parsing, timing and rendering ownership. The production design needs
an internal raw-boundary query without allocating/serializing text; a reliable
late-discovery notification or bounded fallback; authoritative re-query at
every wake; and frame cadence when mpv/libass says the active ASS output is
animated. This probe does not qualify animated ASS, bitmap subtitles, browser
timer throttling, or whole-player CPU improvement.
