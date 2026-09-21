<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Granular engine loading: measured feasibility

Run: `evidence/20260921T162900Z-screen-01`. Research only; no experimental engine was installed into the production player. The external user MKV remains outside the repository.

## Outcome

Removing software video decoder registrations makes Hybrid materially smaller, but the unmodified player cannot use that build. Stop this candidate. A lean Hybrid remains worth investigating only after independently registering its browser decoder. True dynamically loaded codec modules are deferred: this run establishes neither their working integration nor a startup benefit.

Metadata stripping is a small, independent packaging opportunity, not a demonstrated solution to multi-second startup. The tested stripped build preserves every executable Wasm section and passes bounded baseline-relative correctness. Neither candidate satisfies the full predeclared size-plus-startup success criterion.

## Measured size

Decimal MB, gzip level 6, not inferred network transfer. The matched full relink is SHA-256 identical to the shipping Hybrid Wasm, eliminating a linker/source baseline mismatch for this screen.

| Variant | Raw bytes | Gzip bytes | Compressed reduction |
|---|---:|---:|---:|
| Shipping / matched baseline | 22,064,233 | 8,128,413 | — |
| Remove name metadata | 21,435,184 | 7,948,071 | 180,342 bytes / 2.22% |
| Remove 268 video decoder registrations | 14,873,103 | 5,829,466 | 2,298,947 bytes / 28.28% |

The lean build retains 229 audio/subtitle/other registrations and uses the same sources, libraries, optimization flags, thread pool and initial memory as the baseline. The full Software fallback remains intact. It is a static reachability experiment, not a working dynamic codec architecture. Savings cannot be claimed for Firefox Software playback, nor added to previous component-study percentages.

## Why the lean build failed

In the frozen mpv `filters/f_decoder_wrapper.c`, `reinit_decoder()` gets candidates through `vd_lavc.add_decoders()`. That enumerates FFmpeg's registered decoders. The `vd_browser.create()` call is inside the resulting loop. Removing the video entries removes the opportunity to call the browser decoder, even when Chrome supports H.264.

Observed result: Hybrid failed with `hybrid mode did not present the requested position`; the player recovered through Software after approximately 26.8 seconds to open / 27.1 seconds to observed playback. This is a failed correctness sample, not an accepted performance benchmark. No repeated lean timing or network benchmarking followed the failure.

A future isolated experiment should give the browser decoder its own explicit codec admission entries, verify context/header construction without a software decoder registration, and retain prompt whole-engine Software fallback. Only then repeat output and lifecycle gates before measuring startup. This requires a source change; deleting codec registrations alone is unsuitable.

## Correctness and harness qualification

Chrome 152.0.7977.83, headed, actual foreground process checked. Synthetic 320×180 H.264/AAC/ASS at 24 fps, 1 kHz audio. Baseline and metadata-stripped build both passed WebCodecs ownership, audio progress/tone, seek/pause/resume, source replacement, injected runtime failure recovery to Software, zero remaining page workers, and no surviving sampled browser processes after close.

Final images match baseline exactly at 1 and 3 seconds. The independent host-FFmpeg RGB oracle has mean absolute error 3.22 and 4.50 in the unoccluded top 60 rows; full-frame subtitle-off MAE at 3 seconds is 3.32 (limit 6). Inverted-picture negative controls fail decisively. Subtitle on/off changed 36,243 pixels in both builds. These are bounded nonregression checks, not full subtitle visual qualification: the captured subtitle overlay has a large black backing area in both baseline and stripped output.

Harness corrections and failures are retained:

- First baseline run completed playback assertions but failed on a missing favicon request. The research server now returns 204 for that request.
- Fixture v1 omitted explicit color metadata and a default subtitle disposition. Automatic selection did not render its subtitles, and unspecified color conversion disagreed with the initial RGB reference. Those failed oracle results remain in `correctness-analysis.json`.
- Fixture v2 declares BT.709 and a default subtitle; the harness explicitly selects subtitle track 1. The initial 120-row comparison still intersected subtitle backing. `correctness-analysis-v2.json` preserves that failure. Final v3 compares an unoccluded region plus the entire subtitle-off frame, retaining the original MAE threshold. No mismatching pixels were used to relax that threshold.
- `passed` in browser result files denotes lifecycle/tone assertions; full picture acceptance additionally requires `correctness-analysis-v3.json`.

Firefox tested the external HEVC Main10/AAC/ASS file with automatic selection: Software played successfully (about 2.00 seconds to observed progress in one functional sample), with zero remaining page workers. Hybrid was skipped by preflight, so this verifies fallback selection, not execution of the lean binary. It does not establish a Firefox speedup. Firefox did not have the Chrome CDP process-exit check.

