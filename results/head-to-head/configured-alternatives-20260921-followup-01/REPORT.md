# Head-to-head correctness

Browser: chromium/152.0.7977.83/chrome/headed. Player source: 6feb9b337889bfbaab8c5ac33bbddd0ca5d94f36.

Each pass is a bounded synthetic marked-output/lifecycle screen, not a general player ranking.

| Case | Result | Details |
| --- | --- | --- |
| movi.default.h264-srt | failed | [record](movi.default.h264-srt/result.json) |
| movi.native-first.h264-srt | failed | [record](movi.native-first.h264-srt/result.json) |
| movi.default.h264-vtt | failed | [record](movi.default.h264-vtt/result.json) |
| movi.native-first.h264-vtt | passed | [record](movi.native-first.h264-vtt/result.json) |
| movi.default.h264-movtext | failed | [record](movi.default.h264-movtext/result.json) |
| movi.native-first.h264-movtext | failed | [record](movi.native-first.h264-movtext/result.json) |
| movi.default.h264-ass | failed | [record](movi.default.h264-ass/result.json) |
| movi.native-first.h264-ass | failed | [record](movi.native-first.h264-ass/result.json) |
| movi.default.hevc-pgs | failed | [record](movi.default.hevc-pgs/result.json) |
| movi.native-first.hevc-pgs | failed | [record](movi.native-first.hevc-pgs/result.json) |
| movi.default.h264-vobsub | failed | [record](movi.default.h264-vobsub/result.json) |
| movi.native-first.h264-vobsub | failed | [record](movi.native-first.h264-vobsub/result.json) |
| libmedia.live.hls-live | failed | [record](libmedia.live.hls-live/result.json) |
| libmedia.live-mse.hls-live | failed | [record](libmedia.live-mse.hls-live/result.json) |
| movi.default.pcm-ass | failed | [record](movi.default.pcm-ass/result.json) |
| movi.native-first.pcm-ass | failed | [record](movi.native-first.pcm-ass/result.json) |
