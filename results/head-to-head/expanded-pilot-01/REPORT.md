# Head-to-head correctness

Browser: chromium/152.0.7977.83/chrome/headless. Player source: 8666434920cd4f4fc35a5c099901826e03be8916.

Each pass is a bounded synthetic marked-output/lifecycle screen, not a general player ranking.

| Case | Result | Details |
| --- | --- | --- |
| video.default.h264-silent | passed | [record](video.default.h264-silent/result.json) |
| demuxe.auto.h264-srt | failed | [record](demuxe.auto.h264-srt/result.json) |
| video.default.h264-vtt | failed | [record](video.default.h264-vtt/result.json) |
| movi.default.h264-ass | failed | [record](movi.default.h264-ass/result.json) |
| video.default.audio-mp3 | passed | [record](video.default.audio-mp3/result.json) |
| demuxe.auto.audio-flac | passed | [record](demuxe.auto.audio-flac/result.json) |
| libmedia.default.hls-fmp4 | passed | [record](libmedia.default.hls-fmp4/result.json) |
