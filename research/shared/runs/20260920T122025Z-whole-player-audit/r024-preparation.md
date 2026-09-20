<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# R024 whole-player candidate preparation

This is unexecuted research tooling, not a qualified result. Do not change the
canonical item decision or register a successful run based on these files.

Current preparation blocker: `web/engine-software-yuv/` is absent. A bounded
filename search found historical manifests but no retained YUV player module or
Wasm under build/results/research. `scripts/build-software-yuv.sh` is the existing
recipe, but no build has been run for this candidate. Its explicit export list
predates several current worker calls; verify `_web_audio_configure`,
`_web_configure`, `_web_io_*` and subtitle exports against the produced module
before using it. Historical manifest identity alone is not a runnable asset.

## Asset derivation

Run `node research/items/R024.compare-raw-yuv-videoframe-presentation-with-existing-software-output/tests/whole-player-derive.mjs NEW_OUTPUT_DIRECTORY`.
The command writes only two source overlays and their provenance, never large
runtime assets. Serve them over a frozen asset map containing the exact maintained
generated Player API, worker dependencies, engine-software-full and
engine-software-yuv modules/Wasm, audio worklet and fonts. Capture hashes of every
served asset. Copying or linking a mutable checkout without a hash check is not a
frozen baseline. Candidate worker retains its GPL notice.

Use the same Player API and fixture for three independently recreated owners:

1. Shipping baseline: mode software, softwarePresenter rgb.
2. Existing control: mode software, softwarePresenter experimental-yuv.
3. Candidate: same options as control with only the two derived assets overlaid.

Candidate diagnostics must report research-r024-raw-i420 and positive candidate
frames; decoder must remain software. Reject a missing candidate, RGB fallback,
unexpected route, or any output error. All groups use the same audio selection,
dimensions, volume, playback rate, subtitle-off settings and media source.

## First correctness gate

Use an even-dimension, source-sized, unrotated limited-range BT709 I420 fixture
with numbered moving grayscale picture patterns and synchronized PCM/audio cues.
Independently decode reference pictures with pinned FFmpeg. Check actual canvas
output and source-frame IDs during continuous playback, exact-seek pauses,
pause/resume, backwards seeks, EOF, replacement, cancellation and destruction.
Then require a colored BT709 fixture to catch matrix/transfer errors. Predetermine
pixel tolerance from the output contract; do not relax it after seeing failures.
The backend seam exposes matrix and range but not primaries/transfer: independently
probe and enforce fixture BT709 transfer/primaries and no HDR before admission.
Do not claim arbitrary SDR color support from the seam check alone.

Candidate rejects resized/cropped/PAR output, rotation, full range, non-BT709
matrix, odd dimensions, out-of-bounds planes, any subtitle/OSD payload and native
RGB fallback. Explicitly run negative controls for these inputs. Unsupported
profiles remain unsupported; never silently continue a supposedly candidate run.
VideoFrame resources close synchronously after drawImage; retained staging bytes
are released on destroy. Assert framesCreated equals framesClosed, liveFrames zero,
and no candidate output after owner retirement. A candidate must not silently
ignore an error swallowed by the maintained worker callback.

## Performance only after correctness

Freeze duration, repeated paired ordering, cold-load and already-loaded cases,
CPU-process accounting, memory sampling, first-correct-picture latency, delivered
source IDs/drops, A/V drift and teardown timeout before timing. Measure continuous
whole-player playback including decode, demux, IO, audio, row packing, VideoFrame
construction and presentation; drawMs is diagnostic only. All relevant browser
processes must be included consistently. GPU/energy are separate measurements,
not inferred from CPU or elapsed draw time. Capture setup/cold costs separately
from steady playback but retain both in the decision.

The old 35.4% component saving is not the expected player saving or a threshold.
Compare candidate to shipping RGB as primary and existing YUV as secondary.
Successful output remains Software tier: this changes presentation, not decoding.
Record no benefit or regression honestly rather than inferring value from fewer
uploads. Destroy every owner and close browser resources between paired samples.
