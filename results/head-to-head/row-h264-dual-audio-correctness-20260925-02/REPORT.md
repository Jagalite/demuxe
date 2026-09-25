# Head-to-head correctness

Browser: chromium/153.0.8010.53/chrome/headed/5cf9f2f24ceb3e4a10fbce9dc2f1c4aa56fddd16640818dba1676d00f6d827f8. Player source: 20b5cd0319a64334c29d36ea7a6c8cdac7c6f4d8.

Each pass is a bounded synthetic marked-output/lifecycle screen, not a general player ranking.

| Case | Result | Details |
| --- | --- | --- |
| video.default.h264-dual-audio | passed | [record](video.default.h264-dual-audio/result.json) |
| demuxe.auto.h264-dual-audio | passed | [record](demuxe.auto.h264-dual-audio/result.json) |
| demuxe.software.h264-dual-audio | passed | [record](demuxe.software.h264-dual-audio/result.json) |
| movi.default.h264-dual-audio | failed | [record](movi.default.h264-dual-audio/result.json) |
| libmedia.default.h264-dual-audio | passed | [record](libmedia.default.h264-dual-audio/result.json) |
