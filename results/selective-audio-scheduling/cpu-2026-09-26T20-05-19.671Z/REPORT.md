<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Combined selective-audio scheduling CPU check

2026-09-26, current main HEAD 54795399 plus the uncommitted scheduling patch. Same URL HEVC10/AC3 fixture as the README retest (320x180, 48 kHz stereo), SHA-256 2a84b2eed59a97e67ba49388d048b85966959081013555c6146063158c4b6c56. One fresh headed Chrome launch with confirmed startup-task completion and tracing stopped before measurement. Fresh context per arm, source time 3 seconds, five-second warmup, ten-second CPU windows, ABBA order. Only the two modified JavaScript files differ; exact served overrides and hashes are retained in result.json. CPU is whole-Chrome percentage of one core, without idle subtraction. Native counters cover a slightly wider interval and use their own elapsed time.

| Window | Code | CPU | Renderer M instructions/s | Renderer effective GHz | Worker ticks | Dropped frames | Result |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 1 | baseline | 31.04% | 176.98 | 1.23 | 730 | 0 | accepted |
| 2 | patched | 26.28% | 153.16 | 1.21 | 215 | 0 | accepted |
| 3 | patched | 24.33% | 152.03 | 1.22 | 215 | 65 | rejected |
| 4 | baseline | 30.14% | 174.98 | 1.24 | 750 | 0 | accepted |

Accepted baseline average: **30.59% CPU**. The one accepted patched window: **26.28%**, or **4.31 percentage points / 14.1% lower** in this block. Renderer instruction rate fell from 175.98 to 153.16 million/s (**13.0% lower**), while effective renderer clock was similar. This supports a real reduction in work, not merely faster execution conditions. It does not resolve the route's entire overhead.

All windows held native-video-mpv-audio, zero mpv video ownership, focus/visibility, stable process IDs, and zero audio underruns. The rejected patched window had 65 new dropped frames (already 31 at the start), despite no page errors and sampled audio/video timing errors below 4 ms. Its lower CPU is excluded from the valid comparison. The full four-window check therefore failed its all-accepted assertion: the patch is not fully performance-qualified. The cause of those dropped frames is unresolved. No replacement campaign was run and README measurements were not changed.

The first attempt, ../cpu-2026-09-26T20-00-41.374Z, is retained and explicitly invalidated: its baseline worker override missed the audioOnly URL query string. Both lanes used the patched polling cadence. The corrected run records both matched overrides and measured 730–750 baseline ticks versus 215 patched ticks per window.

Artifacts: result.json (raw samples and acceptance), counter-summary.json, harness.mjs, patch.diff, and exact baseline/patched JS files in this directory. Re-run: node tests/selective-audio-scheduling-cpu.mjs.
