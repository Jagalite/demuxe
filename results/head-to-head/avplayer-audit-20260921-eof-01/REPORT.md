# Head-to-head correctness

Browser: chromium/152.0.7977.83/chrome/headed. Player source: 6feb9b337889bfbaab8c5ac33bbddd0ca5d94f36.

Each pass is a bounded synthetic marked-output/lifecycle screen, not a general player ranking.

| Case | Result | Details |
| --- | --- | --- |
| libmedia.default.h264-flac | passed | [record](libmedia.default.h264-flac/result.json) |
| libmedia.prefer-mse.h264-flac | failed | [record](libmedia.prefer-mse.h264-flac/result.json) |
| libmedia.prefer-mse.h264-flac51 | failed | [record](libmedia.prefer-mse.h264-flac51/result.json) |
| libmedia.prefer-mse.h264-opus | failed | [record](libmedia.prefer-mse.h264-opus/result.json) |
| libmedia.prefer-mse.av110-opus | failed | [record](libmedia.prefer-mse.av110-opus/result.json) |
| libmedia.prefer-mse.av1-webm | failed | [record](libmedia.prefer-mse.av1-webm/result.json) |
| libmedia.prefer-mse.hdr10-av1 | failed | [record](libmedia.prefer-mse.hdr10-av1/result.json) |
| libmedia.default.hls-ts | passed | [record](libmedia.default.hls-ts/result.json) |
| libmedia.prefer-mse.hls-ts | passed | [record](libmedia.prefer-mse.hls-ts/result.json) |
