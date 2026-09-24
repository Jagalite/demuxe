<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Modified media-engine sources in Demuxe

The next release uses the upstream archive revisions and SHA-256 pins in
`sources.lock.json`. The archives themselves remain unmodified. Demuxe applies
the following ordered patches when rebuilding. Each patch is present in the
matching source companion, and `scripts/apply-patches.py` checks the complete
series against the pinned archive before compilation. The upstream source
headers and grants remain in force for every modified file.

## mpv 2a4eb8067ca68ec19adf23daf8ccbb1a05afd6ed

| Patch | Modified area |
| --- | --- |
| `patches/0001-browser-audio-registration.patch` | Browser audio registration in Meson and `audio/out/ao.c` |
| `patches/0002-browser-attachment-budget.patch` | Demux attachment size bound |
| `patches/0003-browser-nested-avio.patch` | Browser-safe nested AVIO demux access |
| `patches/0004-optional-browser-decoder.patch` | Optional browser decoder integration |
| `patches/0011-dfpwm-packet-admission.patch` | DFPWM packet admission |
| `patches/0012-matroska-realaudio144.patch` | Matroska RealAudio 14.4 path |
| `patches/0013-browser-no-subprocess.patch` | Select mpv's unsupported subprocess stub on Emscripten |
| `patches/0014-subtitle-raw-timing.patch` | Internal numeric ASS event boundaries and decoder timing-change callback; public `sub-lines` unchanged |
| `patches/0015-subtitle-static-profile.patch` | Conservative static text qualification and bounded ASS scan state |
| `patches/0016-subtitle-visual-schedule.patch` | Decoder-owned visual mode and next boundary for ASS text, PGS, and DVD/VobSub |
| `patches/0017-subtitle-ass-scan-budget.patch` | Bounded ASS event scan work |
| `patches/0018-subtitle-timing-invalidation.patch` | Notify the service when subtitle options, FPS, or soft reset change the timing set |

`native/ao_browser.c` and `native/audio_bridge.h` are Demuxe original LGPL
integration sources copied into the mpv source tree by the patch replay script.
Other Demuxe browser bridge translation units in `native/` are identified by
their own LGPL or Apache SPDX headers in `licensing/boundaries.json`.

## FFmpeg n9.0.2

| Patch | Modified area |
| --- | --- |
| `patches/ffmpeg/0001-h264-sei-film-grain-build-dependency.patch` | H.264 SEI build dependency |
| `patches/ffmpeg/0002-browser-nested-avio.patch` | Nested browser AVIO access |
| `patches/ffmpeg/0004-hls-ts-discontinuity-timeline.patch` | HLS TS discontinuity timeline |
| `patches/ffmpeg/0005-dfpwm-seek-reset.patch` | DFPWM seek state |
| `patches/ffmpeg/0006-swf-audio-duration.patch` | SWF audio duration |
| `patches/ffmpeg/0007-nut-keyframe-recovery.patch` | NUT keyframe recovery |
| `patches/ffmpeg/0008-hls-indexed-webvtt-seek.patch` | HLS WebVTT seek |
| `patches/ffmpeg/0009-nut-discard-budget.patch` | NUT discard bound |

The HLS fMP4 seek index reset is included in FFmpeg 9.0.2 upstream. The
modified FFmpeg build uses its upstream-default decoder and demuxer
selection and disables GPL and nonfree mode. FFmpeg 9 no longer ships
libpostproc. The exact
configured component list, options and link maps are in the matching
`build-materials/` directory of the source companion. The individual upstream
copyright and license notices are in `third_party/notices/` and in the full
upstream source archives. `docs/LGPL-RELINK.md` gives the modification and
relinking procedure for recipients.
