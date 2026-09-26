<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Multi-format FLAC24 preparation experiment

This extends the isolated AC-3 prototype to other decoder sample formats and
codec families. It does not install an engine into `web/`, change Auto admission,
change the public lossless policy, or publish README performance results.

The private build enables audio decoders and the FLAC encoder, with no video
codecs enabled. Opus requires FFmpeg's `libswresample` internally; application
conversion preserves the declared sample rate and channel count. S16/S24 integer
PCM can be represented exactly in FLAC24; float and full-precision S32/S64
inputs must not be described as lossless. The implemented accepted sample formats
are packed/planar S16, S32, float and double; integer S64 is not implemented.

`prepare.py` makes 18-second Matroska fixtures with copied marked HEVC Main10
SDR video. Channel tones are distinct; tones change at four and eight seconds
to match the source video's coarse time markers. The LFE tone stays at 80 Hz.
The manifest preserves actual codec/sample-format/layout metadata, commands,
hashes and preparation failures. `--cases` permits scoped preparation retries.

```sh
python3 experiments/audio-transcode-formats/build.py --output build/audio-transcode-formats-new
python3 experiments/audio-transcode-formats/prepare.py --out build/audio-transcode-formats-fixtures-new
ENGINES=build/audio-transcode-formats-new/engines.json \
FIXTURES=build/audio-transcode-formats-fixtures-new/manifest.json \
OUT=results/audio-transcode-formats/new \
node experiments/audio-transcode-formats/run.mjs
python3 experiments/audio-transcode-formats/verify.py results/audio-transcode-formats/new
```

`OUT` must be new and its parent must exist. `CASES` selects a comma-separated
subset; otherwise all prepared cases run. The browser harness retains failures
and exits nonzero if any case fails. It records a captured pre-seek MP4 prefix,
a paused-seek screenshot, native decoder diagnostics, and lifecycle phases.

Checks cover channel/time markers, pause/resume, 0.5x/2x/1x rates, forward and
backward seeks, paused seek, EOF sample drain, replay and worker cleanup.
Audio observation uses a correctness-only eight-channel splitter; that measures
browser decoded channels, not the user's physical surround speaker output.
Time-coded markers are a coarse synchronization check, not a sample-accurate
measurement of physical audio/display latency.

Independent prefix verification checks compressed video packet hashes and
relative timestamps, audio/video timestamp shifts, decoded channel layout,
and sample values against native FFmpeg. Established integer lossless cases
require exact equality; float/native-versus-Wasm comparisons report numerical
error with a 2e-5 bound. This bound is not a perceptual quality guarantee.

This campaign qualifies neither other browsers nor other containers, object
metadata (Atmos/DTS:X), arbitrary channel layouts, long/network-stalled media,
track switching, nor performance for these additional formats. Existing
browser-playable codecs are controls; a passing transcode is not a reason to
replace their direct playback path.
