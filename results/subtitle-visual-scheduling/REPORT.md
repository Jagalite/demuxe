# Unified mpv subtitle visual scheduling

**Disposition: SUBTITLE SCHEDULING COMPLETE — DEADLINE/ANIMATION/BITMAP PATHS QUALIFIED** for the tested embedded SRT, mov_text, ASS, PGS, and VobSub routes. mpv alone owns demux, decoding, timing, animation semantics, bitmap state, seekpoints, libass, and pixels. Demuxe's subtitle worker advances mpv with `update_subtitles()` at about 10 Hz and asks mpv for the current visual mode and next boundary. The host renders on deadlines, lifecycle invalidations, or while mpv reports an active animation. Unknown decoder state retains frame cadence.

## Internal API and qualification

`subtitle_service_visual_schedule(pts, &next, &epoch)` returns unsupported (`0`), deadline (`1`), animated (`2`), or an unstable epoch (`-2`). `next` is the earliest known visual boundary after media PTS. Decoder timing changes notify the worker; an epoch-guarded timer covers the next boundary. Public `sub-lines` behavior is unchanged.

| Decoder / current state | Schedule |
| --- | --- |
| SRT and mov_text | Deadline after mpv has decoded timing events |
| ASS/SSA, no active animation | Deadline from raw undeduplicated ASS event boundaries |
| ASS/SSA, active `\\fad`, `\\move`, `\\t`, karaoke, or Effect | Animated frame cadence, returning to deadline after the event |
| PGS or DVD/VobSub decoded bitmap | Deadline from `sd_lavc` queue `pts`/`endpts`, including clears |
| DVD menu highlight, unknown bitmap start PTS, active bitmap with unknown end and no known next boundary, unsupported decoder, incomplete ASS scan | Conservative frame fallback |

ASS still requires a complete mpv event timeline before deadline qualification. The worker performs a bounded asynchronous EOF scan on seekable ASS tracks, then restores position. A failed or incomplete scan falls back to frame cadence. A 9.9 MiB fixture with a late event at 30 s passed direct and remux, so the former 8 MiB source-size gate was removed. The scan itself remains: the available tests do not prove that a 10 Hz pump alone discovers every future ASS boundary before its deadline.

Exact seeks beyond a still-active PGS/VobSub packet use mpv's own subtitle-step seekpoint to replay from the last known bitmap start to the requested PTS. This restored paused PGS seeks at 2–6 s and VobSub at 33 s. No bitmap packet is parsed in JavaScript. All tested service runs had zero mpv audio/video chains.

## Correctness

Direct and native-remux tests covered SRT, mov_text, static ASS, same-text/different-style ASS, distinct-text overlap, mixed static/animated ASS, PGS, and VobSub. Mixed ASS changed deadline → animated → deadline naturally on both routes; pixel checks measured fade opacity, move position, transform size, and karaoke color at separate PTS. A paused animated resize rendered, and 1.75× playback retained the mode transitions. PGS and VobSub each kept one visible bitmap through the static interval and made one deadline render at the 35.3 s clear. The existing subtitle lifecycle suite passed seek in/out, track/source changes, visibility, EOF, and worker cleanup. [Full correctness log](correctness.log) and [1.75× log](rate-1.75.log) retain the observed mode/pixel records. Test commands: `node tests/subtitle-visual-scheduling.mjs`, `node tests/subtitle-deadline-boundaries.mjs`, `node tests/mpv-subtitle-generalization.mjs`, `node tests/subtitle-deadline-fallbacks.mjs`.

A separate natural first-cue test rendered SRT, mov_text, and ASS at media PTS 0.514–0.524 s on both direct and remux routes for a 0.500 s cue start (14–24 ms response), with visible pixels and zero mpv A/V chains; see `tests/subtitle-visual-first-cue.mjs` and the [first-cue log](first-cue.log).

Late-start bitmap fixtures shifted the first PGS/VobSub packet to 3 s. Both routes were blank at 2 s, showed the bitmap after 3 s in natural playback, and restored it on a paused seek to 6 s. The four passing cases are in `tests/subtitle-bitmap-late.mjs` and the [late-bitmap log](bitmap-late.log).

The same-text ASS boundary record retains the 3/4/5/11 s visual changes, including the 5 s clear hidden by public `sub-lines` deduplication. Direct 1× deadline responses were 21–25 ms after those boundaries; direct 1.75× responses were 18–47 ms. Remux 1× responses were 20–26 ms after subtracting the fixture's measured +1 s video offset. From roughly 3.4 to 11.4 s, the old lane made 478 full renders and the new lane made 3 (**99.4% fewer**). [Direct](../subtitle-deadline-production/boundaries.json), [remux](../subtitle-deadline-production/boundaries-remux.json), [distinct-text direct](../subtitle-deadline-production/boundaries-overlap.json), and [distinct-text remux](../subtitle-deadline-production/boundaries-overlap-remux.json) retain individual timestamps.

