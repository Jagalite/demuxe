<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Local agent handoff — D62–D64

## Start here

Read REPORT.md and evidence/analysis.json. This package contains standalone experiments, not a PR or production recommendation. Source-lineage commit: `6feb9b337889bfbaab8c5ac33bbddd0ca5d94f36`. Reconcile the current branch before changing any research record. Temporary D IDs are not authoritative new R-numbers.

Do not merge three new subsystems merely because their component outputs work. Inspect the maintained player and reuse existing PGS state, native audio, source identity, mux, and queue owners. Keep the original failed profiles intact.

## D62: PGS state and native image presentation

Related item: R198.bitmap-subtitles-directly-from-rle-runs; earlier D24 addressed only an RLE/PNG construction boundary. This prototype adds actual fragmented ODS, two objects, palette-only changes, clears, and epoch collisions.

The accepted oracle is exact subtitle-only straight RGBA from FFmpeg, then same-browser composition against a reference PNG. **It does not fix R198's strict YUV-background compositing failure or qualify the README's complete HEVC/audio/PGS case.**

First port the fixture, not the parser. Run it through the actual PGS decoder/object owner. Check that only END-complete scenes publish and that object/palette cache identity includes source epoch or verified content. Delayed image promises must close without publishing after seek/source replacement. Expand chroma/alpha, forced/cropped and overlapping object contracts separately. Measure complete parser/PNG/decode/composition cost against the cheapest correct existing bitmap path before adopting the PNG route.

Smallest next gate: same actual runtime owner, all six display sets and 15 seek positions, eight malformed/source controls, plus real late image completion across an epoch reset.

## D63: native FLAC sample windows

Related item R094 concerns a different Ogg Opus/whole-file boundary. Test this actual stereo S24/48k fMP4/MSE boundary rather than inheriting that qualification.

Candidate uses original prepared fragments, negative timestampOffset, and exact sample-derived appendWindow bounds. Three captured clips match all 157,944 scalar values; a one-sample end error gives a correct prefix plus an extra frame and must fail.

Do not claim low memory or decode-work savings: this prototype appends all source fragments. Keep complete preparation/index/read/validation cost charged. Check existing native audio consumers before adding any special path. Add range/index selectivity only after proving its source identity and frame closure.

Smallest next gate: use the maintained audio SourceBuffer and production-grade output capture; repeat starts, backward seeks within a clipped presentation, pause/resume, replay, cancel and source replacement. Do not silently substitute rounded-millisecond intervals.

## D64: queue composition

D64 composes D63; do not count both as separate low-level codec inventions. The A/B/A plan uses 30,001 + 25,006 + 19,002 frames and two exact joins. All-prepared, same-init and ahead-of-deadline live-append variants match 148,018 values.

First preserve per-source initialization in the real owner. The one-init result does not justify reusing incompatible descriptions. The existing AAC queue correctness failure is unchanged; avoid extrapolating from lossless FLAC.

Smallest next gate: real queue/source cancellation and replay, later append under controlled delay, bounded retention/backward restoration, then paired A/V and subtitles. For late delivery, distinguish a content-correct resumed sequence from uninterrupted timeline delivery. Measure complete CPU, startup and retained memory against native re-encoded or persistent alternatives only after output gates pass.

## Required reliability investigation

The first run is 92/92; a fresh replay is 91/92. An unmodified full-source audio capture omitted exactly 128 middle frames. The requested clips and queue variants reproduced, but this does not certify live-output reliability. Inspect evidence/capture_anomaly.json and both raw capture_full_a.f32 files.

Use an AudioWorklet/trace or another independently clocked capture endpoint in a secure local deployment to distinguish media delivery from main-thread ScriptProcessor capture behavior. Do not discard the recording, insert the missing samples, or rerun until an all-green summary replaces it. Establish a predeclared repeat policy and preserve all results.

## Reproduction

Requirements: Python, NumPy, Pillow, Playwright, ffmpeg/ffprobe, Chromium. Browser executable defaults to `/usr/bin/chromium`. Fixtures are served into an about:blank page through a local test bridge; no user files or network assets are accessed.

Run:

```sh
python scripts/run_all.py
```

The verifier intentionally exits nonzero if any expected positive output fails. Captured leading silence and callback scheduling can vary; compare the globally aligned content as verify.py does, not raw entire capture hashes. No per-clip resynchronization is permitted.

For execution environments with a short per-call limit, run individual stages:

```sh
python scripts/build_audio.py
python scripts/build_pgs.py
python scripts/run_audio.py first
python scripts/run_audio.py rest
python scripts/run_audio.py join
python scripts/run_audio.py live
python scripts/run_audio.py controls
python scripts/run_pgs.py
python scripts/verify.py
```

`run_all.py` generates the three-second background video too. It is also bundled in fixtures/background.mp4. Preserve reports and evidence in a separate output copy when reproducing.
