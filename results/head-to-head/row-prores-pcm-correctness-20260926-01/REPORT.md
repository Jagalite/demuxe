# Head-to-head correctness

Browser: chromium/153.0.8010.53/chrome/headed/5cf9f2f24ceb3e4a10fbce9dc2f1c4aa56fddd16640818dba1676d00f6d827f8. Player source: d7a3f7eb401ff9aa699f229b39b98a76b1f2fac3.

Each pass is a bounded synthetic marked-output/lifecycle screen, not a general player ranking.

| Case | Result | Details |
| --- | --- | --- |
| video.default.prores-pcm | failed | [record](video.default.prores-pcm/result.json) |
| demuxe.auto.prores-pcm | passed | [record](demuxe.auto.prores-pcm/result.json) |
| demuxe.software.prores-pcm | passed | [record](demuxe.software.prores-pcm/result.json) |
| movi.default.prores-pcm | failed | [record](movi.default.prores-pcm/result.json) |
| libmedia.default.prores-pcm | failed | [record](libmedia.default.prores-pcm/result.json) |
