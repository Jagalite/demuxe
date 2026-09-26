# Head-to-head correctness

Browser: chromium/153.0.8010.53/chrome/headed/5cf9f2f24ceb3e4a10fbce9dc2f1c4aa56fddd16640818dba1676d00f6d827f8. Player source: d7a3f7eb401ff9aa699f229b39b98a76b1f2fac3.

Each pass is a bounded synthetic marked-output/lifecycle screen, not a general player ranking.

| Case | Result | Details |
| --- | --- | --- |
| video.default.audio-opus | passed | [record](video.default.audio-opus/result.json) |
| demuxe.auto.audio-opus | passed | [record](demuxe.auto.audio-opus/result.json) |
| demuxe.software.audio-opus | passed | [record](demuxe.software.audio-opus/result.json) |
| movi.default.audio-opus | passed | [record](movi.default.audio-opus/result.json) |
| libmedia.default.audio-opus | failed | [record](libmedia.default.audio-opus/result.json) |
