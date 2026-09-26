# Head-to-head correctness

Browser: chromium/153.0.8010.53/chrome/headed/5cf9f2f24ceb3e4a10fbce9dc2f1c4aa56fddd16640818dba1676d00f6d827f8. Player source: d7a3f7eb401ff9aa699f229b39b98a76b1f2fac3.

Each pass is a bounded synthetic marked-output/lifecycle screen, not a general player ranking.

| Case | Result | Details |
| --- | --- | --- |
| video.default.hevc-pgs | failed | [record](video.default.hevc-pgs/result.json) |
| demuxe.auto.hevc-pgs | passed | [record](demuxe.auto.hevc-pgs/result.json) |
| demuxe.software.hevc-pgs | passed | [record](demuxe.software.hevc-pgs/result.json) |
| movi.default.hevc-pgs | failed | [record](movi.default.hevc-pgs/result.json) |
| libmedia.default.hevc-pgs | failed | [record](libmedia.default.hevc-pgs/result.json) |
