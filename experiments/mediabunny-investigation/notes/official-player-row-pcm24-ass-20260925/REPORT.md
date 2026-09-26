<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# H.264 + PCM24 / MKV + external ASS

The official MediaBunny player example was screened in Chrome 153.0.8010.53 with the same `pcm.mkv` bytes as the maintained row screen (SHA-256 `eb2eef792c1c70ebb683c707dec50253b1b61b09bc5ed6c7b8d4bfa0320d6b98`). The row additionally requires `captions.ass`; the published example accepts one media file and exposed no subtitle file input or subtitle control. Its deployed player script had the same SHA-256 as the first-four-row campaign: `5a8e7a70ce76e71c26f455e1227325deb8c8a4eddbf49663616a302a3d2c4533`.

The [raw screen](result.json) confirms moving marked video and audible stereo markers near 440/880 Hz. It stopped after detecting the missing external subtitle input. Pause, seek, EOF, cleanup, and CPU were not measured for MediaBunny on this row. The README failure means the **complete media plus external ASS requirement** is unmet; it does not imply PCM24 or MKV playback failure.

The [maintained row report](../../../../results/head-to-head/row-h264-pcm24-ass-20260925-01/REPORT.md) already covers the other five columns: Demuxe Auto and Software passed correctness; plain video and Movi failed subtitle drawing; AVPlayer failed initial playback. Six accepted Demuxe CPU windows were withheld from the README because their ranges and paired differences were unstable, and the native reference lacked a matched host ASS overlay. Those historical statuses remain unchanged. No new CPU comparison was made in this row update.
