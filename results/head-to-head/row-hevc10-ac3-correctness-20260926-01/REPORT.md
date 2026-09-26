# Head-to-head correctness

Browser: chromium/153.0.8010.53/chrome/headed/5cf9f2f24ceb3e4a10fbce9dc2f1c4aa56fddd16640818dba1676d00f6d827f8. Player source: d7a3f7eb401ff9aa699f229b39b98a76b1f2fac3.

Each pass is a bounded synthetic marked-output/lifecycle screen, not a general player ranking.

| Case | Result | Details |
| --- | --- | --- |
| video.default.hevc10-ac3 | failed | [record](video.default.hevc10-ac3/result.json) |
| demuxe.auto.hevc10-ac3 | passed | [record](demuxe.auto.hevc10-ac3/result.json) |
| demuxe.software.hevc10-ac3 | passed | [record](demuxe.software.hevc10-ac3/result.json) |
| movi.default.hevc10-ac3 | failed | [record](movi.default.hevc10-ac3/result.json) |
| libmedia.default.hevc10-ac3 | passed | [record](libmedia.default.hevc10-ac3/result.json) |
