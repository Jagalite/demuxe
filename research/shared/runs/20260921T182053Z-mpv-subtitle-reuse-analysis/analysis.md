# mpv subtitle-only reuse: source review and native control tests

## Decision

Pursue a narrow adapter around mpv's existing subtitle pipeline. Do not replicate general mpv subtitle semantics in JavaScript, and do not assume disabling A/V makes the public player a subtitle service. A restricted ASS-only libass adapter remains reasonable if deliberately accepting its smaller contract. No production change or browser performance claim is made by this investigation.

## Source and test identity

Demuxe sources.lock.json pins mpv v0.40.0. The available source tree is in the prior webmpv checkout. Its archive SHA-256 is 10a0f4654f62140a6dd4d380dcf0bbdbdcf6e697556863dc499c296182f081a3, matching both checkouts' locks. player/sub.c, sub/dec_sub.c, sub/sd_ass.c, sub/sd_lavc.c, player/loadfile.c and player/playloop.c were byte-compared to the verified archive and match upstream. demux/demux.c and demux_mkv.c contain local changes: those observations describe this local source snapshot. Hashes are retained. The installed executable used for controls is mpv v0.41.0, FFmpeg 8.1.1 build / 8.1.2 runtime; native controls are not tests of the pinned Wasm binary.

## Responsibilities worth retaining

| Responsibility | Source evidence | Replacement implication |
| --- | --- | --- |
| Track lifecycle and embedded font collection | player/sub.c:48, 172, 195, 220 | Selecting a renderer alone does not preserve track and attachment lifecycle. |
| Codec-specific subtitle decoding | sub/dec_sub.c:183; sub/sd_ass.c:300; sub/sd_lavc.c:77 | ASS plus converted text and bitmap formats need different drivers. Availability still depends on compiled codecs. |
| Time mapping | sub/dec_sub.c:84-119 | Subtitle delay, subtitle speed/FPS and reverse direction are separate from the browser media clock. Avoid double-applying playback rate. |
| Packet lookahead and sparse data | sub/dec_sub.c:328; demux/demux.c:636, 2762 | Need enough packets for a requested time, without unbounded read-to-next-subtitle across a sparse interval. |
| Unknown durations / timing adjustments | sub/sd_ass.c:453, 659 | Text conversion and optional gap/overlap repair are outside raw libass rendering. |
| Seeking into an existing cue | player/playloop.c:245,378; demux/demux_mkv.c:3418 | Reset plus demux preroll/cache must recover cues that began before the seek target. |
| Bitmap formats and composition | sub/sd_lavc.c; sub/osd.c:329 | libass alone does not implement PGS/VobSub decoding. |
| Geometry / redraw | player/sub.c:104; sub/osd.c; sub/sd_ass.c | Supply source geometry, output geometry, video parameters; redraw animated cues and paused resizes. |

## Why public player options are insufficient

player/loadfile.c:1843 rejects no A/V chains under automatic track selection. track-auto-selection=no avoids that load failure, but disables initial selection of all track types. Explicitly toggling sid after load selects the subtitle stream.

player/playloop.c:1118 derives playback_pts from video or audio. A seek can report a requested time-pos without establishing a progressing subtitle presentation clock. player/command.c:3211 returns sub-text unavailable when there is no subtitle decoder or playback_pts is unset.

Executed synthetic six-second H264/AAC/ASS fixture with a long cue spanning 0.5-3.5s and another at 4-5.5s:

- aid=no, vid=no, sid=1: file unloads to idle; no time-pos or subtitles.
- track-auto-selection=no, A/V disabled: remains loaded, accepts seeks, time-pos stays at 2s after unpausing; initial subtitle unselected.
- Post-load sid=no then sid=1: track-list confirms selected subtitle, no selected A/V; seeks accepted but sub-text remains unavailable and clock stays at 2s.
- Audio clock control (vid=no, ao=null): AAC decoder remains active; at 2s LONG CUE is returned; clock progresses to ~2.46s and backward seek recovers LONG CUE.

An initial run used the wrong option spelling stream-auto-selection and failed at argument parsing. It is retained in initial-results.json; the corrected tests above are authoritative. The audio control proves disabling output is not equivalent to disabling decoding. These tests do not prove subtitle bitmap output from a new adapter.

## Existing Demuxe reuse

experiments/retained-subtitles/subtitles.c already exports mpv OSD subtitles as LIBASS or BGRA tiles via osd_render(..., OSD_DRAW_SUB_ONLY, ...), bounded to 512 parts and 2 MiB. It excludes video pixels and tracks change IDs. scripts/link-hybrid.sh includes this code in the Hybrid link. However experiments/retained-subtitles/vo_libmpv.c:420 invokes it from video rendering at the current mpv frame PTS. With no mpv video frame, this is not an external-clock interface.

native/subtitles/ass.c and NativeASS are smaller standalone libass components: whole external ASS script + fonts + explicit time, with budgets. They do not reproduce mpv's demux, conversion, bitmap drivers or seek preroll.

## Proposed smallest useful prototype

Keep mpv's selected-track demux and subtitle decoder in one worker initially. Add a private internal bridge, pinned to the current mpv source, with open/select, renderAt(sourceTime, geometry, epoch), seek(target, epoch), delay/visibility and close. Reuse sub_create, sub_read_packets, sub_get_bitmaps / osd_render, sub_reset and existing tile transport. These are internal C functions, not stable public libmpv ABI.

All mutations run on the owning core/worker thread; bitmap export must honor mpv/OSD locks and lifetime. A renderAt operation advances subtitle packet availability to browser source time and renders, but never seeks every video frame. Real discontinuities use demux seek plus preroll, reset, a new epoch and cancellation of stale tiles. Browser currentTime is the media clock; browser playbackRate is not applied again to that timestamp. Explicit subtitle speed/delay still use mpv's mapping. Pause does not imply no redraw: geometry, visibility, animated ASS time changes and track changes matter.

First integrate a second, bounded read-only subtitle demuxer to avoid assuming shared packet ownership is easy. This still reads container/video packet bytes even without A/V decoding, and may duplicate remux I/O/cache. Once correct, measure that cost; sharing transport byte reads is a smaller subsequent step than transferring ownership of mpv demux packets into the existing FFmpeg remuxer. Any shared seek or cancellation must not disturb browser playback.

## Qualification and decision threshold

Use authored ASS with attached fonts, overlap/animation, long cues across seeks, SRT conversion and a separately qualified bitmap fixture. Compare tile/pixel output to ordinary mpv at fixed source times; include an absent-subtitle negative control. Verify delayed packet arrival, repeated forward/back seek, pause/resize, delay, track replacement, source cancellation and cleanup. Assert no video/audio decoder instances and no PCM worklet; log read bytes and queue bounds.

Only then compare browser remux + mpv-subtitles against remux + standalone libass and full Software on identical real-time work. Include startup bytes, duplicate reads, Wasm memory, CPU, source replacement and long sparse-cue intervals. The adapter makes sense if it preserves required mpv behavior with bounded read/memory costs and substantially lower CPU than full decoding. No percentage is established here.

## Conclusion

The difficult behavior already exists inside mpv, and the code exposes timestamp-parameterized internal subtitle operations. Reusing that subsystem is a credible engineering path and preferable to promising a general reimplementation. A small private integration bridge is required; neither an options-only solution nor a drop-in standalone subtitle API was demonstrated. Firefox's separate Main10 picture failure remains independent of this architecture choice.
