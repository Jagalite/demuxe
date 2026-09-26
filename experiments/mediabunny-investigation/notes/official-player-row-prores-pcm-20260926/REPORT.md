<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# ProRes + PCM / MOV row

The 36-second fixture is `prores-pcm/index.mov`, SHA-256 `30d576f6f82351b955eb9d8cf357928b31668e698313af519eef72f32874689a`. The maintained players used frozen `assets-row-refresh-20260926-01` local URL input; MediaBunny received the same bytes as a local `File`. Browser: Chrome 153.0.8010.53 on macOS. The published example script SHA-256 was `5a8e7a70ce76e71c26f455e1227325deb8c8a4eddbf49663616a302a3d2c4533`.

## Correctness and route

The [maintained five-arm screen](../../../../results/head-to-head/row-prores-pcm-correctness-20260926-01/REPORT.md) passed Demuxe Auto and Demuxe Software through marked video and stereo audio, pause/resume, 1.25× playback, three seeks, EOF and cleanup. Plain video displayed an incorrect initial timeline marker. Movi timed out before initial playback. AVPlayer rejected the source with `not has any supported stream to play`. The archive passed integrity verification, preserving all failed outcomes. Auto selected `software` for the local URL; its pre-existing README `*` qualification is retained.

The [published MediaBunny player screen](result.json) passed moving marked video, stereo audio, pause/resume, seeks and near-EOF settlement. It remains **Screened** because the published controls do not qualify 1.25× rate or independent cleanup. The screen also does not establish correct ProRes 10-bit depth, 4:2:2 chroma, color, or full-frame fidelity, and it does not identify which decoder implementation produced the output.

## One-browser-per-row CPU

The [row runner](../../benchmark/official-player-row-cpu.mjs) measured the two correctness-passing Demuxe cells and screened MediaBunny cell in one headed Chrome launch across three rotating rounds, fresh contexts per arm, 20-second idle checks, five-second warmups and 20-second CPU windows. CPU is percent of one core for the whole Chrome process tree, without idle subtraction. The [raw result](../official-player-row-prores-pcm-cpu-20260926/result.json) and [request log](../official-player-row-prores-pcm-cpu-20260926/requests.jsonl) retain process samples, gates and source reads.

| Player arm | Round 1 | Round 2 | Round 3 | Median | Use |
| --- | ---: | ---: | ---: | ---: | --- |
| Demuxe Auto (`software`, URL) | 35.97% | 36.98% | 36.93% | **36.93%** | Accepted |
| Demuxe Software | 36.43% | 37.83% | 35.27% | **36.43%** | Accepted |
| MediaBunny official example | 33.02% | 33.78% | 32.81% | **33.02%** | Screened; fidelity unqualified |

All nine windows had advancing timelines, stable process membership, focus and no reported errors. Idle CPU was 1.61%, 1.66% and 1.75%. The whole-browser measurements include distinct decode and presentation paths, and the MediaBunny output has a narrower fidelity qualification. This comparison does not establish a ProRes decoder performance advantage. The three failed maintained players received no CPU windows.
