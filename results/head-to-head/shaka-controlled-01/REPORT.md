# Head-to-head correctness

Browser: chromium/152.0.7977.83/chrome/headed. Player source: 6feb9b337889bfbaab8c5ac33bbddd0ca5d94f36.

Each pass is a bounded synthetic marked-output/lifecycle screen, not a general player ranking.

| Case | Result | Details |
| --- | --- | --- |
| demuxe.auto.hls-ts | passed | [record](demuxe.auto.hls-ts/result.json) |
| video.default.hls-fmp4 | passed | [record](video.default.hls-fmp4/result.json) |
| demuxe.auto.hls-fmp4 | passed | [record](demuxe.auto.hls-fmp4/result.json) |
| demuxe.hybrid.hls-fmp4 | failed | [record](demuxe.hybrid.hls-fmp4/result.json) |
| demuxe.software.hls-fmp4 | passed | [record](demuxe.software.hls-fmp4/result.json) |
| demuxe.auto.hls-hevc | failed | [record](demuxe.auto.hls-hevc/result.json) |
| demuxe.auto.dash-h264 | passed | [record](demuxe.auto.dash-h264/result.json) |
| demuxe.auto.dash-av1 | passed | [record](demuxe.auto.dash-av1/result.json) |
| demuxe.hybrid.dash-av1 | passed | [record](demuxe.hybrid.dash-av1/result.json) |
| demuxe.software.dash-av1 | passed | [record](demuxe.software.dash-av1/result.json) |
| demuxe.auto.hls-live | passed | [record](demuxe.auto.hls-live/result.json) |
