<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# H.264 + AAC + VobSub / MKV subtitle-isolation row

The 36-second fixture is `h264-aac-vobsub-isolation/index.mkv`, SHA-256 `d4c3532b875e96547552816d842ea18a576e6516154bc2ed9127417a554463f3`. The maintained players used frozen `assets-row-refresh-20260926-01` local URL input; MediaBunny received the same bytes as a local `File`. Browser: Chrome 153.0.8010.53 on macOS. The published example script SHA-256 was `5a8e7a70ce76e71c26f455e1227325deb8c8a4eddbf49663616a302a3d2c4533`.

## Correctness and route

The [maintained five-arm screen](../../../../results/head-to-head/row-h264-aac-vobsub-isolation-correctness-20260926-01/REPORT.md) passed Demuxe Auto and Demuxe Software through marked video, stereo audio, required VobSub drawing, pause/resume, 1.25× playback, three seeks, EOF and cleanup. Plain video, Movi and AVPlayer lacked the required marked subtitle drawing. The archive passed integrity verification, preserving all failed outcomes. Auto selected `hybrid` for the local URL. The previously untested player cells now have full-screen outcomes. The older Software `*` remains because the marked bitmap check is bounded and does not qualify broad VobSub fidelity.

The [published MediaBunny player screen](result.json) passed initial marked video and stereo audio but failed the required VobSub drawing check. Its [captured subtitle image](h264-aac-vobsub-isolation-subtitle.png) retains the failed marker evidence. MediaBunny is **Failed** for this row and receives no CPU value.

## One-browser-per-row CPU

The [row runner](../../benchmark/official-player-row-cpu.mjs) measured the two correctness-passing Demuxe cells in one headed Chrome launch across three rotating rounds, fresh contexts per arm, 20-second idle checks, five-second warmups and 20-second CPU windows. CPU is percent of one core for the whole Chrome process tree, without idle subtraction. The [raw result](../official-player-row-h264-aac-vobsub-isolation-cpu-20260926/result.json) and [request log](../official-player-row-h264-aac-vobsub-isolation-cpu-20260926/requests.jsonl) retain process samples, gates and source reads.

| Player arm | Round 1 | Round 2 | Round 3 | Median | Use |
| --- | ---: | ---: | ---: | ---: | --- |
| Demuxe Auto (`hybrid`, URL) | 36.27% | 36.12% | 38.66% | **36.27%** | Accepted |
| Demuxe Software | 34.91% | 36.72% | 35.94% | **35.94%** | Accepted; bounded subtitle fidelity |

All six windows had advancing timelines, stable process membership, focus and no reported errors. Idle CPU was 1.61%, 1.64% and 1.50%. The ranges overlap; these whole-browser results do not establish a precise CPU ranking or isolate VobSub rendering costs. Failed subtitle cells received no CPU windows.
