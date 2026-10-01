# Head-to-head correctness

Browser: chromium/153.0.8010.53/chrome/headed/5cf9f2f24ceb3e4a10fbce9dc2f1c4aa56fddd16640818dba1676d00f6d827f8. Player source: 7f4407d2ae529891ba3816215b2f930c6ef267d8.

Each pass is a bounded synthetic marked-output/lifecycle screen, not a general player ranking.

| Case | Result | Details |
| --- | --- | --- |
| video.default.hdr10-truehd-pgs | failed | [record](video.default.hdr10-truehd-pgs/result.json) |
| videojs.default.hdr10-truehd-pgs | failed | [record](videojs.default.hdr10-truehd-pgs/result.json) |
| demuxe.auto.hdr10-truehd-pgs | blocked | [record](demuxe.auto.hdr10-truehd-pgs/result.json) |
| demuxe.jspi.hdr10-truehd-pgs | blocked | [record](demuxe.jspi.hdr10-truehd-pgs/result.json) |
| demuxe.asyncify.hdr10-truehd-pgs | blocked | [record](demuxe.asyncify.hdr10-truehd-pgs/result.json) |
| demuxe.software.hdr10-truehd-pgs | blocked | [record](demuxe.software.hdr10-truehd-pgs/result.json) |
| movi.default.hdr10-truehd-pgs | failed | [record](movi.default.hdr10-truehd-pgs/result.json) |
| libmedia.default.hdr10-truehd-pgs | failed | [record](libmedia.default.hdr10-truehd-pgs/result.json) |
