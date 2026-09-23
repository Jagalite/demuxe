<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Maintained player comparison

See [the head-to-head guide](../../docs/HEAD-TO-HEAD.md) for preparation, matrix
selection, acceptance checks, results, performance gates and limitations.

- `assets.lock.json`: exact competitor/runtime dependency identities.
- `setup.py`: isolated current-Demuxe snapshot and synthetic fixture generator.
- `matrix.json`: the original 28 explicitly declared combinations.
- `planned.json`, `expand.py`, `bitmap.py`: the 65 catalogue combinations and original synthetic fixture generators.
- `subtitle-ocr.swift`: rendered text verification through macOS Vision.
- `render-catalogue.py`: refresh README/detailed tables from verified complete outcomes and explicit supplements.
- `adapters.mjs`: public player APIs, marked audio checks, selected-track identity and switching for correctness.
- `run.mjs`: serial runner, fresh outputs, per-case outcomes and gated performance.
- `explain-hybrid.py`: verify retained runs and generate per-row Native rejection/component explanations.
- `probe-hybrid-mse.mjs`: record separate video/audio/combined MSE hints without claiming playback qualification.
- `hls-fallback.mjs`: injected Native HLS rejection followed by real Hybrid output and cleanup.
- `component-captions.mjs`: plain WebVTT cue, selection, cross-backend, malformed-input and lifecycle qualification (optional `remux` argument).
- `component-caption-regressions.mjs`: review regressions for mixed browser/file track identities, trailing cue whitespace, real CSP fallback, cue-mismatch fallback, and terminal cancellation/permission controls.
- `component-performance.mjs`: correctness-gated, three-pair whole-player baseline/candidate comparison; see [component routing](../../docs/COMPONENT-ROUTING.md) for scope and rerun commands.
- `checks.mjs`, `contracts.mjs`: independent marker/range/identity acceptance controls.
- `verify.mjs`: completed-run evidence integrity, without playback.

Do not run performance concurrently with the research agent or other benchmarks.
Do not overwrite a run or substitute old engine binaries to make a blocked case pass.

## Specialist and library playback screening

`prepare-specialist-fixtures.py` admits real TrueHD 7.1, DTS-HD MA 7.1,
E-AC-3/JOC and Dolby Vision 5/8.1 bitstreams only after probing exact profiles,
layouts and DV RPU payloads and decoding the complete derived clip with host
FFmpeg. `prepare-library-fixtures.py` adds nine explicit Main10/audio/subtitle
combinations. It checks audio identities and subtitle codecs and independently
renders the PGS fixtures with host FFmpeg. These use the existing finite playback
routes; no component route is forced in the default comparison.

Run in this order, using fresh paths, before consuming the frozen snapshot:

```sh
python3 tests/head-to-head/fetch-specialist-samples.py build/head-to-head/specialist-sources-new
python3 tests/head-to-head/setup.py --fixtures-from build/head-to-head/assets-cross-player-cpu-01 --output build/head-to-head/assets-specialist-new --lab /path/to/pinned/head-to-head-lab
python3 tests/head-to-head/prepare-specialist-fixtures.py build/head-to-head/assets-specialist-new build/head-to-head/specialist-sources-new
python3 tests/head-to-head/prepare-library-fixtures.py build/head-to-head/assets-specialist-new
node tests/head-to-head/specialist-screen.mjs build/head-to-head/assets-specialist-new results/head-to-head/specialist-new
```

The serial headed Chrome screen observes actual audio energy, visible/changing
frames, pause/resume, rate, forward/backward seeks, EOF and teardown. Host-decoded audio energy validates the seek targets first; DTS uses 12/4 seconds to avoid the source’s silent opening. Synthetic
Main10 cases also require the existing video timeline markers and stereo tones;
ASS/PGS cases require the visible magenta subtitle marker initially and after
seeks. Subtitle absence is a failure even when audio/video work. Each run captures
harness source, fixture probes/provenance, asset hashes, screenshots, requests and
per-case outcomes. Browser processes must actually exit between cases.

These are bounded local-file screens, not CPU benchmarks or HDR/spatial-audio
qualification. TrueHD repeats a ~0.107-second FATE regression sample; DTS-HD repeats
a clean eight-second excerpt. The HDR10 picture is a 320×180 authored PQ/BT.2020-tagged
synthetic pattern with mastering/content-light metadata, not reference movie
imagery. DV video keeps its original in-band parameter-set representation and
RPU data. Library DV cases combine it with copied JOC audio and embedded ASS in
MKV, not HLS or a studio-authored presentation. See [media notices](../../docs/MEDIA-NOTICES.md).

Optional diagnostics use the final arguments `software fixture-id,...` or
`hybrid fixture-id,...`. They are separate evidence and cannot replace the
`auto` results in the README. Import a completed default screen into the CPU
table with `render-native-cpu-table.py --specialist-screen <run>`; playback
screening never manufactures CPU measurements or clears fidelity limitations.

Repeat `--specialist-screen` in chronological order to apply exact-fixture rescreens. Each supplement must contain all four default players for its selected fixtures; forced Software records are rejected by this loader.