## Matched CPU

Chrome 153, fresh browser for each trial, alternating old/new order, direct mpv subtitle-service route, 8 s steady playback windows, 1 s CDP process samples, unchanged process membership and RSS at **every** sample, fixture/runtime hash recheck, and zero mpv A/V chains. The old lane changes only the host scheduler to 60 Hz frame rendering; both lanes use the same production mpv, worker, Wasm, and ASS scan. Two accepted pairs per case are in [raw-cpu.json](raw-cpu.json). Failed process-stability windows and an interrupted pre-final-Wasm run remain as separate raw records and are excluded.

CPU is percent of one core. Each CPU entry shows **old → new = absolute core-point reduction (relative reduction)**; render entries show calls/s and percentage fewer calls.

| Fixture | Renderer CPU | Whole Chrome CPU | Full renders/s | State updates/s |
| --- | ---: | ---: | ---: | ---: |
| SRT | 10.44 → 5.78 = −4.66 (44.7%) | 44.35 → 40.31 = −4.04 (9.1%) | 60.06 → 0 = 100% fewer | 0 → 10.01 |
| Mixed ASS | 10.34 → 6.17 = −4.17 (40.3%) | 47.33 → 40.79 = −6.54 (13.8%) | 60.02 → 16.21 = 73.0% fewer | 0 → 9.99 |
| PGS | 12.57 → 4.63 = −7.94 (63.2%) | 46.90 → 39.09 = −7.81 (16.6%) | 59.97 → 0 = 100% fewer | 0 → 10.02 |
| VobSub | 10.81 → 5.92 = −4.88 (45.2%) | 44.64 → 39.54 = −5.10 (11.4%) | 59.96 → 0 = 100% fewer | 0 → 10.02 |

Mixed ASS's new lane spent 25.3–25.7% of 50 ms mode samples in animated frame cadence and 74.3–74.7% in deadline mode, with 0% fallback. These windows include portions of the `\\fad` and `\\move` events and static intervals. SRT/PGS/VobSub windows were wholly static; zero deadline renders inside their steady windows is expected. Boundary tests, not those windows, verify start/end renders. Subtitle worker CPU cannot be separated from renderer-process CPU in these CDP samples; whole Chrome also includes browser/GPU/utility work.

## Maintained README cells

The three Native Direct static text rows have a separate three-pair matched campaign under the same final production runtime, [raw-readme-cpu.json](raw-readme-cpu.json):

| README fixture | Renderer CPU | Whole Chrome CPU | Full renders/s | State updates/s |
| --- | ---: | ---: | ---: | ---: |
| SRT / MKV | 13.10 → 5.98 = −7.12 (54.4%) | 44.81 → 39.02 = −5.80 (12.9%) | 60.05 → 0 = 100% fewer | 0 → 10.01 |
| mov_text / MP4 | 12.16 → 5.61 = −6.56 (53.9%) | 47.42 → 39.03 = −8.38 (17.7%) | 60.05 → 0 = 100% fewer | 0 → 10.02 |
| styled ASS / MKV | 12.50 → 5.39 = −7.11 (56.9%) | 46.44 → 39.49 = −6.95 (15.0%) | 60.03 → 0 = 100% fewer | 0 → 10.01 |

The two H.264/AAC bitmap isolation rows have fresh focused 20 s windows under the same production runtime, [raw-bitmap-readme-cpu.json](raw-bitmap-readme-cpu.json). One old/new pair per row passed the per-second process/RSS gate; these are workload-specific `†` readings, not the 8 s medians above.

| Bitmap README fixture | Renderer CPU | Whole Chrome CPU | Full renders/s | State updates/s |
| --- | ---: | ---: | ---: | ---: |
| PGS / MKV | 11.15 → 6.10 = −5.05 (45.3%) | 50.85 → 44.14 = −6.71 (13.2%) | 60.00 → 0 = 100% fewer | 0 → 9.99 |
| VobSub / MKV | 10.84 → 5.60 = −5.24 (48.3%) | 47.81 → 45.22 = −2.59 (5.4%) | 59.98 → 0 = 100% fewer | 0 → 10.02 |

The README Demuxe whole-Chrome cells are 39.0% SRT, 39.0% mov_text, 39.5% styled ASS, 44.1% PGS, and 45.2% VobSub from these final-production runs. Competitor values and unrelated Hybrid bitmap rows remain unchanged.
