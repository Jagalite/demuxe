# Production subtitle deadline scheduling

**Historical static-text snapshot.** Current production uses the [unified
mpv visual scheduler](../subtitle-visual-scheduling/REPORT.md), including
dynamic ASS animation and bitmap deadlines. The measurements below belong to
the earlier static-only artifact and are retained as raw campaign evidence.

**Decision: keep the 10 Hz state pump and deadline renders for qualified static text.** mpv still owns demux, decode, timing, libass state, seek, and pixels. The host sends browser PTS at about 10 Hz; the subtitle worker calls `update_subtitles()` without rendering, uses the maintained raw event-boundary hook to keep one epoch-guarded timer, and performs a full render on a boundary or lifecycle invalidation. Animated ASS, PGS, VobSub, and unqualified tracks retain frame polling.

## Qualification and correctness

SRT (`subrip`) and `mov_text` qualify when the raw timing and animation hooks are present. ASS/SSA also requires a complete mpv event timeline: either mpv has preloaded it, or the selected file is seekable, at most 8 MiB, and the worker's bounded asynchronous `update_subtitles()` scan has observed subtitle demux EOF. Every ASS event must have an empty `Effect` and no mpv-detected animation tag. If these checks fail, the frame scheduler remains active. The raw boundary hook scans undeduplicated ASS events, preserving the same-text/different-style 5 s clear that public `sub-lines` omitted.

The final production artifact passed direct and remux lifecycle tests for SRT, mov_text, styled ASS, PGS, and VobSub: first cue, clear, pause/resume, paused seeks, track changes, visibility, EOF, worker cleanup, and zero mpv A/V chains. The focused ASS test passed at 1× and 1.75×, including the 3/4/5/11 s start/overlap/clear boundaries, a paused resize, a source switch, and continued deadline qualification after seeks. A separate distinct-text ASS overlap passed. Animated ASS, PGS, and VobSub each remained on the frame scheduler at roughly 60 renders/s. Records: [same-text boundaries](boundaries.json), [distinct-text overlap](boundaries-overlap.json), plus the test logs in `build/`.

## Matched steady CPU

Fresh Chrome 153, one browser per trial, alternating old/new order, 8 s steady windows after media time 2 s. Direct has three accepted pairs per fixture; remux has two. Every trial verified the selected route, media progress, cue text, zero mpv A/V chains, stable Chrome process membership, and cleanup. The old lane is a test-only override of the scheduler decision, restoring 60 Hz full renders while using the **same production mpv, worker, Wasm, and ASS scan**. The new lane is unmodified production. Fixture and runtime SHA-256 values, individual readings, and the final hash recheck are in [raw-final.json](raw-final.json). Earlier `raw.json` contains exploratory trials before the final ASS scan implementation and is excluded here.

CPU is percent of one core. Each cell shows **old → new = core-point reduction (relative reduction)**; medians and percentages use unrounded readings.

| Fixture / selected route | Renderer CPU | Whole-Chrome CPU | Full renders/s | Separate state updates/s |
| --- | ---: | ---: | ---: | ---: |
| SRT / Direct | 12.84 → 5.95 = −6.89 (53.7%) | 44.21 → 38.20 = −6.02 (13.6%) | 59.96 → 0 (100%) | 0 → 9.99 |
| SRT / Remux | 13.35 → 6.26 = −7.09 (53.1%) | 47.70 → 41.25 = −6.46 (13.5%) | 59.95 → 0 (100%) | 0 → 9.99 |
| mov_text / Direct | 14.64 → 5.83 = −8.80 (60.1%) | 45.70 → 35.77 = −9.93 (21.7%) | 59.96 → 0 (100%) | 0 → 9.99 |
| mov_text / Remux | 11.57 → 6.52 = −5.05 (43.6%) | 45.19 → 39.49 = −5.69 (12.6%) | 59.94 → 0 (100%) | 0 → 9.99 |
| styled ASS / Direct | 13.77 → 6.26 = −7.51 (54.5%) | 44.02 → 37.50 = −6.52 (14.8%) | 59.98 → 0 (100%) | 0 → 9.99 |
| styled ASS / Remux | 12.36 → 5.24 = −7.12 (57.6%) | 44.98 → 36.80 = −8.18 (18.2%) | 59.95 → 0 (100%) | 0 → 9.99 |

The 8 s CPU window is inside a long active cue, so zero deadline renders there is expected. On the boundary-rich ASS run from roughly 3.4 to 11.4 s, old polling made 478 full renders and the new scheduler made 3: **99.4% fewer calls** while retaining the intermediate 5 s visual change. Direct first-cue responses across the three matched pairs were 3–18 ms old and 9–32 ms new, depending on fixture.

| ASS 3/4/5/11 s boundary test | Old 1× | New 1× | New 1.75× |
| --- | ---: | ---: | ---: |
| Direct response latency range | 7–11 ms | 8–25 ms | 21–52 ms |
| Remux response latency range | 11–14 ms | 13–30 ms | 20–49 ms |

No cue was missed. The remux HTML video timeline carries a measured +1 s timestamp offset relative to subtitle PTS; remux latency above subtracts that offset. [Direct boundary record](boundaries.json) and [remux boundary record](boundaries-remux.json) retain the individual render timestamps.

Separate subtitle-worker CPU was not measurable from the CDP process-family CPU samples; it is included in renderer CPU. Whole-Chrome totals include unrelated browser, GPU, and utility work, so the renderer delta and full-render counts are the stronger attribution. The old lane still pays the new ASS upfront classification cost; this comparison measures steady scheduling, not startup cost. An 8 MiB ASS file can incur an upfront full subtitle scan, and larger or nonseekable ASS stays on the previous cadence.

## README scope

Only the Native Direct Demuxe CPU cells for H.264/AAC embedded SRT, embedded mov_text, and styled ASS were refreshed, from this production implementation's three accepted direct rounds. Their competitor results were preserved. There are no separate native-remux subtitle-service README rows; all three static-text remux routes were checked above. PGS/VobSub CPU rows and unrelated subtitle rows were left unchanged.
