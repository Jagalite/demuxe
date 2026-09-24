<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Corrected Software YUV CPU rerun, 2026-09-23

**Result:** Corrected YUV used less Chrome process CPU than RGB in every matched pair on all three requested routes. The median paired saving was **8.8, 6.1 and 8.4 core points** for TS, PS and AVI respectively. This fresh run supports a bounded YUV admission task, but it **does not reproduce the magnitude** of the earlier AC-powered TS saving. Production defaults remain RGB.

## Contract

- Source: latest `origin/main` at `1519377384fffce83896a4da5c911a36013f9a3b` plus the uncommitted opt-in chroma-siting correction in `native/yuv-backend.c` and `web/yuv-presenter.js`. Software RGB Wasm SHA-256 `f76468c9a3ef5aa3f9d5a5adedc239864e0bfa9646a1b0e11f3821a80e699805`; rebuilt corrected YUV Wasm SHA-256 `28d198583c35b4346afdc2ad35d0142858e58087d4ffd72bf70ce982998eaf9c`. No production default changed.
- Fixtures are the same bytes as the earlier campaign: MPEG-2/AC-3 TS SHA-256 `2a8a669612280c1e1089abcb1774791e7d81c7413c8b8147817036d9b80c2095`, MPEG-2/MP2 PS `522eac536b4ef0e36ffcf52b6989217f2b6010280fed6e9ee6754aaf2198b970`, MPEG-4/MP3 AVI `b2cec9836caffc25ea8f15ebcfecd804cc5df05b3986d0cc76d042db61a8e21d`.
- Fresh Chrome `153.0.8010.53` process and temporary profile per arm, Apple M1 / 8 GiB macOS host, 1920×1080 player canvas displayed at 960×540, 4 s warmup, approximately 12 s steady CPU window. Plain video, selected audible audio, no subtitles. RGB/YUV arm order alternated by round. Three rounds per route; two additional TS rounds addressed a conspicuous first-campaign spread.
- The machine ran on **battery throughout**, from 96% to 92%. The earlier campaign recorded AC power. Browser windows were headful and background throttling flags were disabled, but this runner did not record an actual foreground-process match in each arm. A separate focused Chrome launch passed the foreground check; that does not retroactively prove each CPU arm was foreground. External host contention and power/thermal state were not controlled across the old and new campaigns.
- CPU is the sum of CDP-listed Chrome process CPU-time changes divided by elapsed wall time: **100% means one core**. It excludes WindowServer, the fixture server and external OS processes. Profile timers are overlapping wall times and are not summed into CPU.

## Matched results

| Route | Accepted pairs | RGB CPU median | Corrected YUV CPU median | Median paired delta | Paired deltas (YUV minus RGB) | Cadence / drops |
| --- | ---: | ---: | ---: | ---: | --- | --- |
| MPEG-2 + AC-3 / TS | 5/5 | 75.0% | 66.2% | **−8.8 core points** | −32.4, −8.8, −7.6, −18.9, −8.4 | 29.85–30.25 fps; 0 drops |
| MPEG-2 + MP2 / PS | 3/3 | 75.3% | 69.2% | **−6.1 core points** | −9.2, −4.5, −6.1 | 29.85–30.14 fps; 0 drops |
| MPEG-4 Part 2 + MP3 / AVI | 3/3 | 76.3% | 68.6% | **−8.4 core points** | −6.4, −11.5, −8.4 | 29.60–30.21 fps; 0 drops |

All **22/22 arms** passed the runner's playback gates: expected clock advance and frame rate, zero video drops, zero audio underruns, pause/resume, forward/backward seek, EOF, worker cleanup, and no page/player errors. Corrected YUV had **zero RGB fallback frames** in all 11 YUV arms. The two additional TS rounds reproduced the same paused image and remained CPU-positive; they did not remove the YUV CPU spread (45.5%–67.3% across five arms).

The 960×541 paused-seek screenshots were identical within each variant across all rounds of a route. Matched RGB/YUV screenshots after correction had p99 channel error **12/255** and mean error **1.288/255** (TS/PS) or **1.303/255** (AVI), with 0.61%–0.64% of channels differing by more than 16. The pre-correction campaign reported p99 26–27 and roughly 1.8% above 16. This screenshot comparison is a repeatability/content gate; the independent raw-plane fidelity reference and exact chroma-phase diagnosis are in [the fidelity report](../software-yuv-fidelity/REPORT-2026-09-23.md).

## Attribution and limits

RGB's median `_web_render` frame-call wall time was about **7.8–8.2 ms/frame**, followed by about **2.0–2.1 ms/frame** of Wasm copy, alpha fill and `putImageData`. Corrected YUV's `_web_render` call was about **1.3–1.5 ms/frame**, including its WebGL draw callback; YUV plane staging took about **0.24–0.26 ms/frame**. These are overlapping or nested wall measurements, not additive CPU. The current process-CPU result confirms that removing the RGB conversion/copy/presentation work still saves CPU at comparable playback cadence.

The absolute YUV CPU and YUV draw time were higher and more variable than in the earlier AC campaign. The TS YUV arms ranged from 45.5% to 67.3%; even the lower-saving pairs retained zero drops and correct presentation. Because power state, host conditions and asset revisions differ between campaigns, **the change cannot be attributed specifically to the chroma correction**. In particular, the old 34.6-core-point TS median saving should not be reused as the post-fix estimate. The new matched median is 8.8 core points on this battery-powered host.

The corrected path remains a measured CPU win for the three requested routes, with a smaller and less stable margin than the old headline. A finite production admission task remains reasonable for the already fidelity-qualified SDR 8-bit YUV420P subset. This run did not switch defaults, redesign the presenter, measure subtitle CPU, or qualify out-of-scope formats.

## Evidence and reproduction

- [Initial three-round raw result](cpu-routes-2026-09-23T18-25-23.860Z/result.json) and [matched screenshot statistics](cpu-routes-2026-09-23T18-25-23.860Z/frame-diff.json).
- [Two additional TS rounds](cpu-routes-2026-09-23T18-36-33.735Z/result.json) and [their screenshot statistics](cpu-routes-2026-09-23T18-36-33.735Z/frame-diff.json).
- Runner: `CASES=mpeg2ts,mpeg2ps,mpeg4avi ROUNDS=3 WARMUP=4 MEASURE=12 node experiments/software-yuv-integration/cpu-routes.mjs`; extra TS: `CASES=mpeg2ts ROUND_START=3 ROUNDS=2 WARMUP=4 MEASURE=12 node experiments/software-yuv-integration/cpu-routes.mjs`. Screenshot analysis: `node experiments/software-yuv-integration/frame-diff.mjs <result-directory>`.
