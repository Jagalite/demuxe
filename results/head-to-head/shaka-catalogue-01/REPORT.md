# Head-to-head correctness

Browser: chromium/152.0.7977.83/chrome/headed. Player source: 6feb9b337889bfbaab8c5ac33bbddd0ca5d94f36.

Each pass is a bounded synthetic marked-output/lifecycle screen, not a general player ranking.

| Case | Result | Details |
| --- | --- | --- |
| video.default.hls-ts | passed | [record](video.default.hls-ts/result.json) |
| demuxe.auto.hls-ts | passed | [record](demuxe.auto.hls-ts/result.json) |
| movi.default.hls-ts | failed | [record](movi.default.hls-ts/result.json) |
| libmedia.default.hls-ts | failed | [record](libmedia.default.hls-ts/result.json) |
| video.default.hls-fmp4 | passed | [record](video.default.hls-fmp4/result.json) |
| demuxe.auto.hls-fmp4 | passed | [record](demuxe.auto.hls-fmp4/result.json) |
| movi.default.hls-fmp4 | failed | [record](movi.default.hls-fmp4/result.json) |
| libmedia.default.hls-fmp4 | passed | [record](libmedia.default.hls-fmp4/result.json) |
| video.default.hls-hevc | passed | [record](video.default.hls-hevc/result.json) |
| demuxe.auto.hls-hevc | passed | [record](demuxe.auto.hls-hevc/result.json) |
| movi.default.hls-hevc | failed | [record](movi.default.hls-hevc/result.json) |
| libmedia.default.hls-hevc | passed | [record](libmedia.default.hls-hevc/result.json) |
| video.default.dash-h264 | failed | [record](video.default.dash-h264/result.json) |
| demuxe.auto.dash-h264 | passed | [record](demuxe.auto.dash-h264/result.json) |
| movi.default.dash-h264 | failed | [record](movi.default.dash-h264/result.json) |
| libmedia.default.dash-h264 | passed | [record](libmedia.default.dash-h264/result.json) |
| video.default.dash-av1 | failed | [record](video.default.dash-av1/result.json) |
| demuxe.auto.dash-av1 | passed | [record](demuxe.auto.dash-av1/result.json) |
| movi.default.dash-av1 | failed | [record](movi.default.dash-av1/result.json) |
| libmedia.default.dash-av1 | failed | [record](libmedia.default.dash-av1/result.json) |
| video.default.hls-live | failed | [record](video.default.hls-live/result.json) |
| demuxe.auto.hls-live | passed | [record](demuxe.auto.hls-live/result.json) |
| movi.default.hls-live | failed | [record](movi.default.hls-live/result.json) |
| libmedia.default.hls-live | failed | [record](libmedia.default.hls-live/result.json) |
