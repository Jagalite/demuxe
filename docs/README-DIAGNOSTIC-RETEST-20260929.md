# Failed-cell diagnostic retest, 2026-09-29

These are separate local investigations of the frozen README comparison. They
do not replace its rows or establish release, Dolby Vision color, Atmos object,
lossless, or physical HDR fidelity.

## Reproduced controls

The archived harness and original `assets-backlog-20260928-03` snapshot reproduced
the original failures for Video.js HEVC + DTS-HD reference audio, Video.js HEVC
HLS opening, Video.js HEVC Main10 + FLAC + ASS subtitle drawing, and forced
Demuxe JSPI DV5 opening. The unique run is
[`diagnostic-rerun-20260929-01`](../results/head-to-head/diagnostic-rerun-20260929-01/summary.json).
MediaBunny DV5 again stopped at position 10 with unchanged frame count and
canvas after its seek in
[`diagnostic-mediabunny-dv5-20260929-01`](../results/head-to-head/diagnostic-mediabunny-dv5-20260929-01/summary.json).
The original Dolby video has VPS/SPS/PPS in its first key packet, but not in its
10-second key packet; its `hvcC` contains zero parameter-set arrays. A fresh
decoder starting at 10 seconds lacks initialization. The archived checks remain
failures; the evidence does not assign every failure solely to a player.

## In-band HEVC configuration experiment

`native/remux/remux.c` now probes a bounded first key packet when a 23-byte HEVC
`hvcC` has no arrays, retains that packet, and constructs an initialization
record from VPS/SPS/PPS. The isolated JSPI and Asyncify builds passed static Wasm
audits. Their asset snapshot is `assets-hevc-inband-20260929-01`, whose manifest
records source and binary hashes. The [browser result](../results/head-to-head/hevc-inband-dv-correctness-20260929-01/summary.json)
cleared the previous `Missing HEVC parameter sets` error. Both DV8.1 base
JSPI/Asyncify cells completed the bounded screen. DV5 reached MSE negotiation,
where Chrome rejected the selected packaging. The compound DV8.1 fixture hit a
separate duplicate-DTS rejection.

A [supported HEVC Main10 + AAC MKV regression](../results/head-to-head/hevc-inband-hevc10-regression-20260929-01/summary.json)
completed the bounded JSPI and Asyncify screens with no failed cells using the
same engine snapshot. The runner returned a nonzero exit because both cases
retain their documented `blocked` qualification limit.

## Compound DV8.1 fixture defect

The archived DV8.1 + Atmos + ASS MKV repeated video DTS tick 83 ms once; the
specialist DV8.1 MKV did not. The compound builder had copied the already
remuxed specialist MKV. Copying video directly from the original, hash-verified
Dolby MP4 produced strictly increasing video DTS and retained the DOVI record,
RPU data, Atmos audio, ASS subtitles, and complete host decode. The builder now
uses that source and checks video DTS. A separate snapshot
`assets-hevc-inband-dv81-fixed-20260929-01` contains the repaired fixture and
its provenance. The [browser rerun](../results/head-to-head/hevc-inband-dv81-compound-fixed-correctness-20260929-01/summary.json)
opened and passed the 10-second seek but failed the later seek to 1 second with
`Missing selected packet PTS`; the compound JSPI/Asyncify cells remain failed.
An isolated host FFmpeg test of the repaired fixture sought to 10 seconds and
then back to 1 second with the same demuxer. The first twelve video packets
after each seek had PTS. This does not reproduce the browser runtime failure,
so its timestamp ownership is still unresolved.

## HEVC prefetch review fix

The HEVC configuration probe and the following timeline probe share a
256-packet prefetch array. The configuration probe now checks its capacity,
and the timeline probe scans already retained packets before reading more.
This also includes the retained first video PTS when choosing the origin.
Both isolated engine builds passed static Wasm audits. The separate
`assets-hevc-prefetch-reviewfix-20260929-01` snapshot records their hashes and
the exact source. In the [browser retest](../results/head-to-head/hevc-prefetch-reviewfix-specialist-20260929-01/summary.json),
the base DV8.1 JSPI and Asyncify cases completed their bounded screens; the
compound DV8.1 cases still failed at the second seek with `Missing selected
packet PTS`. A [supported HEVC Main10 + AAC retest](../results/head-to-head/hevc-prefetch-reviewfix-correctness-20260929-01/summary.json)
completed bounded JSPI and Asyncify screens. These tests do not establish a
cause for the compound seek failure or Dolby Vision fidelity.

## CPU

The previous HEVC Main10 + AC-3 JSPI/Asyncify campaigns each rejected one
presentation-cadence window and had unexplained low CPU windows. The TrueHD Auto
campaign rejected one frame-drop window. CPU percentages remain withheld until
complete, matched campaigns pass the startup, progress, cadence, and cleanup
gates. New campaigns must be recorded separately from these archived attempts.

The [third complete HEVC Main10 + AC-3 campaign](../results/jspi-asyncify/player-cpu-hevc10-ac3-03-20260929/summary.json)
passed all nine startup, frame-progress, cadence, and cleanup windows in one
controlled Chrome launch. Whole-Chrome CPU percentages by lane were Auto
19.26/11.27/11.93, JSPI 18.16/15.07/18.74, and Asyncify
14.82/15.96/19.53. All windows advanced 600–601 frames with zero dropped
frames. The variation persists despite accepted windows; no cross-runtime CPU
ranking is published from this campaign, and the existing README CPU-withheld
cells remain withheld.

The [TrueHD screened CPU retry](../results/head-to-head/backlog-61-hevc-truehd-screened-cpu-retry-20260929/summary.json)
completed all twelve measurement windows in one controlled Chrome launch.
Auto presented 600 frames with zero drops in each round. Whole-Chrome CPU
percentages were Auto 14.31/9.91/9.70, JSPI 21.67/22.48/12.46, Asyncify
25.66/25.71/25.43, and Software 39.77/31.81/31.17. The runner reports the
expected bounded-screen `blocked` status, while all CPU gates completed. The
cross-round variation is still too large to rank the lanes; the README CPU
cells remain withheld.
