<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Auto Native URL retest: HEVC/AC-3 and HEVC/AC-3/PGS

Date: 2026-09-26. Source: `main` at `448a0dbc9628aeccb3cdb027b5bb2df4a4fc2971`, which includes `40d3758d`. Browser: headed Chrome 153.0.8010.53 on macOS. This is a retest of **Demuxe Auto** on local URL input; other README player cells retain their historical evidence.

## Runtime and fixture identity

`npm run build:remux` and `npm run build` rebuilt the current checkout. The served benchmark snapshot is `build/head-to-head/assets-native-url-main-20260926-01`, cloned from frozen `assets-row-refresh-20260926-01`. Only its Demuxe `web/` runtime was refreshed. Both media fixture SHA-256 values match the parent exactly:

| Fixture | SHA-256 |
| --- | --- |
| `hevc10-ac3/index.mkv` | `2a84b2eed59a97e67ba49388d048b85966959081013555c6146063158c4b6c56` |
| `hevc-pgs/index.mkv` | `42f67d0251f502de299ad4e67d855704e2a06f438b79eabb565750185e2c5951` |

The rebuilt snapshot manifest SHA-256 begins `aa0495594067b9f5`. Served remux WASM is `cc7a72dd3f114d7d7bb769e652a72aadbccb06fc8e6fea951ab477343d31ff67`; the old snapshot used `708d374e47d7ba97…`. The manifest records all refreshed runtime file hashes and the parent manifest. The first [attempt](../results/head-to-head/auto-native-url-retest-20260926-01/summary.json) accidentally served the old frozen `demuxe/` directory and still chose Hybrid. It is retained as evidence of the asset mismatch, not used for the updated cells.

## Correctness and route persistence

The focused [Native URL service check](../results/native-url-services/main-retest-20260926-01/) passed both fixtures on the rebuilt checkout. It checked marked output after forward/backward seeks, service ownership, authorization refresh, rate change and cleanup. The [full Auto row screen](../results/head-to-head/auto-native-url-rebuilt-20260926-01/summary.json) then passed both fixtures from the refreshed snapshot; `tests/head-to-head/verify.mjs` returned `integrityPassed: true` for 2/2 cases.

| Fixture | Startup route | Seek 6 s | Seek 1 s | Seek 10 s | Near EOF | Output |
| --- | --- | --- | --- | --- | --- | --- |
| `hevc10-ac3` | `native-video-mpv-audio` | same | same | same | same | Marked video and stereo AC-3 audio passed |
| `hevc-pgs` | `native-video-mpv-audio-subtitles` | same | same | same | same | Marked video/audio and required PGS drawing passed |

The PGS check is bounded marker visibility, not full subtitle fidelity. These sources are stereo; they do not qualify discrete surround output.

## CPU

Each fixture used a fresh headed Chrome launch, Auto only, three 20-second process-tree CPU windows after five-second warmups and inter-round idle checks. Percentages are one-core equivalents without idle subtraction. Every reported window retained its Native route before and after measurement. These runs are **not matched against the historical Hybrid campaign**, so the old and new percentages do not establish a causal CPU reduction.

| Fixture/run | CPU windows | Net presented frames / 20 s | Dropped frames | Published median |
| --- | --- | --- | --- | --- |
| `hevc10-ac3` [initial](../experiments/mediabunny-investigation/notes/auto-native-url-hevc10-ac3-cpu-20260926/result.json) | 31.98%, 32.59%, 31.02% | 605, 605, 477 | 0, 0, 128 | Withheld; third window rejected |
| `hevc10-ac3` [repeat](../experiments/mediabunny-investigation/notes/auto-native-url-hevc10-ac3-cpu-repeat-20260926/result.json) | 30.75%, 32.36%, 32.74% | 536, 605, 605 | 69, 0, 0 | **32.36%** |
| `hevc-pgs` [run](../experiments/mediabunny-investigation/notes/auto-native-url-hevc-pgs-cpu-20260926/result.json) | 32.99%, 31.13%, 33.30% | 605, 591, 603 | 0, 14, 2 | **32.99%** |

The HEVC/AC-3 first run's third window failed the existing 25 fps CPU gate; its 128 dropped frames remain in raw evidence. The accepted repeat also had one 69-drop window. This intermittent frame loss merits investigation before interpreting its CPU median as a playback-performance win. PGS had 14 drops in one accepted window. CPU is whole Chrome, not isolated demux, decode or subtitle cost.

## README interpretation

The updated Auto cells show the tested Native split routes and the accepted medians. The old Hybrid results remain in the historical row reports. The previous plain browser video, Demuxe Software, Movi, AVPlayer and MediaBunny cells were not rerun, and their CPU values must not be ranked against this new campaign as though measured together.
