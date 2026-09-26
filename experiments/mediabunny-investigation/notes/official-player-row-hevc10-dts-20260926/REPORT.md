<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# HEVC Main 10-bit SDR + DTS core / MKV row

The 36-second fixture is `hevc10-dts/index.mkv`, SHA-256 `3a4236a33c5a6a535cdb81956f6249d44927e03ce83bbbbf3c500758817cc542`. Host `ffprobe` identified stereo 48 kHz DTS. The maintained players used frozen `assets-row-refresh-20260926-01` local URL input; MediaBunny received the same bytes as a local `File`. Browser: Chrome 153.0.8010.53 on macOS. The published example script SHA-256 was `5a8e7a70ce76e71c26f455e1227325deb8c8a4eddbf49663616a302a3d2c4533`.

## Correctness and route

The [maintained five-arm screen](../../../../results/head-to-head/row-hevc10-dts-correctness-20260926-01/REPORT.md) passed Demuxe Auto, Demuxe Software and AVPlayer through marked video and stereo audio, pause/resume, 1.25× playback, three seeks, EOF and cleanup. Plain video failed initial playback; Movi failed playback-rate progression. The archive passed integrity verification. Auto selected `hybrid` for this local URL. The [published MediaBunny player screen](result.json) passed moving marked video, stereo audio, pause/resume, seeks and near-EOF settlement. It remains **Screened** for rate control and independent cleanup limits.

## CPU qualification

No player CPU window was collected. Two fresh headed Chrome launches through the [row runner](../../benchmark/official-player-row-cpu.mjs) failed the mandatory macOS startup trace gate before opening any player. The first launch observed for 150.51 seconds, browser PID 35796, yielded 54,747 trace events but no completed `MaybeMeasureTpmOperations` task. The second observed for 150.56 seconds, browser PID 38702, yielded 54,589 trace events and likewise no completed task. Both produced `Startup readiness unconfirmed: completed hardware-key task missing; CPU block rejected`. Their empty partial records are [first launch](../official-player-row-hevc10-dts-cpu-startup-rejected-20260926/result.json) and [retry](../official-player-row-hevc10-dts-cpu-startup-rejected-retry-20260926/result.json). CPU remains unmeasured for every player in this row; no prior-campaign value was substituted.
