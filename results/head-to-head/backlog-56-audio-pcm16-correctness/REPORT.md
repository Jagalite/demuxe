# Head-to-head correctness

Browser: chromium/153.0.8010.53/chrome/headed/5cf9f2f24ceb3e4a10fbce9dc2f1c4aa56fddd16640818dba1676d00f6d827f8. Player source: 7f4407d2ae529891ba3816215b2f930c6ef267d8.

Each pass is a bounded synthetic marked-output/lifecycle screen, not a general player ranking.

| Case | Result | Details |
| --- | --- | --- |
| videojs.default.audio-pcm16 | passed | [record](videojs.default.audio-pcm16/result.json) |
| demuxe.jspi.audio-pcm16 | failed | [record](demuxe.jspi.audio-pcm16/result.json) |
| demuxe.asyncify.audio-pcm16 | failed | [record](demuxe.asyncify.audio-pcm16/result.json) |
| demuxe.software.audio-pcm16 | passed | [record](demuxe.software.audio-pcm16/result.json) |
| movi.default.audio-pcm16 | passed | [record](movi.default.audio-pcm16/result.json) |
