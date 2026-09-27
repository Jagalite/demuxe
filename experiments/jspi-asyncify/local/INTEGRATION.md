# Local main integration

This import brings the reviewed JSPI/Asyncify components, build tooling, tests and
evidence onto local `main`. It does not register a production Player runtime or
enable automatic selection. The existing Player runtime remains the default.

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

## Production Player wiring still required

1. Add explicit opt-in admission and runtime-specific asset/cache identities.
2. Adapt synchronous service operations to serialized asynchronous calls, including
   seek/flush acknowledgements, immediate source cancellation and terminal fault
   disposal. Only capability failures may select a qualified alternative.
3. Exercise the current Player API through playback, seeks, source replacement,
   cancellation, teardown and recovery with each selected backend.
4. Qualify compressed audio, multichannel/resampling fidelity, physical audio
   output and latency, long media, memory pressure and additional browsers before
   expanding admission or changing defaults.

The experimental component Workers are test hosts. Copying their URLs into the
production Player is not a supported integration. Nested network resources remain
unsupported by the finite-source bridge.
