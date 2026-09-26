# Head-to-head correctness

Browser: chromium/153.0.8010.53/chrome/headed/5cf9f2f24ceb3e4a10fbce9dc2f1c4aa56fddd16640818dba1676d00f6d827f8. Player source: d7a3f7eb401ff9aa699f229b39b98a76b1f2fac3.

Each pass is a bounded synthetic marked-output/lifecycle screen, not a general player ranking.

| Case | Result | Details |
| --- | --- | --- |
| video.default.h264-vtt | passed | [record](video.default.h264-vtt/result.json) |
| demuxe.auto.h264-vtt | passed | [record](demuxe.auto.h264-vtt/result.json) |
| demuxe.software.h264-vtt | passed | [record](demuxe.software.h264-vtt/result.json) |
| movi.default.h264-vtt | failed | [record](movi.default.h264-vtt/result.json) |
| libmedia.default.h264-vtt | failed | [record](libmedia.default.h264-vtt/result.json) |
