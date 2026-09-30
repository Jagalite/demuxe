<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Patched HEVC10 AC3: CPU execution conditions

Same patched production files, same HEVC10/AC3 URL fixture as the prior comparison. Exact JS bodies, hashes, fixture hash, Chrome identity, raw CPU samples and hardware counters are retained alongside this report. Chrome startup-task gate passed; measurement ran without Instruments recording. Each arm used a fresh context, source time 3 seconds, five-second warmup and a ten-second measurement. The middle arm ran a separate single-thread Node arithmetic loop for 20 seconds. A ten-second idle gap followed termination before preparing the final context.

| Condition | Whole Chrome CPU | Renderer CPU | Renderer effective GHz | Renderer M instructions/s | Dropped frames | New audio underruns | Result |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| idle-before | 7.05% | 3.41% | 2.94 | 152.97 | 0 | 0 | accepted |
| external-load | 5.91% | 2.79% | 2.98 | 152.08 | 0 | 0 | accepted |
| idle-after | 20.09% | 10.02% | 1.48 | 157.31 | 0 | 8 | rejected |

CPU is percent of one core. Renderer includes mpv/Wasm audio, PCM transport, synchronization and other page work: it is not pure audio-decoder CPU. The browser audio service used 0.35% and 0.24% in the accepted arms. Both accepted arms held native-video-mpv-audio, no mpv video tracks, stable process IDs, focus/visibility, 300 frames, zero drops and zero new audio underruns. Sampled A/V timing error stayed below 10 ms.

The renderer was already in faster execution conditions before deliberate load (2.94 effective GHz), so the experiment cannot attribute the entire high-speed state to that intervention. The external loop consumed about 19.85 CPU-seconds over 20 wall-seconds, separately from Chrome. Lower Chrome CPU does not mean lower total system work or energy.

After load removal, the renderer slowed to 1.48 effective GHz. That arm measured 20.09% Chrome / 10.02% renderer CPU but incurred eight new audio underruns and is rejected. It is evidence of an unresolved playback reliability issue, not an accepted reverse-control performance value. The all-accepted test assertion failed. No extra replacement windows were run.

## Core-placement limits

macOS QoS influences scheduling, but this experiment did not pin Chrome threads to P cores. Effective GHz is aggregate cycles divided by process CPU time; it does not distinguish frequency scaling from core migration. The observed accepted 2.79–3.41% renderer CPU is a measured fast-execution result, not a P-core-only guarantee.

A separate 2-second System Trace feasibility probe completed during Chrome's startup waiting period, before playback measurements. Its context-switch export explicitly labels CPU 0–3 as E Core and 4–7 as P Core. It did not cover these playback windows and does not establish their residency. Tracing also perturbs execution conditions. No residency percentages are claimed.

Apple reference: [Tuning your code's performance for Apple silicon](https://developer.apple.com/documentation/apple-silicon/tuning-your-code-s-performance-for-apple-silicon/).

Reproduce: `node tests/selective-audio-execution-conditions.mjs`; counters: `python3 tests/summarize-audio-path-counters.py <result.json>`.
