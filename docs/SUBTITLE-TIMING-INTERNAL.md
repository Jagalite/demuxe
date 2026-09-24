<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Internal subtitle visual scheduling

The pinned mpv adaptations are `patches/0014-subtitle-raw-timing.patch`,
`patches/0015-subtitle-static-profile.patch`,
`patches/0016-subtitle-visual-schedule.patch`,
`patches/0017-subtitle-ass-scan-budget.patch`, and
`patches/0018-subtitle-timing-invalidation.patch`. Production uses
`sub_visual_schedule(dec_sub *, media_pts, &next)` through
`subtitle_service_visual_schedule(pts, &next, &epoch)`. The result is
`0` unsupported, `1` deadline, or `2` animated; `next` is the earliest known
visual start/end after PTS. The service returns `-2` if the decoder epoch
changes across both bounded query attempts. It converts subtitle-local PTS
through mpv's subtitle delay and speed handling. The query neither demuxes nor
renders. The older numeric `sub_next_raw_boundary` hook remains available for
internal tests. Public `sub-lines` still uses mpv's plain-text deduplication.

`sd_ass` supplies undeduplicated ASS event starts and ends. At the current
PTS, it uses mpv's own `is_animated` detection and event Effect field to
select animated frame cadence for active `\fad`, `\move`, `\t`, karaoke, and
effect events; other intervals use deadlines. SRT and mov_text use the same
ASS decoder timing path. For ASS/SSA, deadline qualification still requires a
complete mpv event timeline. The worker attempts a bounded asynchronous EOF
scan on seekable files, restores the prior position, and falls back to frame
cadence if it cannot finish or restore safely. There is no whole-file byte cap.

`sd_lavc` supplies PGS and DVD/VobSub start/end boundaries from its decoded
bitmap queue, including clear packets; DVD menu highlight state is unsupported
and retains frame cadence. Exact browser seeks can land after a still-active
bitmap packet. The service asks mpv's own subtitle-step index for the last
known bitmap start, then replays from that point to the requested PTS. No
bitmap packet content is parsed in JavaScript.

Every decoded packet, decoder option update, soft reset, source/track change,
and seek invalidates a native epoch. The service invalidates before setting
`sub-delay`, so a concurrent query cannot retain an old deadline.
The timing callback also covers video FPS updates that change subtitle PTS
conversion. The notification is metadata only; it does not request a render.
The callback runs under `dec_sub`'s lock and never reenters mpv; the
service coalesces notifications to the worker. The worker runs a roughly 10 Hz
`update_subtitles()` pump while a supported track plays, queries visual mode,
and arms one epoch-guarded timer for a deadline. The host renders on deadlines
and lifecycle invalidations, runs frame cadence only while mpv reports an
active animation or unsupported state, and follows worker mode transitions.
Pause, seek, track/source, visibility, resize, and rate changes invalidate the
host revision and rearm through the worker. All demux, decode, subtitle timing,
libass behavior, seeking, and pixels remain mpv-owned; the subtitle service
allocates no mpv audio or video chains.
