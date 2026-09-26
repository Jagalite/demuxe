<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# HEVC Main 10-bit SDR + AC-3 / MKV: Auto URL retest

Retested only `demuxe.auto.hevc10-ac3` on `main` at `bafdb3f3e5289e56a7219c2f40cdd70c3a83b261`. The source was the same local URL fixture, `hevc10-ac3/index.mkv` (SHA-256 `2a84b2eed59a97e67ba49388d048b85966959081013555c6146063158c4b6c56`). The browser was headed Chrome 153.0.8010.53 on macOS.

The asset snapshot `build/head-to-head/assets-hevc10-ac3-bafdb3f3-20260926-01` preserves the prior fixtures and comparison players while refreshing Demuxe's served `web/` runtime from this commit. Its manifest SHA-256 is `42051172bee6e7dbec1b822fbcf11721d221ffa8a7d5551b861267112da62329`; served `unified-player.js` is `11d3e5a1b49f905cbd2ea004d86e430fc05d260afdecea543280273f7b8e4577`, and remux WASM is `cc7a72dd3f114d7d7bb769e652a72aadbccb06fc8e6fea951ab477343d31ff67`.

## Correctness

The [single-case correctness archive](../results/head-to-head/hevc10-ac3-auto-bafdb3f3-correctness-20260926-01/REPORT.md) passed marked video and stereo audio, pause/resume, 1.25× rate, seeks, near EOF, and cleanup. Archive verification returned `integrityPassed: true` (1/1). The recorded route was `native-video-mpv-audio` at startup, after seeks to 6, 1, and 10 seconds, and near EOF. This checks stereo output, not discrete surround.

## CPU

The [raw CPU result](../experiments/mediabunny-investigation/notes/hevc10-ac3-auto-bafdb3f3-cpu-20260926/result.json) used one fresh headed Chrome launch, three fresh contexts, 20-second idle checks, five-second warmups, and three 20-second whole-Chrome CPU windows. Percentages are relative to one core, without idle subtraction.

| Round | CPU | Net frames / 20 s | Dropped frames | Route | Gate |
| --- | ---: | ---: | ---: | --- | --- |
| 1 | 31.21% | 605 | 0 | `native-video-mpv-audio` | Accepted |
| 2 | 30.78% | 605 | 0 | `native-video-mpv-audio` | Accepted |
| 3 | 30.75% | 605 | 0 | `native-video-mpv-audio` | Accepted |

Median: **30.78%**, shown as **30.8%** in the README. Idle CPU was 2.06%, 1.56%, and 1.56%. The previous 32.4% median came from another launch and runtime revision; the difference is directional and does not isolate diagnostics work or establish a causal whole-player saving. That earlier retest also observed intermittent dropped frames. This run observed none, but three short windows do not prove the issue is gone.
