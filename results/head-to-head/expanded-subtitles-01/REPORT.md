# Head-to-head correctness

Browser: chromium/152.0.7977.83/chrome/headless. Player source: 8666434920cd4f4fc35a5c099901826e03be8916.

Each pass is a bounded synthetic marked-output/lifecycle screen, not a general player ranking.

| Case | Result | Details |
| --- | --- | --- |
| video.default.h264-srt | failed | [record](video.default.h264-srt/result.json) |
| demuxe.auto.h264-srt | blocked | [record](demuxe.auto.h264-srt/result.json) |
| movi.default.h264-srt | failed | [record](movi.default.h264-srt/result.json) |
| libmedia.default.h264-srt | failed | [record](libmedia.default.h264-srt/result.json) |
| video.default.h264-vtt | passed | [record](video.default.h264-vtt/result.json) |
| demuxe.auto.h264-vtt | blocked | [record](demuxe.auto.h264-vtt/result.json) |
| movi.default.h264-vtt | failed | [record](movi.default.h264-vtt/result.json) |
| libmedia.default.h264-vtt | failed | [record](libmedia.default.h264-vtt/result.json) |
| video.default.h264-movtext | failed | [record](video.default.h264-movtext/result.json) |
| demuxe.auto.h264-movtext | blocked | [record](demuxe.auto.h264-movtext/result.json) |
| movi.default.h264-movtext | failed | [record](movi.default.h264-movtext/result.json) |
| libmedia.default.h264-movtext | failed | [record](libmedia.default.h264-movtext/result.json) |
| video.default.h264-ass | failed | [record](video.default.h264-ass/result.json) |
| demuxe.auto.h264-ass | blocked | [record](demuxe.auto.h264-ass/result.json) |
| movi.default.h264-ass | failed | [record](movi.default.h264-ass/result.json) |
| libmedia.default.h264-ass | failed | [record](libmedia.default.h264-ass/result.json) |
| video.default.hevc-pgs | failed | [record](video.default.hevc-pgs/result.json) |
| demuxe.auto.hevc-pgs | blocked | [record](demuxe.auto.hevc-pgs/result.json) |
| movi.default.hevc-pgs | failed | [record](movi.default.hevc-pgs/result.json) |
| libmedia.default.hevc-pgs | failed | [record](libmedia.default.hevc-pgs/result.json) |
| video.default.h264-vobsub | failed | [record](video.default.h264-vobsub/result.json) |
| demuxe.auto.h264-vobsub | blocked | [record](demuxe.auto.h264-vobsub/result.json) |
| movi.default.h264-vobsub | failed | [record](movi.default.h264-vobsub/result.json) |
| libmedia.default.h264-vobsub | failed | [record](libmedia.default.h264-vobsub/result.json) |
