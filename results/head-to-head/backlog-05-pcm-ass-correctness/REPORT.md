# Head-to-head correctness

Browser: chromium/153.0.8010.53/chrome/headed/5cf9f2f24ceb3e4a10fbce9dc2f1c4aa56fddd16640818dba1676d00f6d827f8. Player source: 7f4407d2ae529891ba3816215b2f930c6ef267d8.

Each pass is a bounded synthetic marked-output/lifecycle screen, not a general player ranking.

| Case | Result | Details |
| --- | --- | --- |
| video.default.pcm-ass | passed | [record](video.default.pcm-ass/result.json) |
| videojs.default.pcm-ass | failed | [record](videojs.default.pcm-ass/result.json) |
| demuxe.jspi.pcm-ass | failed | [record](demuxe.jspi.pcm-ass/result.json) |
| demuxe.asyncify.pcm-ass | failed | [record](demuxe.asyncify.pcm-ass/result.json) |
| demuxe.software.pcm-ass | passed | [record](demuxe.software.pcm-ass/result.json) |
