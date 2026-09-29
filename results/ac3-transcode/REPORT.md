<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# AC-3 to native browser audio: bounded in-browser transcoding

## Outcome

The FLAC24 prototype reduced whole-Chrome CPU to **17.59% of one core**, compared with **25.93% before and 23.73% after** for the current native-video/mpv-audio route. Renderer instruction rate fell from about **178 million/s to 79 million/s (56%)**. This short matched diagnostic favors FLAC24: it reduced actual computational work as well as observed CPU time. It is not a new README result or broad qualification.

AAC measured **19.46%**, but renderer instructions rose to **285 million/s**. Its CPU percentage alone would overstate the benefit: its execution mix/throughput differs, and encoding adds substantial work. FLAC24 is the stronger candidate here.

This experiment replaces mpv, its PCM transfer/synchronization machinery, and the AudioWorklet together. It does **not** prove that the AudioWorklet alone caused the old overhead.

## Implementation and fidelity

- Separate FFmpeg/Wasm preparation engines; AC-3 is the only decoder enabled, with AAC and FLAC encoders available. No video decoder or encoder is configured. No production runtime or admission policy was changed.
- Live AC-3 decoding and encoding occur in the browser, bounded roughly five seconds ahead of playback. The maintained RemuxPlayer copies HEVC into fragmented MP4 and lets one browser media pipeline own video and audio.
- FLAC uses compression level 0 and rounds float PCM to signed 24-bit values. This is **not lossless preservation of arbitrary float PCM**. No clipping occurred. For 192,000 compared channel samples, maximum error versus native FFmpeg AC-3 decoding was 1.043e-7, RMS 3.567e-8; that also includes numerical differences between native and Wasm decoding. This tonal fixture is not a perceptual-quality study.
- AAC-LC uses 192 kbps stereo and is lossy. Its 1,024-sample encoder delay is timestamped before the source PCM and uses delayed-moov/edit-list handling. The first decoded prefix was compared after excluding those priming samples.
- Every one of the 437 captured video packet payloads matched the original for each output. Video PTS retained a constant 1.005-second mux/origin shift; relative presentation timing is preserved.
- Chrome reported `VideoToolboxVideoDecoder` and `kIsPlatformVideoDecoder=true` for both outputs. Audio used compiled browser software decoders: `SymphoniaAudioDecoder` for FLAC and `FFmpegAudioDecoder` for AAC. “Native audio” here does not mean hardware audio decoding.

## Correctness

FLAC24 and AAC passed stereo 440/880 Hz markers, pause/resume, 0.5x/2x/1x rates, forward/backward seeks, a paused-seek video marker, EOF and replay, with no remaining workers after destroy. End-of-stream decode and encode sample counts matched. Initial/seek drops are retained in the raw correctness records; zero drops below refers only to CPU windows. These checks are not an exhaustive A/V-sync or gapless-audio qualification.

`check-01/result.json` retains a baseline-only harness failure: it held a video element replaced during Auto startup. The prototype cases passed. The corrected harness reads the current baseline video element; only that case was rerun and passed in `check-02/result.json`. CPU used the corrected harness and required both sets of successful evidence, with matching fixture and experimental engine hashes.

## Short matched CPU comparison

One headed Chrome, completed 150-second hardware-key startup gate, fresh context per arm, fixed order AC3/FLAC24/AAC/AC3, three seconds of warmup after first progress, then one ten-second steady window per arm. URL input is the exact same frozen HEVC Main 10 SDR + stereo AC-3 MKV. No correctness audio taps, profiler or preconverted audio file is used in CPU contexts. Whole Chrome covers browser, renderer, GPU, audio service and other reported utility processes; external OS services are excluded.

| Path | Whole Chrome CPU | Renderer CPU | Renderer M instructions/s | Effective active GHz | Audio samples encoded in window | Video frames / drops |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| ac3 | 25.93% | 13.30% | 178.34 | 1.35 | N/A | 301 / 0 |
| flac24 | 17.59% | 5.39% | 78.90 | 1.42 | 479232 | 300 / 0 |
| aac | 19.46% | 7.81% | 284.80 | 1.55 | 481280 | 300 / 0 |
| ac3 | 23.73% | 11.99% | 177.36 | 1.58 | N/A | 300 / 0 |

All four windows passed: stable process IDs, foreground playback, no new dropped frames, and no new baseline audio underruns. Both transcoding windows encoded approximately ten seconds of audio while being measured; preparation remained roughly five seconds ahead and short of EOF. Thus the reported steady CPU **includes AC-3 decoding, encoding, remuxing, and native playback**. This is not a pretranscoded-file benchmark.

Instruction/cycle counters bracket slightly wider intervals than CDP CPU samples and use their own elapsed times. Effective GHz is an aggregate cycle/active-time ratio, not measured P-core/E-core residency. Host scheduling changed even between the baseline repeats; CPU percentages are not portable constants. The instruction reduction makes the FLAC result more persuasive than the AAC CPU percentage alone.

## Conversion/startup cost also retained

These intervals begin before opening the original URL and end after the CPU window. New processes contribute their observed lifetime CPU; no process disappeared. They include initial conversion and buffering as well as ongoing playback.

| Path | Open-through-playback CPU seconds | Wall seconds | First progress seconds |
| --- | ---: | ---: | ---: |
| ac3 | 6.499 | 25.735 | 12.003 |
| flac24 | 3.081 | 14.338 | 0.488 |
| aac | 3.472 | 13.857 | 0.502 |
| ac3 | 5.977 | 24.124 | 10.776 |

The current Auto baseline took about 11–12 seconds to reach first progress; the explicit RemuxPlayer prototypes bypass production route admission. Consequently these opening intervals have different wall durations and are **not** a clean estimate of codec speed or a universal startup improvement. The steady windows above establish that conversion work was included without that startup confound. Startup behavior itself was not investigated further in this experiment.

## Scope and next step

This is a prototype for this 48 kHz stereo AC-3 fixture, not a shipped fix. FLAC24 merits integration behind an explicit precision-conversion policy, with production planner/fallback handling and broader media/lifecycle qualification before automatic selection. Arbitrary float PCM is not losslessly representable as FLAC24, so this must not silently extend the existing lossless policy. No mpv modifications were needed.

No README cells were changed. Existing unrelated EOF-observer edits remain as they were. Experimental code is in `experiments/ac3-transcode/`; engines, source snapshots and build logs are under `build/ac3-transcode-01/`. Raw CPU, role counters, process identity, first-progress timing, live encoding counters and engine manifests are in `cpu-01/result.json`; derived counters are in `cpu-01/counter-summary.json`. `runtime-audit.json` records current source hashes and the pre-existing tracked diff; those hashes were unchanged at completion. `check-01/media-verification.json` records payload and decoded-prefix comparisons.
