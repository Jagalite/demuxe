# Head-to-head correctness

Browser: chromium/153.0.8010.53/chrome/headed/5cf9f2f24ceb3e4a10fbce9dc2f1c4aa56fddd16640818dba1676d00f6d827f8. Player source: d7a3f7eb401ff9aa699f229b39b98a76b1f2fac3.

Each pass is a bounded synthetic marked-output/lifecycle screen, not a general player ranking.

| Case | Result | Details |
| --- | --- | --- |
| video.default.av1-aac | passed | [record](video.default.av1-aac/result.json) |
| demuxe.auto.av1-aac | passed | [record](demuxe.auto.av1-aac/result.json) |
| demuxe.software.av1-aac | passed | [record](demuxe.software.av1-aac/result.json) |
| movi.default.av1-aac | failed | [record](movi.default.av1-aac/result.json) |
| libmedia.default.av1-aac | passed | [record](libmedia.default.av1-aac/result.json) |
