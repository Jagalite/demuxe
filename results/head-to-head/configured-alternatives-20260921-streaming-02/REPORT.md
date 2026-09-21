# Head-to-head correctness

Browser: chromium/152.0.7977.83/chrome/headed. Player source: 6feb9b337889bfbaab8c5ac33bbddd0ca5d94f36.

Each pass is a bounded synthetic marked-output/lifecycle screen, not a general player ranking.

| Case | Result | Details |
| --- | --- | --- |
| movi.default.hls-ts | passed | [record](movi.default.hls-ts/result.json) |
| libmedia.default.hls-ts | failed | [record](libmedia.default.hls-ts/result.json) |
| movi.native-first.hls-ts | passed | [record](movi.native-first.hls-ts/result.json) |
| libmedia.prefer-mse.hls-ts | failed | [record](libmedia.prefer-mse.hls-ts/result.json) |
| movi.shaka-first.hls-ts | passed | [record](movi.shaka-first.hls-ts/result.json) |
| movi.default.hls-fmp4 | passed | [record](movi.default.hls-fmp4/result.json) |
| libmedia.default.hls-fmp4 | passed | [record](libmedia.default.hls-fmp4/result.json) |
| movi.native-first.hls-fmp4 | passed | [record](movi.native-first.hls-fmp4/result.json) |
| libmedia.prefer-mse.hls-fmp4 | passed | [record](libmedia.prefer-mse.hls-fmp4/result.json) |
| movi.shaka-first.hls-fmp4 | passed | [record](movi.shaka-first.hls-fmp4/result.json) |
| movi.default.hls-hevc | passed | [record](movi.default.hls-hevc/result.json) |
| libmedia.default.hls-hevc | passed | [record](libmedia.default.hls-hevc/result.json) |
| movi.native-first.hls-hevc | passed | [record](movi.native-first.hls-hevc/result.json) |
| libmedia.prefer-mse.hls-hevc | passed | [record](libmedia.prefer-mse.hls-hevc/result.json) |
| movi.shaka-first.hls-hevc | passed | [record](movi.shaka-first.hls-hevc/result.json) |
| movi.default.dash-h264 | passed | [record](movi.default.dash-h264/result.json) |
| libmedia.default.dash-h264 | passed | [record](libmedia.default.dash-h264/result.json) |
| movi.native-first.dash-h264 | passed | [record](movi.native-first.dash-h264/result.json) |
| libmedia.prefer-mse.dash-h264 | passed | [record](libmedia.prefer-mse.dash-h264/result.json) |
| movi.shaka-first.dash-h264 | passed | [record](movi.shaka-first.dash-h264/result.json) |
| movi.default.dash-av1 | passed | [record](movi.default.dash-av1/result.json) |
| libmedia.default.dash-av1 | failed | [record](libmedia.default.dash-av1/result.json) |
| movi.native-first.dash-av1 | passed | [record](movi.native-first.dash-av1/result.json) |
| libmedia.prefer-mse.dash-av1 | failed | [record](libmedia.prefer-mse.dash-av1/result.json) |
| movi.shaka-first.dash-av1 | passed | [record](movi.shaka-first.dash-av1/result.json) |
| movi.default.hls-live | passed | [record](movi.default.hls-live/result.json) |
| libmedia.default.hls-live | failed | [record](libmedia.default.hls-live/result.json) |
| movi.native-first.hls-live | failed | [record](movi.native-first.hls-live/result.json) |
| libmedia.prefer-mse.hls-live | failed | [record](libmedia.prefer-mse.hls-live/result.json) |
| movi.shaka-first.hls-live | passed | [record](movi.shaka-first.hls-live/result.json) |
| libmedia.live.hls-live | failed | [record](libmedia.live.hls-live/result.json) |
| libmedia.live-mse.hls-live | failed | [record](libmedia.live-mse.hls-live/result.json) |
