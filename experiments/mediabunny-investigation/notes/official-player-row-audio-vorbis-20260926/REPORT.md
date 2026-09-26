<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Vorbis audio-only / Ogg row

The 36-second fixture is `audio-vorbis/index.ogg`, SHA-256 `04f214282e90dea796173292054af66c0074044bf08dcb65a9fe4084ef815062`, from frozen `assets-row-refresh-20260926-01`. Maintained players used its local URL; the published MediaBunny example received the same bytes as a local `File`. Browser: headed Chrome 153.0.8010.53 on macOS.

## Correctness and route

The [maintained five-arm screen](../../../../results/head-to-head/row-audio-vorbis-correctness-20260926-01/REPORT.md) passed browser audio, Demuxe Auto and Demuxe Software through marked stereo output, pause/resume, 1.25× playback, three seeks, EOF and cleanup. Movi had missing or wrong audio after `seek-10`; AVPlayer missed the `seek-10` position deadline. The archive passed integrity verification. Auto selected `native-direct`.

The [published MediaBunny player screen](result.json) passed marked stereo output, timeline progress, pause/resume, seeks and near-EOF settlement. It remains **Screened** because the example has no 1.25× control or independently observable cleanup.

## One-browser-per-row CPU

The [raw CPU run](../official-player-row-audio-vorbis-cpu-20260926/result.json) measured four correctness-passing or screened cells in one headed Chrome launch across three rotating rounds, with fresh contexts per arm, 20-second idle checks, five-second warmups and 20-second CPU windows. All 12 playback-progress windows passed. CPU is whole-Chrome process-tree percent of one core, without idle subtraction.

| Player arm | Round 1 | Round 2 | Round 3 | Median used in README |
| --- | ---: | ---: | ---: | ---: |
| Browser audio | 2.23% | 0.88% | 2.42% | — |
| Demuxe Auto (`native-direct`, URL) | 3.21% | 3.32% | 3.37% | **3.32%** |
| Demuxe Software | 12.25% | 7.02% | 3.28% | — |
| MediaBunny official example | 45.59% | 39.66% | 32.36% | — |

Idle CPU was 2.05%, 1.47% and 1.08%. Browser audio varied by nearly threefold, and Software and MediaBunny trended downward across rounds. Their progress gates passed, but those CPU figures are withheld from the compact README because the host or player drift makes a single median misleading. The raw results retain every window. The different players use different audio paths and input APIs, so the accepted Auto figure does not isolate Vorbis decoding cost.
