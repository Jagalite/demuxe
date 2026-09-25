# Head-to-head correctness

Browser: chromium/153.0.8010.53/chrome/headed/7496bd730e5a5835dfd0557342a7f7c18191696c64e9617716a307b048905843. Player source: 20b5cd0319a64334c29d36ea7a6c8cdac7c6f4d8.

Each pass is a bounded synthetic marked-output/lifecycle screen, not a general player ranking.

| Case | Result | Details |
| --- | --- | --- |
| video.default.aac-mkv | passed | [record](video.default.aac-mkv/result.json) |
| demuxe.auto.aac-mkv | passed | [record](demuxe.auto.aac-mkv/result.json) |
| demuxe.native.aac-mkv | passed | [record](demuxe.native.aac-mkv/result.json) |
| demuxe.software.aac-mkv | passed | [record](demuxe.software.aac-mkv/result.json) |
| movi.default.aac-mkv | failed | [record](movi.default.aac-mkv/result.json) |
| libmedia.default.aac-mkv | passed | [record](libmedia.default.aac-mkv/result.json) |
