# Head-to-head correctness

Browser: chromium/153.0.8010.53/chrome/headed/5cf9f2f24ceb3e4a10fbce9dc2f1c4aa56fddd16640818dba1676d00f6d827f8. Player source: 20b5cd0319a64334c29d36ea7a6c8cdac7c6f4d8.

Each pass is a bounded synthetic marked-output/lifecycle screen, not a general player ranking.

| Case | Result | Details |
| --- | --- | --- |
| video.default.pcm-mkv | passed | [record](video.default.pcm-mkv/result.json) |
| demuxe.auto.pcm-mkv | passed | [record](demuxe.auto.pcm-mkv/result.json) |
| demuxe.software.pcm-mkv | passed | [record](demuxe.software.pcm-mkv/result.json) |
| movi.default.pcm-mkv | passed | [record](movi.default.pcm-mkv/result.json) |
| libmedia.default.pcm-mkv | failed | [record](libmedia.default.pcm-mkv/result.json) |
