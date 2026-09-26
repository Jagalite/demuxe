# Head-to-head correctness

Browser: chromium/153.0.8010.53/chrome/headed/5cf9f2f24ceb3e4a10fbce9dc2f1c4aa56fddd16640818dba1676d00f6d827f8. Player source: d7a3f7eb401ff9aa699f229b39b98a76b1f2fac3.

Each pass is a bounded synthetic marked-output/lifecycle screen, not a general player ranking.

| Case | Result | Details |
| --- | --- | --- |
| video.default.h264-dts | failed | [record](video.default.h264-dts/result.json) |
| demuxe.auto.h264-dts | blocked | [record](demuxe.auto.h264-dts/result.json) |
| demuxe.software.h264-dts | blocked | [record](demuxe.software.h264-dts/result.json) |
| movi.default.h264-dts | failed | [record](movi.default.h264-dts/result.json) |
| libmedia.default.h264-dts | blocked | [record](libmedia.default.h264-dts/result.json) |
