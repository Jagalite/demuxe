# Head-to-head correctness

Browser: chromium/152.0.7977.83/chrome/headed. Player source: ee7fe7774270fe34fe617cb0dd5adb9d9e9f689e.

Each pass is a bounded synthetic marked-output/lifecycle screen, not a general player ranking.

| Case | Result | Details |
| --- | --- | --- |
| video.default.pcm-ass | passed | [record](video.default.pcm-ass/result.json) |
| demuxe.auto.pcm-ass | passed | [record](demuxe.auto.pcm-ass/result.json) |
| movi.default.pcm-ass | failed | [record](movi.default.pcm-ass/result.json) |
| libmedia.default.pcm-ass | failed | [record](libmedia.default.pcm-ass/result.json) |
