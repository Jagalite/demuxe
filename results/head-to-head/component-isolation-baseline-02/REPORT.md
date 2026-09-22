# Head-to-head correctness

Browser: chromium/152.0.7977.83/chrome/headed. Player source: 7baf76570e2c5708ab0f8107c86803fa864efada.

Each pass is a bounded synthetic marked-output/lifecycle screen, not a general player ranking.

| Case | Result | Details |
| --- | --- | --- |
| demuxe.auto.h264-ac3 | failed | [record](demuxe.auto.h264-ac3/result.json) |
| demuxe.auto.h264-eac3 | failed | [record](demuxe.auto.h264-eac3/result.json) |
| demuxe.auto.h264-dts | blocked | [record](demuxe.auto.h264-dts/result.json) |
| demuxe.auto.hevc10-ac3 | failed | [record](demuxe.auto.hevc10-ac3/result.json) |
| demuxe.auto.hevc10-eac3 | passed | [record](demuxe.auto.hevc10-eac3/result.json) |
| demuxe.auto.hevc10-dts | failed | [record](demuxe.auto.hevc10-dts/result.json) |
| demuxe.auto.h264-srt | passed | [record](demuxe.auto.h264-srt/result.json) |
| demuxe.auto.h264-movtext | passed | [record](demuxe.auto.h264-movtext/result.json) |
| demuxe.auto.h264-ass | passed | [record](demuxe.auto.h264-ass/result.json) |
| demuxe.auto.hevc-pgs | failed | [record](demuxe.auto.hevc-pgs/result.json) |
| demuxe.auto.h264-vobsub | passed | [record](demuxe.auto.h264-vobsub/result.json) |
| demuxe.auto.hdr10-hevc | blocked | [record](demuxe.auto.hdr10-hevc/result.json) |
| demuxe.auto.dash-h264 | failed | [record](demuxe.auto.dash-h264/result.json) |
| demuxe.auto.dash-av1 | passed | [record](demuxe.auto.dash-av1/result.json) |
| demuxe.auto.hls-live | passed | [record](demuxe.auto.hls-live/result.json) |
| demuxe.auto.pcm-ass | passed | [record](demuxe.auto.pcm-ass/result.json) |
