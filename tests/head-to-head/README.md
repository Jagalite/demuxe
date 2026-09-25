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
- `release-auto-report.py`: merges frozen Auto runs, bounded specialist screens and failed-player CPU diagnostics without promoting a screen or failure into a full pass.
- `pack-release-evidence.py`: uses `zstd` to store losslessly compressed run summaries with original and archive hashes beside the release report; local screenshots and full run folders remain available for deeper inspection.
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

These are bounded local-fixture URL screens, not HDR/spatial-audio qualification.
The optional final `cpu1`, `cpu2` or `cpu3` argument records one 5-second warmup
plus 20-second whole-Chrome CPU window per case, with normal-progress and stable
process-ID gates. Run all three orders for a screened CPU median. A failed case
keeps its failure and any CPU observation is diagnostic only. The `competitors`
lane screens only default Movi and AVPlayer, including a CPU attempt after a
failed screen. The `--specialist-from` option to `setup.py` imports an existing
specialist catalogue only after its bitstreams match the copied fixture hashes.
TrueHD repeats a ~0.107-second FATE regression sample; DTS-HD repeats
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

For the ordinary marked catalogue, `run.mjs --screened-cpu` accepts only a
matching bounded Demuxe correctness screen and retains `blocked` status while
recording three 20-second CPU windows. `--diagnostic-failed-cpu` accepts only
matching failed Movi/AVPlayer correctness cases; its one-round whole-Chrome
window is always labeled failed and excluded from efficiency comparisons.

Repeat `--specialist-screen` in chronological order to apply exact-fixture rescreens. Each supplement must contain all four default players for its selected fixtures; forced Software records are rejected by this loader.
