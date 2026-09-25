# Subtitle deadline scheduler production-candidate audit — 2026-09-23

**Decision: keep experimental.** The original static SRT PoC establishes that suppressing 60 Hz render RPCs can remove renderer and worker work. The currently available timing metadata does not establish the *next visual change* for overlapping text events, does not expose active ASS animation, and does not prove that all future events have been discovered. No production scheduler or subtitle renderer was changed.

## Scope and route

Inspected HEAD `b9774dc25c7318971e2228b53804bfd29f17e29d` after fetching `origin/main` (`1519377384fffce83896a4da5c911a36013f9a3b`). The three relevant production files have no diff between these refs: `src/internal/native-mpv-subtitles.ts`, `web/mpv-subtitle-worker.js`, `native/subtitles/service.c`. The test-only bridge and probe are under `experiments/subtitle-deadline-candidate/`; generated fixtures, engine and raw probes are here.

The host rAF `tick()` reads the video time and includes it in its render key, so a playing video produces a render RPC at about display cadence even with a static cue. The worker unblocks mpv demux reading, calls `subtitle_service_render`, reads the overlay and text, then blocks demux again. The render path calls `update_subtitles` and the existing mpv/OSD renderer. The host only replaces the canvas bitmap when changed. Existing invalidations cover `seeking`, `seeked`, `pause`, `play`, `ratechange`, `loadedmetadata`, resize, fullscreen, selection, explicit seek, and visibility toggle through the player. There is no document `visibilitychange` or video `ended` listener in the subtitle host. Worker requests are serialized; destroy cancels rAF and closes the worker. The selected Native route uses browser A/V and zero mpv A/V chains in each accepted probe.

## Bounded metadata probe

The test-only C bridge obtains `sub_get_times` and `SD_CTRL_SUB_STEP` under one mpv core lock and copies five doubles. It neither renders nor seeks. At warm positions its worker call took about 0.005–0.035 ms in these probes, apart from some first calls around 0.1–0.2 ms. This is **native-call wall time**, not a measured whole-player saving. `SD_CTRL_SUB_STEP` reports a seek target: text results include mpv's ~10 ms seek tolerance, while the bitmap decoder can return the current time with success when no future seekpoint exists. The bridge filters the latter. The corrected raw results are in `text-probe-corrected.log` and `bitmap-probe-corrected.log`; earlier bridge outputs are retained in `probe.log` and `text-codecs-probe.log`.

| Probe | Current visible state at PTS | `start`, `end`, next step | Finding |
|---|---|---|---|
| SRT overlap at 4.2 s | Long line plus short 4–5 s line | 3, **11**, 11.05 | End of short line at 5 s is absent. A naive deadline leaves it displayed until 11 s. |
| ASS overlap at 4.2 s | Long line plus short 4–5 s line | 3, **11**, 12.01 | Same missing inner clear. |
| SRT zero cue | Cue active at 0 s | 0, 0.6, 0.61 | Initial render can establish a first deadline. |
| SRT tiny cue | Cue at 11.04–11.07 s | 11.04, 11.07, 11.10 | Metadata can describe the event after decoder state is advanced; timer latency is unqualified. |
| mov_text overlap | At 4.2 s only the short cue displayed | 4, 5, 11.05 | MP4/decoder presentation semantics differ from the overlapping SRT/ASS cases. |
| Local 9.7 MB SRT | Gap at 30 s; later cue at 200 s | no active cue, next 200.01 | Future cue was known in this local file; this does not prove a complete future timeline generally. |
| PGS / VobSub | Bitmap at startup | 0, about 35.3, no future seekpoint | Current interval alone does not establish composition and clear behavior after seeks. Retain frame cadence. |
| WebVTT MKV | Automatic plan was Hybrid | n/a | This codec is not admitted to the current Native + mpv subtitle route. |

The SRT and ASS overlap results are direct counterexamples to scheduling only `min(currentEnd, nextStart)`. `sd_ass.c::get_times` deliberately aggregates active events to the earliest start and **latest** end; `ass_step_sub` looks for the next **start**, not the next active end. The same behavior was observed for converted SRT. A correct snapshot needs the earliest start or end that can alter pixels across all active and known future events.

For ASS, pinned `sd_ass.c::is_animated` already recognizes karaoke, transforms, fades, moves and effects, but `player/sub.c` enables that check only for still-image video-output cases. This subtitle-only service has no mpv video output. The packet flag is not exposed as a per-active-event snapshot field. Mixed ASS static → move → karaoke → fade → static rendered in the normal path, but no safe static/animated switch was demonstrated. A decoder-level control should reuse the existing detector and conservatively return frame cadence for unknown or potentially animated active events. It must account for overlap and multiple active events.

