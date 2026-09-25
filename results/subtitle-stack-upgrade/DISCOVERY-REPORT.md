<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Subtitle event discovery wakeup PoC

## Hook and limitation

The narrow decoder-side hook is in a **copied test-only** mpv `dec_sub.c`
archive member, immediately after its four `sd->driver->decode()` call sites:
segment decode, preload, ordinary packet read, and cached packet re-decode.
It posts a coalesced notification to the subtitle worker's main runtime
thread. The host responds with a timing-only `arm` RPC, which invalidates the
old deadline epoch, re-queries mpv's undeduplicated known boundaries, and
re-arms. It never renders merely because the notification arrived. The pinned
mpv source, production archive, worker, and host are unchanged.

This hook reports **decoded** events. It cannot make mpv read a demux packet
while its subtitle service is idle. The source is deliberately blocked after
ordinary rendering; in a gap, no packet decode may occur and therefore no
notification can fire. Ordinary `mpv_set_wakeup_callback` also remained at
four startup callbacks throughout these trials.

## Matched late-event check

Both arms used the same embedded SRT fixture, selected at PTS 5 s with only
`[1,4]` and `[200,210]` known, and armed the next deadline at 200 s. Test-only
host play invalidation was suppressed, so there was **one initial full render**
in each arm and no cue-boundary render in the 5–7.3 s observation window.

| Arm | Event list by PTS 7.3 | Decoder notifications | Full renders | Timing-only checks |
| --- | --- | ---: | ---: | ---: |
| Decode notification alone | Still two events | 0 | 1 | 0 |
| Decode notification + 1 Hz discovery check | Added `[380,390]` | 1 | 1 | 2 |

In the second arm, the first check at PTS 6.028 s took 0.395 ms of worker
time, advanced mpv's subtitle demux/decode state without rendering, and found
the third event. The decoder hook sent one notification; the host made a
timing-only re-arm at PTS 6.030 s. That re-query held all three event spans
and retained the current 200 s deadline. The second check took 0.075 ms.
Raw runs: `wakeup-late-deadline-at-five-no-play-render.json` and
`wakeup-late-deadline-at-five-poll-no-play-render.json`.

A separate run armed from PTS 0 shows that when mpv decodes the third packet
at an ordinary cue boundary, the notification alone re-queries the list and
sees `[380,390]` (`wakeup-late-deadline-from-start.json`). That useful fast
path does not replace discovery checks during idle gaps.

## Regression check and decision

The final test engine rendered SRT starts and clears with seven full renders
over roughly nine seconds. It rendered the same-text/different-style ASS
overlap and 5 s clear with six full renders over roughly eleven seconds.
Paused seek into/out of a cue and resume across the next clear worked for
both (`wakeup-srt-deadline.json`, `wakeup-ass-deadline.json`). No broad CPU
qualification was run. Two sub-millisecond timing checks over two seconds
are small compared with the former roughly 60 full render requests per
second, but this is not a measured whole-player CPU saving.

**CHEAP FALLBACK POLL IS PREFERABLE** for the current subtitle-only route.
Keep the decoder notification for prompt re-arming when mpv does decode, and
use a bounded, low-frequency `update_subtitles()` discovery check while future
events may still be incomplete. A raw-line query alone cannot discover
unread packets. Production timing safety still requires a known lookahead
horizon or an immediate demux-driven read path: a newly arriving cue earlier
than the next check could otherwise be late. Animated ASS, bitmaps, and
background timer throttling remain outside this PoC.
