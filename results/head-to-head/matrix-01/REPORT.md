# Head-to-head correctness

Browser: chromium/152.0.7977.83/chrome/headless. Player source: a99e793beab78ec6f28cae252562cb844af527c5.

Each pass is a bounded synthetic marked-output/lifecycle screen, not a general player ranking.

| Case | Result | Details |
| --- | --- | --- |
| video.default.aac-mp4 | passed | [record](video.default.aac-mp4/result.json) |
| demuxe.auto.aac-mp4 | passed | [record](demuxe.auto.aac-mp4/result.json) |
| demuxe.native.aac-mp4 | passed | [record](demuxe.native.aac-mp4/result.json) |
| movi.default.aac-mp4 | failed | [record](movi.default.aac-mp4/result.json) |
| movi.native-first.aac-mp4 | passed | [record](movi.native-first.aac-mp4/result.json) |
| libmedia.default.aac-mp4 | passed | [record](libmedia.default.aac-mp4/result.json) |
| libmedia.prefer-mse.aac-mp4 | passed | [record](libmedia.prefer-mse.aac-mp4/result.json) |
| video.default.aac-mkv | passed | [record](video.default.aac-mkv/result.json) |
| demuxe.auto.aac-mkv | passed | [record](demuxe.auto.aac-mkv/result.json) |
| demuxe.native.aac-mkv | passed | [record](demuxe.native.aac-mkv/result.json) |
| movi.default.aac-mkv | failed | [record](movi.default.aac-mkv/result.json) |
| movi.native-first.aac-mkv | passed | [record](movi.native-first.aac-mkv/result.json) |
| libmedia.default.aac-mkv | passed | [record](libmedia.default.aac-mkv/result.json) |
| libmedia.prefer-mse.aac-mkv | passed | [record](libmedia.prefer-mse.aac-mkv/result.json) |
| video.default.pcm-mkv | passed | [record](video.default.pcm-mkv/result.json) |
| demuxe.auto.pcm-mkv | passed | [record](demuxe.auto.pcm-mkv/result.json) |
| demuxe.native.pcm-mkv | passed | [record](demuxe.native.pcm-mkv/result.json) |
| movi.default.pcm-mkv | passed | [record](movi.default.pcm-mkv/result.json) |
| movi.native-first.pcm-mkv | passed | [record](movi.native-first.pcm-mkv/result.json) |
| libmedia.default.pcm-mkv | failed | [record](libmedia.default.pcm-mkv/result.json) |
| libmedia.prefer-mse.pcm-mkv | failed | [record](libmedia.prefer-mse.pcm-mkv/result.json) |
| video.default.pcm-ass | passed | [record](video.default.pcm-ass/result.json) |
| demuxe.auto.pcm-ass | blocked | [record](demuxe.auto.pcm-ass/result.json) |
| demuxe.native.pcm-ass | passed | [record](demuxe.native.pcm-ass/result.json) |
| movi.default.pcm-ass | failed | [record](movi.default.pcm-ass/result.json) |
| movi.native-first.pcm-ass | passed | [record](movi.native-first.pcm-ass/result.json) |
| libmedia.default.pcm-ass | failed | [record](libmedia.default.pcm-ass/result.json) |
| libmedia.prefer-mse.pcm-ass | failed | [record](libmedia.prefer-mse.pcm-ass/result.json) |
