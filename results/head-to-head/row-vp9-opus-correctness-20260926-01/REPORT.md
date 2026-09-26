# Head-to-head correctness

Browser: chromium/153.0.8010.53/chrome/headed/5cf9f2f24ceb3e4a10fbce9dc2f1c4aa56fddd16640818dba1676d00f6d827f8. Player source: d7a3f7eb401ff9aa699f229b39b98a76b1f2fac3.

Each pass is a bounded synthetic marked-output/lifecycle screen, not a general player ranking.

| Case | Result | Details |
| --- | --- | --- |
| video.default.vp9-opus | passed | [record](video.default.vp9-opus/result.json) |
| demuxe.auto.vp9-opus | passed | [record](demuxe.auto.vp9-opus/result.json) |
| demuxe.software.vp9-opus | passed | [record](demuxe.software.vp9-opus/result.json) |
| movi.default.vp9-opus | failed | [record](movi.default.vp9-opus/result.json) |
| libmedia.default.vp9-opus | passed | [record](libmedia.default.vp9-opus/result.json) |
