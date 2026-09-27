# Local main integration

The reviewed components are now connected to the production Player through the
explicit `experimentalRemuxRuntime` option. The default remains `pthread`.
Private JSPI/Asyncify admission is limited to plain file Direct, Remux and
FLAC24 audio-transcode routes; private mpv, subtitles, Hybrid and Software
playback are not enabled. Direct playback does not exercise either Wasm runtime.

The imported work starts at `e7a8d02d` and includes component commits `7af31503`
and `ede8750e`, followed by review fixes in `4d02ab32`. The original supplied
package manifest describes the preserved extraction, not this working fork.

## Qualification retained

- FFmpeg remux/transcode component evidence and infrastructure continuation tests:
  [local campaign](README.md).
- Actual mpv subtitle rendering and restricted PCM/AudioWorklet playback:
  [review report](../../../results/jspi-asyncify/mpv-review-fixes-01/REPORT.md).
- Latest recorded browser results: 17 subtitle and 12 audio cases in Chrome
  153.0.8010.53. Private-memory JSPI/Asyncify ran without COOP/COEP;
  the pthread subtitle reference used isolation headers. Asyncify disabled both
  JSPI APIs. These are component results, not full Player qualification.

Import validation reruns the 20 mpv host checks, 18 FFmpeg review checks, one
frozen-input check and 11 Wasm ABI audit checks. Evidence verification checks the
recorded browser results against their original files and external build inputs;
it does not rerun playback or rebind historical results to the destination tree.

```sh
node --test experiments/jspi-asyncify/mpv/tests/audio-worklet.test.mjs
python3 -B experiments/jspi-asyncify/mpv/tests/test_provenance.py
python3 -B experiments/jspi-asyncify/mpv/tests/test_evidence.py
python3 -B experiments/jspi-asyncify/local/test_review_fixes.py
node --test experiments/jspi-asyncify/ffmpeg/tests/frozen-inputs.test.mjs
node experiments/jspi-asyncify/review/tests/emscripten-audit-guards.mjs
python3 -B scripts/check-licenses.py
```

Large service binaries, SDKs, dependencies and frozen fixtures remain in their
original local build directories. Build commands and hashes are preserved in the
component documentation and results. Keep those directories and the experiment
worktree until new builds and browser campaigns supersede their evidence.

## Local opt-in Player integration

Install the verified local builds once into a runtime tree (existing destination
folders are rejected):

```sh
python3 scripts/install-private-remux.py \
  --builds /Volumes/seed2/Projects/demuxe-jspi-asyncify-builds-20260927 \
  --runtime-root /Volumes/seed2/Projects/demuxe
npm run build
```

```js
const player = new Player(container, {
  assetBase: '/demuxe/',
  experimentalRemuxRuntime: 'jspi', // or 'asyncify'; default: 'pthread'
});
await player.open(source);
await player.play();
```

The runtime uses separate `engine-remux-{runtime}` and
`engine-adaptation-{runtime}` assets, private Wasm memory, serialized asynchronous
FFmpeg operations and cancellable MessagePort reads. JSPI requires browser JSPI
support. Asyncify runs with both JSPI APIs disabled in its service Worker.
Normal URL authorization and source identity checks remain in the source reader.
Unsupported routes fail admission rather than selecting a pthread service.
The finite-source bridge does not support nested network resources.

These extra engines are installed locally; the standard release packaging does
not yet include them. This is an experimental opt-in, not a default/runtime
support expansion. The [Player benchmark report](../../../docs/JSPI-ASYNCIFY-PLAYER-CPU.md)
records exact qualified fixtures, asset hashes, browser checks and CPU evidence.

Private mpv Player wiring, broad codec and browser coverage, multichannel and
resampling fidelity, physical audio output and latency, long media and memory
pressure remain unqualified. Historical mpv component results above do not
establish those Player capabilities.
