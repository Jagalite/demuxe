<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Three-codec live transcoding performance pilot — 2026-09-26

**AC-3, E-AC-3 and DTS core all show lower total Chrome CPU with the experimental
FLAC24 path in this matched pilot. Renderer instructions decrease 52–55%, supporting
a reduction in computational work rather than a CPU-frequency explanation alone.**
The five known correctness failures remain unchanged; this is not production admission.

## Matched results

All inputs are stereo 48 kHz with the same authored HEVC Main10 SDR 320×180/30 fps
video used by the format screen. Each Auto arm holds `native-video-mpv-audio`;
each alternative uses the private multi-codec engine from `build/audio-transcode-formats-02`
and the maintained RemuxPlayer. No video decoding/encoding occurs in that engine.

Medians of two accepted eight-second windows per path. CPU is percent of one core,
summed across Chrome processes; renderer MIPS means millions of instructions per
wall second. Reductions compare only matching input fixtures within this run.

| Codec | Current Auto CPU | Live FLAC24 CPU | CPU points saved | Relative total-CPU reduction | Renderer MIPS |
| --- | ---: | ---: | ---: | ---: | --- |
| AC-3 | 27.95% | 19.68% | 8.27 | 29.6% | 191.74 → 87.39 (54.4% lower) |
| E-AC-3 | 26.75% | 20.20% | 6.55 | 24.5% | 191.63 → 86.11 (55.1% lower) |
| DTS core | 28.39% | 20.65% | 7.75 | 27.3% | 238.64 → 114.80 (51.9% lower) |

These savings apply to changing the **whole audio pipeline**, not merely removing
an AudioWorklet callback. They do not predict savings for browser-native AAC/MP3/Opus,
surround, TrueHD, other containers/browsers or arbitrary real media.

## Gates and actual work during measurement

All **12/12 windows passed**: stable process IDs, foreground playback, unchanged
route, at least 29 presented frames per second, zero new dropped frames, no
player errors. Auto had no new audio underruns or sync corrections and consumed
more than 360,000 audio frames per window. Maximum sampled absolute Auto sync
error was 3.83 ms.

Every FLAC24 window encoded **7.992–8.016 seconds of audio** during its
roughly eight-second interval. All samples remained short of source EOF; maximum
observed preparation lead was 5.234 seconds, below the eight-second rejection
limit. Clipping and video decode/encode counters stayed zero. Thus steady CPU
includes ongoing source decoding, conversion, FLAC encoding, remuxing and playback;
it is not playback of preconverted files. Initial preparation/startup CPU is outside
these steady windows and no startup-cost improvement is claimed.

No audio analyser, MSE capture or profiler was attached during CPU collection.
Correctness came from the frozen [format screen](REPORT.md), plus a short fresh
[Auto route/audio check](perf-check-01/result.json) for these exact fixtures.
The preflight is a steady playback check, not a repetition of the full lifecycle
campaign. It confirmed all three controls selected the same selective-audio route.

## Raw windows and process accounting

| Path, in execution order | Total CPU | Presented frames / new drops | Samples encoded during window |
| --- | ---: | ---: | ---: |
| ac3/auto | 28.07% | 240 / 0 | N/A |
| ac3/flac24 | 19.03% | 241 / 0 | 383616 |
| eac3/flac24 | 19.99% | 241 / 0 | 383616 |
| eac3/auto | 27.56% | 240 / 0 | N/A |
| dca/auto | 28.73% | 240 / 0 | N/A |
| dca/flac24 | 21.35% | 240 / 0 | 384768 |
| dca/flac24 | 19.94% | 240 / 0 | 384768 |
| dca/auto | 28.05% | 240 / 0 | N/A |
| eac3/auto | 25.94% | 240 / 0 | N/A |
| eac3/flac24 | 20.40% | 240 / 0 | 383616 |
| ac3/flac24 | 20.33% | 240 / 0 | 383616 |
| ac3/auto | 27.84% | 240 / 0 | N/A |

Median per-process-role CPU (all in one-core percentage points):

| Path | Browser | Renderer | GPU process | Audio service | Other utility |
| --- | ---: | ---: | ---: | ---: | ---: |
| ac3/auto | 0.35% | 14.33% | 12.26% | 0.81% | 0.20% |
| ac3/flac24 | 0.43% | 6.06% | 12.58% | 0.48% | 0.13% |
| eac3/flac24 | 0.50% | 6.26% | 12.93% | 0.42% | 0.10% |
| eac3/auto | 0.32% | 13.79% | 11.83% | 0.72% | 0.09% |
| dca/auto | 0.57% | 15.40% | 11.46% | 0.72% | 0.25% |
| dca/flac24 | 0.73% | 6.69% | 12.48% | 0.48% | 0.27% |

A GPU-process CPU counter is CPU consumed by that process, not GPU utilization.
Separate role medians need not sum exactly to the median of the total. OS services
outside the Chrome process set and the local fixture server are excluded.

## Protocol, provenance and limits

One headed Chrome 153.0.8010.53 launch for this whole comparison block, gated on
completion of the known macOS hardware-key startup task. Startup tracing stopped
before measurement. Fresh context per arm; two seconds of playback warmup after
first progress, eight-second fixed-deadline sampling, one-second inter-arm gap.
Each codec appears in both Auto/FLAC and FLAC/Auto ordering. Runtime/fixture/engine
hashes are checked against correctness evidence; no builds ran during collection.

This is a short correlated pilot, not a fresh-launch reproducibility campaign or
README table replacement. The small sample supports the observed direction and
size within this block; it does not establish confidence bounds or universal CPU
percentages. Native instruction/cycle snapshots use their own slightly wider
elapsed intervals. MIPS is not a portable normalized CPU percentage, and active
GHz is not measured P-core/E-core residency. No idle subtraction was performed.

Do not subtract these figures from earlier AC-3 campaigns: fixture content,
engine build and timing protocol differ. No correctness guard, production route,
public precision policy or existing EOF edit changed during this task. FLAC24
still rounds decoded float PCM; this is not arbitrary-float lossless preservation.

## Evidence and commands

- [Raw CPU windows, counters, gate states and hashes](perf-01/result.json).
- [Native process-counter summary](perf-01/counter-summary.json).
- [Combined medians and reductions](perf-01/summary.json).
- [Auto preflight](perf-check-01/result.json).
- [Harness](../../experiments/audio-transcode-formats/perf.mjs).

```sh
CHECK_ONLY=1 OUT=results/audio-transcode-formats/perf-check-new node experiments/audio-transcode-formats/perf.mjs
BASELINE_CHECK=results/audio-transcode-formats/perf-check-new/result.json OUT=results/audio-transcode-formats/perf-new node experiments/audio-transcode-formats/perf.mjs
python3 experiments/audio-transcode-formats/perf-summary.py results/audio-transcode-formats/perf-new
```

Output directories must be new. The harness deliberately runs only AC-3/E-AC-3/DTS
stereo cases with both browser and sample-verification passes in the format screen.