## Timing method and limits

Only baseline and metadata-stripped builds proceed to performance. Each condition has three sequential pairs in order baseline/stripped, stripped/baseline, baseline/stripped, each in a fresh headed Chrome process. Same external user file; default automatic selection resolves to Hybrid/WebCodecs; no startup preparation. Timing begins immediately before `player.open()` after input selection and ends at open return, play return, or the first observed media time above 0.2 seconds. The last measure includes that intentional progress interval and observation delay; it is not exact physical first-frame latency.

Local trials use localhost, no-store assets and fresh browser profiles. Fresh process does not imply flushed OS, GPU, or browser code caches. Network trials gzip and pace only `.wasm` responses at nominal 10 Mbps with an 80 ms initial delay per response. JS, fonts and media are local; this is not a whole-device network emulation. Server logs record actual served compressed bytes. Browser launch is excluded. Trials are sequential, but unrelated pre-existing browser processes remained on the machine; no claim of an otherwise idle host.

Sample count is exploratory. Warmup/order effects are visible in local results. CPU deltas and end-minus-start aggregate RSS are recorded as coarse proxies, not peak memory, isolated decoder work, or energy measurements. No reliable memory/CPU benefit is inferred.

| Condition | Baseline progress median | Stripped progress median | Observed difference |
|---|---:|---:|---:|
| 10mbps (3 pairs) | 9.529 s | 9.328 s | +0.202 s saved (+2.1%) |
| local (3 pairs) | 1.126 s | 1.445 s | -0.319 s saved (-28.3%) |

All 12 timing runs passed their route/progress/cleanup assertions. The paced-network median difference is 202 ms (2.1%), below the predeclared 10% requirement; local results do not show a gain. These samples do not support a reliable startup improvement. No paired lean-engine timings were accepted.

All progress-time samples, seconds, in chronological order within each variant:
- 10mbps / baseline: 9.529, 9.315, 9.712
- 10mbps / stripped: 9.328, 9.606, 9.094
- local / baseline: 1.563, 1.126, 0.903
- local / stripped: 1.482, 1.445, 0.929

## Architectural research and decision

| Approach | Decision | Reason / next requirement |
|---|---|---|
| Metadata stripping | stop_current_profile as the startup solution | Only 2.22% compressed savings; retain as optional packaging follow-up with external debug symbols. |
| Registry-only lean Hybrid | stop_current_profile | 28.28% smaller compressed, but fails actual Hybrid startup. |
| Browser decoder independent of FFmpeg video registry | pursue as a separate research proposal | Concrete dependency identified; no implementation or speed claim here. |
| True runtime codec modules | inconclusive / defer implementation | Requires a maintained ABI, symbol retention, shared runtime/thread integration and fallback tests. No module-loading benefit measured. |

Independent coarse components already provide useful load boundaries (inspector, Hybrid, Software; optional subtitle/text paths where the playback route permits). Codec-by-codec splitting inside this statically linked mpv/FFmpeg runtime is a deeper change. Loading all eventual modules at page startup would still pay their download/compile cost; it primarily shifts waiting earlier. A genuinely smaller initial set requires selecting only what the media/browser needs and handling later feature/fallback loads.

Emscripten supports main/side modules and runtime `dlopen`, but documents overhead, default dead-code-elimination differences, explicit symbol retention with `MAIN_MODULE=2`, and pthread coordination constraints. That is feasibility documentation, not proof that this player's exact toolchain/runtime benefits. The linked documentation labels itself partly outdated; the experiment used the existing Emscripten 4.0.14 build configuration.

Primary reference: [Emscripten dynamic linking](https://emscripten.org/docs/compiling/Dynamic-Linking.html), accessed 2026-09-21. Repository evidence: frozen mpv source under `snapshots/mpv`, frozen native bridge, registration lists, complete build commands, binary hashes, browser records and screenshots in this run.

No physical A/V, endurance, HDR correctness, arbitrary codec coverage, streaming qualification, or release readiness is asserted. The research item is complete as a bounded screen with a rejected candidate and a small packaging comparison; production integration and broader qualification remain not started.

## Record validation

All 224 manifest artifact hashes and this item's structure passed scoped checks; the repository license checker passed. Production Hybrid and Software Wasm still match the frozen input bytes. The repository-wide research verifier stopped with a TypeError because `research/campaigns/preview-research.json` contains item objects where it expects strings. That unrelated campaign was not modified; no global integrity pass is claimed. See `validation.json`.
