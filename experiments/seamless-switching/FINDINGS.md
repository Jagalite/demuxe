<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# First switching experiment — 2026-10-06

Retaining a small forward buffer was the best tested compromise. Immediate
buffer clearing accelerated visible quality changes but interrupted audio.
Preparing a second MP4 player reduced gaps but did not preserve audio phase.
These findings support shared audio and same-timeline segment switching as the
first production implementation; they do not establish universal seamlessness.

Source runtime: `07c40076e6e7ca78d40a1c9d3cd02eed8410e3c6`, compiled into a separate
runtime directory. Exact fixture/runtime/source hashes and FFmpeg commands are
in each result directory's `manifest.json`. Production files were not modified.

Host browser: T3 preview, Electron 44.4.2 / Chromium 152.0.7977.130 on macOS.
Synthetic H.264/AAC VOD, 32 seconds, 360p30 / 720p30 / 720p60, shared 997 Hz audio.
All video keyframes were independently verified at integer seconds 0–31.
Each switching case requested three transitions at media seconds 4, 12, and 20.

| Method | Request to first observed target frame | Worst observed frame interval | Audio observation |
|---|---:|---:|---|
| No-switch baseline, two runs | — | 35.4 ms | No detected silence or phase anomalies |
| Demuxe current buffered selection, two runs | 6.00–6.07 s | 49.9 ms | No detected silence or phase anomalies |
| Clear buffer immediately | 42–175 ms | 193.1 ms | Three silence gaps, 35–187 ms |
| Retain 2 seconds | 2.00–2.06 s | 83.4 ms | No detected silence or phase anomalies |
| Clear immediately, +350 ms per segment request | 1.05–1.13 s | 1142.8 ms | Three silence gaps, 1.07–1.14 s |
| Retain 2 seconds, same delay, two runs | 2.02–2.05 s | 66.7 ms | No detected silence or phase anomalies |
| Replace MP4 source directly | 56–193 ms | 210.3 ms | Three silence gaps |
| Prepare MP4 and hand off, two runs | 1.04–1.08 s | 66.7 ms | No silence ≥5 ms; phase breaks in both runs |

The approximately one-second prepared-file delay is an intentional preparation
lead time. It is not a one-second playback stall. Likewise, a two-second buffer
margin means the old quality keeps playing while the new quality approaches the
playhead. Video interval measurements include browser/compositor scheduling.
Intervals up to 66–83 ms mean the margin approach is promising, not frame-perfect.

## Evidence

- `results/seamless-switching/20261006/`: instrumentation diagnostics. Sparse frame
  callbacks, timeout and rendition-discovery failures; not qualification evidence.
- `results/seamless-switching/20261006-round2/REPORT.md`: all eight corrected
  exploratory cases, with per-frame JSON and float32 PCM. Runtime and media were
  frozen, but the experiment harness was still being refined.
- `results/seamless-switching/20261006-confirmation/REPORT.md`: repeated baseline,
  Demuxe buffered switching, delayed safe-margin switching, and prepared-file
  handoff. This run also froze the harness and saved its hashes and media requests.
- Both runs omitted the first PCM block affected by initial audio-graph clock
  connection. All subsequent captured block indexes were contiguous. Startup was
  excluded from the analysis. The final capture implementation explicitly discards
  partial blocks across clock jumps; its synthetic-clock test covers this case.
- Preview recording enabled normal frame callbacks. Both full recordings exceeded
  the tool's 50 MiB transfer limit and were not transferred as report artifacts.
  Numerical frame traces and PCM were saved independently and are available.

## Design implications

1. Implement the initial seamless path through the existing Shaka/MSE timeline,
   with aligned renditions and shared audio. Keep ordinary quality upgrades buffered.
2. For faster changes, preserve a safety margin derived from segment duration,
   request/decode estimates and current buffer health. Two seconds worked here;
   it is not a universal safe constant and must be tested under bandwidth pressure.
3. Let the callback choose a target and urgency. The execution layer should own
   buffer removal, boundary choice, synchronization, cancellation, and rollback.
   `policy.mjs` is an isolated contract sketch, not production ABR.
4. Keep arbitrary file replacement as a separately qualified handoff capability.
   Independently playing media elements did not preserve audio phase even with
   small currentTime differences. Preserve a shared audio clock/stream where possible.
5. Distinguish requested, selected, and presented quality. The marker measurements
   show why a successful selection call cannot mean the new quality is on screen.

Before production: use nonrepeating audio timecodes, bandwidth drops and recovery,
seeks/cancellation during preparation, resource pressure, track preservation,
Safari/Firefox, and live/codec/HDR boundaries. PCM here is pre-speaker mono; neither
it nor frame callbacks prove physical A/V output. A periodic tone cannot detect
all skipped or duplicated audio, and no CPU/power claim follows from this test.