Bitmap `sd_lavc.c` retains seekpoints and a four-entry decoded composition queue; `get_times` describes the current decoded entry and `step_sub` is a seek helper, not a guaranteed next-composition notification. The synthetic bitmap fixtures have a start packet and a later clear packet, but seeking to intermediate positions in the probe did not reliably preserve the startup bitmap. This is not enough evidence to change their scheduler or to attribute that seek behavior to a new scheduler.

## Discovery and lifecycle boundary

The worker calls `subtitle_service_block(1)` after each render. `demux_block_reading` explicitly prevents more packets from being read until unblocked or sought. A metadata-only snapshot therefore cannot discover a cue not already in the decoder. The local 200-second cue was already known, but the bridge exposes neither “all future events known” nor a decoded horizon. Native + mpv currently admits only local finite files, so HLS/DASH/remote streaming are outside this route; large local files and post-seek discovery still need a bounded guarantee. If a next event is unknown or the known timeline is incomplete, a discovery mode must deliberately advance demux/decode and requery. A mere worker timer querying cached metadata cannot solve it.

The production state machine should have `DEADLINE`, `FRAME_CADENCE`, and `FALLBACK_DISCOVERY`. A timer is only a wakeup: read current media PTS, check an epoch for seek/track/source/destroy, advance/query authoritative mpv state, render the state for **now** once, and schedule the next future transition. Keep one timer; compute `(mediaDeadline-currentPTS)/playbackRate` when playing; invalidate and recompute on rate, pause/resume, seek, resize, selection, visibility restoration and EOF. While hidden, do not replay missed cues; on return render current PTS and choose a new deadline. A paused seek must immediately render its target without starting periodic work. These are design requirements, not qualified implementation results.

The bounded native interface needs at least `active`, `currentStart`, **earliestNextVisualChange**, `nextKnownStart`, `requiresFrameCadence`, and `futureTimelineComplete` or `knownThrough`, plus a decoder/seek epoch. A single core-locked query would avoid contradictory fields. Internal diagnostics should count mode changes, snapshots, renders, invalidations, deadline lateness, discovery advances and stale callback drops. The public API need not expose mpv internals.

## CPU and timing evidence

The previous static SRT PoC measured renderer 11.82–13.64% at 60 Hz versus 6.70–7.45% with deadlines, and sampled subtitle worker 3.55% versus 0.27%. Its sampled visible transitions were baseline first +18 ms, clear +13 ms, second +19 ms; deadline first +5 ms, clear +34 ms, second +46 ms. These are short, nonproduction, host-contended samples. The +34/+46 ms deadline timing is not automatically acceptable, and three transitions cannot provide p50/p95. See `results/subtitle-timing-poc/REPORT.md` and its retained raw JSON.

A new matched whole-Chrome attempt was **rejected**. During its first baseline window, macOS `secd` rose to ~71% of one core and other Xcode/Firefox tasks were active; the run was stopped. The first baseline log is retained in `cpu-baseline.log` and must not be paired with another arm or used as a whole-player CPU claim. No qualified whole-Chrome delta, density comparison, or timing distribution was obtained in this audit. The event/deadline implementation also failed the metadata correctness gate above, so it would be misleading to run a production-player CPU qualification of that naive version.

## Production decision by class

| Subtitle class | Deadline scheduling | Frame cadence | Fallback needed | Production ready? |
|---|---|---|---|---|
| SRT | Plausible with earliest visual-change bridge | No for proven static cue | Yes until future completeness proven | **No**; overlapping clear and late discovery unresolved |
| WebVTT | Outside current mpv route | Current route unchanged | n/a | **No** for this service |
| mov_text | Plausible for current presented event semantics | No for proven static cue | Yes until future completeness proven | **No**; transitions and track lifecycle unqualified |
| Static ASS/SSA | Plausible with per-event boundaries | No if detector proves static | Yes for unknown state | **No**; overlap and active animation signal unresolved |
| Animated ASS/SSA | No during animation | Yes | Deadline can resume afterward | Keep existing cadence; dynamic switch unqualified |
| PGS | Unproven | Yes | Decoder/composition discovery likely | **No** |
| VobSub | Unproven | Yes | Decoder/composition discovery likely | **No** |

**Smallest next implementation for qualification:** add a decoder-level, bounded “earliest visual change + active animation + future completeness” control to pinned mpv; expose it through one test-only worker RPC; build an epoch-guarded one-timer host candidate that re-renders authoritative current PTS. First pass overlapping SRT/ASS, dense/tiny cues, delayed timers, rates, seeks, hidden-tab restoration, track/resize/EOF/destroy. Only then run clean, alternating whole-Chrome comparisons across densities. Do not promote cadence changes or rewrite subtitle rendering based on the current data.
