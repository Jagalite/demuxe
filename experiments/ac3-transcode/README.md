<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# In-browser AC-3 audio transcoding experiment

Decode selected 48 kHz stereo AC-3 in a bounded FFmpeg/Wasm preparation worker, encode the PCM, copy the original HEVC packets, and feed fragmented MP4 to the maintained `RemuxPlayer`. The browser owns audio/video playback. This removes mpv, its PCM bridge and the AudioWorklet from this experimental path; it does not isolate the cost of the AudioWorklet alone.

Two private engines use the pinned FFmpeg adaptation build:

- **FLAC24, level 0:** float PCM is rounded to signed 24-bit samples. This is not bit-exact preservation of arbitrary float PCM. Clipping is counted, and the checked fixture has none.
- **AAC-LC, 192 kbps stereo:** lossy re-encoding. Encoder priming is timestamped and uses the existing delayed-moov/edit-list mux setup.

No video decoder or encoder is enabled. Neither engine is installed in `web/`, and no production admission policy is changed. The experiment calls `RemuxPlayer` directly: the existing `flac` option selects the preparation ABI, while the isolated engine advertises the actual output codec. This is not a new public `flac` policy or an implementation of automatic transcoding.

## Reproduce

Use a fresh output directory; the build retains generated bridge sources, FFmpeg inputs, engine manifests and hashes.

```sh
python3 experiments/ac3-transcode/build.py --output build/ac3-transcode-01
CHECK_ONLY=1 OUT=results/ac3-transcode/check-01 node experiments/ac3-transcode/run.mjs
python3 experiments/ac3-transcode/verify-media.py results/ac3-transcode/check-01
CORRECTNESS=results/ac3-transcode/check-01/result.json OUT=results/ac3-transcode/cpu-01 node experiments/ac3-transcode/run.mjs
```

`ENGINES` can name a different `engines.json`; `LANES` limits the cases. `CORRECTNESS` accepts comma-separated result paths so a corrected harness case can be rerun without repeating successful cases. Failed evidence is retained.

The CPU run waits for the existing Chrome startup-completion gate, then measures current AC-3, FLAC24, AAC and current AC-3 again in fresh contexts. Each arm records open-through-playback CPU plus a ten-second steady window with native process instruction/cycle counters. Encoded sample counters must advance by more than 450,000 during the timed window, the source must remain short of EOF, and preparation must stay bounded ahead of playback. Thus encoding cannot disappear into an unmeasured preconversion step. No audio analyser or captured MSE buffers are used in CPU contexts.

This is a short diagnostic on one marked stereo fixture, not a README cell refresh or qualification for other codecs, multichannel layouts, subtitles, long files, network stalls or other browsers. Native audio here means the browser's compiled decoder and media pipeline, not hardware audio decoding. CPU percentages remain sensitive to scheduling; instruction counts are reported alongside them.
