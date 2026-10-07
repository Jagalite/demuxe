<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Seamless switching laboratory

This laboratory compares isolated switching prototypes and the production adaptive-selection API.
It compares actual presentation after switching 360p30 → 720p30 → 720p60 →
360p30. Three color markers identify the encode at the presented playhead.
All renditions have aligned one-second H.264 GOPs; segmented playback uses
one shared AAC audio rendition. Separate MP4s each contain that same audio.

## Run

```sh
python3 experiments/seamless-switching/prepare.py build/seamless-switching-NEW
node experiments/seamless-switching/server.mjs build/seamless-switching-NEW results/seamless-switching/NEW
```

Open the printed URL in the T3 collaborative preview and click **Run experiment**.
Keep the preview rendering. In the tested Electron preview, starting its recording
was necessary to sustain requestVideoFrameCallback; an inactive rendering surface
produced almost no callbacks even though playback advanced. Those diagnostic
runs cannot establish video continuity. A recording adds measurement overhead.

The run takes about five minutes. Inspect `window.lab` for status. After completion:

```sh
python3 experiments/seamless-switching/analyze.py results/seamless-switching/NEW
```

The server binds to loopback on an automatically selected port. Fixtures and the
compiled Demuxe runtime are frozen outside production assets. `manifest.json`
records the source revision, source hashes, FFmpeg commands, and fixture/runtime
hashes. Use a fresh output directory for every run; never overwrite prior evidence.

## Comparisons

| Case | Mechanism |
|---|---|
| baseline | Standalone Shaka, no switches |
| demuxe-buffered | Demuxe public setQuality with switching:'buffered' |
| demuxe-responsive | Demuxe public setQuality with its responsive default |
| demuxe-custom | Production adaptation.select callback, run separately with transfer pacing |
| shaka-clear | Standalone Shaka, clearBuffer=true and safeMargin=0 |
| shaka-margin | Standalone Shaka, clearBuffer=true and safeMargin=2 seconds |
| shaka-clear-delayed | Clear immediately, each segment response delayed 350 ms |
| shaka-margin-delayed | Retain two seconds, each segment response delayed 350 ms |
| file-cold | Replace an HTMLVideoElement source, seek, and resume |
| file-prepared | Prepare a second element at a future timestamp; start and await a frame, then switch surface/audio gain |

Standalone Shaka experiments use the same frozen vendor runtime but bypass
Demuxe's adapter. Separate-file experiments are HTMLVideoElement prototypes,
not claims about Demuxe replacement. Production cases exercise the current public API.

For a production callback run, start the server with
`SEGMENT_BYTES_PER_SECOND=500000` and invoke `runExperiment(['demuxe-custom'])`
from the preview after a user gesture has permitted audio. The limit is per media
response, not a global shared-link cap. The `SEGMENT_DELAY_MS=350` option instead
delays response headers, which tests latency but may not produce useful throughput
samples. Cached/local downloads can therefore complete without an ABR decision;
zero callback invocations do not qualify the callback path. Historical `demuxe-keep`
receipts used the pre-integration runtime; new runs explicitly name buffer behavior.

`policy.mjs` demonstrates the original pure callback boundary: immutable context,
default choice, caller override, and validation/fallback. The default follows an
authored schedule to exercise specific transitions; it does not estimate bandwidth
or implement production adaptation. The production callback requests a target and urgency while Demuxe owns buffer
treatment, safe execution and resource/cancellation rules; see `docs/STREAMING.md`.

## Evidence and limitations

- Frame callbacks record media timestamps, compositor estimates, and the color
  marker sampled from the current video. They do not measure physical display output.
- An AudioWorklet captures mono float32 PCM before speaker output. Silence runs
  of at least 5 ms and carrier-phase changes above 0.15 radians are reported.
- The 997 Hz tone is periodic: this detects silence and phase breaks, but cannot
  prove absence of integer-cycle skips or duplicates. A nonrepeating audio timecode
  is needed for stronger sample-continuity qualification.
- Initial graph connection can skip audio-context sample frames during its first
  processing quanta. The exploratory and confirmation analyzer explicitly omits
  the affected first PCM block; subsequent block indexes must be contiguous.
  The current capture code discards partial blocks across a clock discontinuity
  and records it explicitly. Startup is excluded from continuity measurements.
- Segment delay is deterministic request latency, not bandwidth throttling.
- Maximum frame intervals include host/compositor scheduling effects. Compare
  them with the baseline; do not label every excess as a decoder failure.
- Separate-player handoff cannot guarantee sample-accurate audio. Its recorded
  commit skew is a pair of currentTime observations, not an audio-clock measurement.
- No HEVC/HDR, live, PiP, cross-browser, physical output, battery/CPU, or overloaded
  decoder qualification is implied. Prepared handoff still needs resource budgets,
  cancellation, track preservation, rollback and a common presentation clock.
