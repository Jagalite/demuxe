# Head-to-head correctness

Browser: chromium/152.0.7977.83/chrome/headless. Player source: 8666434920cd4f4fc35a5c099901826e03be8916.

Each pass is a bounded synthetic marked-output/lifecycle screen, not a general player ranking.

| Case | Result | Details |
| --- | --- | --- |
| demuxe.auto.h264-aac51 | blocked | [record](demuxe.auto.h264-aac51/result.json) |
| demuxe.auto.h264-mp3 | passed | [record](demuxe.auto.h264-mp3/result.json) |
| demuxe.auto.h264-ac3 | blocked | [record](demuxe.auto.h264-ac3/result.json) |
| demuxe.auto.h264-eac3 | blocked | [record](demuxe.auto.h264-eac3/result.json) |
| demuxe.auto.h264-dts | blocked | [record](demuxe.auto.h264-dts/result.json) |
| demuxe.auto.h264-flac | passed | [record](demuxe.auto.h264-flac/result.json) |
| demuxe.auto.h264-flac51 | blocked | [record](demuxe.auto.h264-flac51/result.json) |
| demuxe.auto.h264-opus | passed | [record](demuxe.auto.h264-opus/result.json) |
| demuxe.auto.h264-pcm16 | passed | [record](demuxe.auto.h264-pcm16/result.json) |
| demuxe.auto.h264-pcm51 | blocked | [record](demuxe.auto.h264-pcm51/result.json) |
| demuxe.auto.hevc-hvc1 | passed | [record](demuxe.auto.hevc-hvc1/result.json) |
| demuxe.auto.hevc-hev1 | passed | [record](demuxe.auto.hevc-hev1/result.json) |
| demuxe.auto.hevc10-aac | passed | [record](demuxe.auto.hevc10-aac/result.json) |
| demuxe.auto.hevc10-ac3 | passed | [record](demuxe.auto.hevc10-ac3/result.json) |
| demuxe.auto.hevc10-eac3 | passed | [record](demuxe.auto.hevc10-eac3/result.json) |
| demuxe.auto.hevc10-dts | passed | [record](demuxe.auto.hevc10-dts/result.json) |
| demuxe.auto.av1-aac | passed | [record](demuxe.auto.av1-aac/result.json) |
| demuxe.auto.av110-opus | passed | [record](demuxe.auto.av110-opus/result.json) |
| demuxe.auto.av1-webm | passed | [record](demuxe.auto.av1-webm/result.json) |
| demuxe.auto.vp9-opus | passed | [record](demuxe.auto.vp9-opus/result.json) |
| demuxe.auto.vp910-opus | passed | [record](demuxe.auto.vp910-opus/result.json) |
| demuxe.auto.vp8-vorbis | passed | [record](demuxe.auto.vp8-vorbis/result.json) |
| demuxe.auto.h264-ts | passed | [record](demuxe.auto.h264-ts/result.json) |
| demuxe.auto.mpeg2-ac3 | passed | [record](demuxe.auto.mpeg2-ac3/result.json) |
| demuxe.auto.mpeg2-mp2 | passed | [record](demuxe.auto.mpeg2-mp2/result.json) |
| demuxe.auto.mpeg4-mp3 | passed | [record](demuxe.auto.mpeg4-mp3/result.json) |
| demuxe.auto.prores-pcm | passed | [record](demuxe.auto.prores-pcm/result.json) |
| demuxe.auto.h264-fmp4 | passed | [record](demuxe.auto.h264-fmp4/result.json) |
| demuxe.auto.h264-silent | passed | [record](demuxe.auto.h264-silent/result.json) |
| demuxe.auto.h264-srt | passed | [record](demuxe.auto.h264-srt/result.json) |
| demuxe.auto.h264-vtt | passed | [record](demuxe.auto.h264-vtt/result.json) |
| demuxe.auto.h264-movtext | passed | [record](demuxe.auto.h264-movtext/result.json) |
| demuxe.auto.h264-ass | passed | [record](demuxe.auto.h264-ass/result.json) |
| demuxe.auto.hevc-pgs | failed | [record](demuxe.auto.hevc-pgs/result.json) |
| demuxe.auto.h264-vobsub | passed | [record](demuxe.auto.h264-vobsub/result.json) |
| demuxe.auto.audio-aac | passed | [record](demuxe.auto.audio-aac/result.json) |
| demuxe.auto.audio-mp3 | passed | [record](demuxe.auto.audio-mp3/result.json) |
| demuxe.auto.audio-flac | passed | [record](demuxe.auto.audio-flac/result.json) |
| demuxe.auto.audio-opus | passed | [record](demuxe.auto.audio-opus/result.json) |
| demuxe.auto.audio-vorbis | passed | [record](demuxe.auto.audio-vorbis/result.json) |
| demuxe.auto.audio-pcm16 | passed | [record](demuxe.auto.audio-pcm16/result.json) |
| demuxe.auto.audio-pcm24 | passed | [record](demuxe.auto.audio-pcm24/result.json) |
| demuxe.auto.hdr10-hevc | blocked | [record](demuxe.auto.hdr10-hevc/result.json) |
| demuxe.auto.hlg-hevc | blocked | [record](demuxe.auto.hlg-hevc/result.json) |
| demuxe.auto.hdr10-av1 | blocked | [record](demuxe.auto.hdr10-av1/result.json) |
| demuxe.auto.hevc-truehd | blocked | [record](demuxe.auto.hevc-truehd/result.json) |
| demuxe.auto.hevc-dtshd | blocked | [record](demuxe.auto.hevc-dtshd/result.json) |
| demuxe.auto.hevc-atmos | blocked | [record](demuxe.auto.hevc-atmos/result.json) |
| demuxe.auto.dv5 | blocked | [record](demuxe.auto.dv5/result.json) |
| demuxe.auto.dv81 | blocked | [record](demuxe.auto.dv81/result.json) |
| demuxe.auto.hls-ts | passed | [record](demuxe.auto.hls-ts/result.json) |
| demuxe.auto.hls-fmp4 | failed | [record](demuxe.auto.hls-fmp4/result.json) |
| demuxe.auto.hls-hevc | failed | [record](demuxe.auto.hls-hevc/result.json) |
| demuxe.auto.dash-h264 | failed | [record](demuxe.auto.dash-h264/result.json) |
| demuxe.auto.dash-av1 | passed | [record](demuxe.auto.dash-av1/result.json) |
| demuxe.auto.hls-live | passed | [record](demuxe.auto.hls-live/result.json) |
