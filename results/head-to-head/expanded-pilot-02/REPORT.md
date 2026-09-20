# Head-to-head correctness

Browser: chromium/152.0.7977.83/chrome/headless. Player source: 8666434920cd4f4fc35a5c099901826e03be8916.

Each pass is a bounded synthetic marked-output/lifecycle screen, not a general player ranking.

| Case | Result | Details |
| --- | --- | --- |
| video.default.h264-aac51 | blocked | [record](video.default.h264-aac51/result.json) |
| video.default.h264-vtt | passed | [record](video.default.h264-vtt/result.json) |
| libmedia.default.dash-h264 | passed | [record](libmedia.default.dash-h264/result.json) |
| demuxe.auto.hls-live | blocked | [record](demuxe.auto.hls-live/result.json) |
