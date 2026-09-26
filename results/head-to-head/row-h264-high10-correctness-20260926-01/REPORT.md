# Head-to-head correctness

Browser: chromium/153.0.8010.53/chrome/headed/5cf9f2f24ceb3e4a10fbce9dc2f1c4aa56fddd16640818dba1676d00f6d827f8. Player source: 231c4374012e860816a43eaa07e5bf53db81e9c6.

Each pass is a bounded synthetic marked-output/lifecycle screen, not a general player ranking.

| Case | Result | Details |
| --- | --- | --- |
| video.default.h264-high10 | passed | [record](video.default.h264-high10/result.json) |
| demuxe.auto.h264-high10 | passed | [record](demuxe.auto.h264-high10/result.json) |
| demuxe.software.h264-high10 | passed | [record](demuxe.software.h264-high10/result.json) |
| movi.default.h264-high10 | failed | [record](movi.default.h264-high10/result.json) |
| libmedia.default.h264-high10 | passed | [record](libmedia.default.h264-high10/result.json) |
