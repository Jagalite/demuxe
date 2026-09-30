# Asyncify package intake and integration readiness

Reviewed 2026-09-27 against `/Volumes/seed2/Projects/demuxe`, initially at `e7a8d02d126e381b50af9836b202f3d5186082ea` (main, dirty shared checkout).

Disposition: ready for isolated experimental implementation and testing. Not ready to merge, select in production, or deploy. No production sources, routing, served engines, or existing edits were changed by this review. No full compilation, browser run, or benchmark was performed.

## Preserved inputs and local evidence

- `demuxe-asyncify-reviewed/`: untouched 115-file archive extraction; verifier covers 114 manifest entries plus the manifest itself.
- `working/`: disposable working copy, with fresh host-check outputs. Do not run the immutable verifier against this modified copy.
- `SOURCE_CHANGES.attached.md`: separate supplied change map.
- `intake.json`: archive SHA-256, original path, checkout HEAD and extraction location.
- `checkout-status.txt`: initial shared-checkout status. Other work was already in progress; recheck it before integration.
- `local-checks/commands.json` and numbered logs: exact executed verification/host commands and statuses.
- `local-checks/preflight.json`: 32 source/build/patch comparisons, archive hashes, tool identities and versions.
- `local-checks/emscripten-audit-gap.json`: locally reproduced additional audit finding.

| Check | Current local outcome | Limit |
|---|---|---|
| Untouched package verifier | Pass, including final recheck | Verifies supplied records; does not rerun their browsers |
| FFmpeg no-JSPI host contract | 8/8 | ccall doubles |
| Scheduler ABI / FFmpeg host guards | 11/11 | Actual Wasm metadata plus ccall doubles |
| Binary audit guards | 7/7 | Raw Wasm guards; see Emscripten gap below |
| Build-profile/source guards | 17/17 | No actual Emscripten compilation |
| Result-contract guards | 15/15 | Synthetic result validation |
| Pinned input compatibility | 32/32 files identical | At preflight time, not a freeze of concurrent work |
| FFmpeg archives | Both match source lock | No library build |
| Supplied browser evidence | 121 expected outcomes verified in package | Historical package runs; NOT locally rerun |

## Review finding requiring hardening

**P2: Emscripten binary audit does not establish the requested runtime or remux ABI.**

`demuxe-asyncify-reviewed/scripts/audit-wasm.mjs:34` limits export/instrumentation checks to `raw`. Line 42 returns `asyncifyControls: asyncify`, which reflects a caller flag, not observed exports. `ffmpeg/scripts/build-ffmpeg.py:38` invokes the auditor with `--emscripten` and does not pass the selected suspension backend.

Reproduction using delivered binaries: `audit(rawFixture, {raw:false, asyncify:true})` succeeds, reports Asyncify controls true, and has no Asyncify or rm_* exports. Conversely the transformed fixture passes the default Emscripten audit while reporting controls false. See the saved JSON. This does not prove the builder produces a wrong binary; it proves this audit cannot detect such a mismatch.

Before trusting a built artifact, derive observed control/import/export facts from the binary, validate the remux ABI and selected backend with the pinned toolchain's actual export conventions, pass the backend from the builder, and add wrong-backend/missing-ABI negative cases. JSPI glue behavior also needs a runtime oracle; private memory alone cannot establish it. Preserve the raw-fixture audit tests. The package remains untouched so the finding is reviewable against the delivered evidence.

## Integration boundaries confirmed in current source

1. **FFmpeg is the first viable integration slice.** The pinned commit `a563f34571f6d319c8a919045b50920624710b00` exists. Current remux source, adaptation header, source lock, two build scripts and all 27 FFmpeg patches match it (32 files total). The exact synchronous-read patch anchor matches once. Both required archives are present and hash-correct. No rebase or guessed source substitution is needed for this slice as of preflight.
2. **The production worker cannot load these engines unchanged.** `web/native-remux-worker.js` requires isolation, uses `engine.io` and synchronous `_rm_*` calls. An experimental worker must await the single-owner bridge calls, initialize existing `emit`, `raps`, `tracks`, and `parseVP9` hooks, preserve fragment/queue budgets, and propagate source errors. Cancellation must remain reachable while an operation awaits a read; do not route cancellation through the worker's ordinary busy-operation rejection. On a poisoned module, terminate/dispose it; do not retry or perform C cleanup.
3. **Full mpv continuation ownership is not implemented.** The raw scheduler's passing dispatch/thread-pool cases do not establish Emscripten runtime, TLS/errno, constructors, callbacks, or full libmpv behavior. Use one explicit continuation owner. Do not insert the raw Asyncify driver into Emscripten's ordinary Asyncify runtime.
4. **Subtitle service qualification is absent.** Preserve the current subtitle service and source transport behavior. Require actual ASS pixels, a second cue, backward seek/replay, source replacement, cancellation after an observed pending read, destroy/recreate, and zero audio/video chains. Fonts, SRT/mov_text, and bitmap recovery are independent cases.
5. **Non-shared mpv audio is absent.** PCM transport, bounded queues, epochs and a clock based on actual consumption need their own implementation and qualification. Selected-audio FFmpeg transcoding is a separate component and does not prove this path.
6. **Production currently intentionally excludes JSPI/Asyncify.** This is confirmed in `docs/NON-ISOLATED-REMUX.md` and isolation checks in the current playback plans. Any later admission needs explicit component/runtime/build qualification and distinct asset/cache identities. The supplied delta applies to a previous research package, not this checkout.

## Local prerequisites

- Python 3.14.6 and Node 23.5.0 available. Node Playwright and Google Chrome exist; Python Playwright is absent.
- SDK path `build/emsdk-4.0.14` resolves to a shared SDK under another checkout. Do not modify it or use its shared cache for experimental builds; the prepared FFmpeg builder already sets a separate cache/config in each output.
- Local SDK identifies Emscripten 4.0.14, Clang 22.0.0git, and Binaryen 123. Package artifacts used Clang 17 and Binaryen 133. Rebuilding with this SDK is a new toolchain qualification, not reproduction of the recorded compiler identity. Local browser version is not yet recorded because no browser was launched.
- Use a private Python virtual environment for the supplied runners. Record the installed Playwright version and browser version in the new campaign. Do not overwrite original package evidence.

## Ordered integration and testing gates

1. Harden the Emscripten audit in a working copy and test wrong-artifact rejection. Rerun all 58 existing host checks.
2. Set explicit SDK Clang/wasm-opt paths. Build all nine raw fixtures in `working/`; run both browser suites (94 and 27 expected outcomes). Preserve local tool/source/binary hashes and failed runs. Do not relabel package hashes as locally rebuilt artifacts.
3. Prepare four fresh external prefixes: remux/JSPI, remux/Asyncify, transcode/JSPI, transcode/Asyncify. Build serially with bounded jobs. A build-only success remains a build-only success.
4. Implement an experimental finite-source Worker harness around `createFFmpegBridge`. First prove actual probe/open/start/step/close with captured fragments. Test non-isolated HTTP/Blob contexts; forbid both JSPI APIs in Asyncify workers. Record memory type and actual runtime identity.
5. Compare the same hashed fixtures with a frozen current pthread baseline: probe metadata, selected packet hashes and timestamps, container output, decoded PCM under a declared precision policy, priming/padding, alternate tracks, forward/backward seeks and EOF. Preserve native video; no video transcode scope.
6. Exercise short/failed/late reads, authenticated ranges, source identity changes, cancellation after a real pending read, replacement, duplicate operations, traps and repeated teardown/recreation. Preserve original source failures for classification, prohibit fallback on arbitrary errors, and separate abandoned execution from completed C cleanup.
7. Only after component correctness, add an isolated experimental player integration and run existing routing/lifecycle/output checks. Then pursue subtitle-service continuation work. Keep mpv audio separately gated.
8. After correctness and deployment/browser coverage, measure startup, memory and CPU on matched assets/browser/fixture campaigns. No performance claim follows from current checks.

Useful existing oracles (require adaptation to the experimental harness; none is a drop-in non-isolated qualification): `tests/remux-output-identity.mjs`, `tests/remux-profiles.mjs`, `tests/remux-pthread.mjs`, `tests/audio-adaptation.mjs`, `tests/audio-adaptation-lifecycle.mjs`, `tests/audio-transcode-browser.mjs`, `tests/audio-transcode-tail-browser.mjs`, `tests/mpv-subtitle-service.mjs`, `tests/mpv-subtitle-adverse.mjs`, and `tests/runtime-isolation.mjs`. Some suites generate fixtures or start servers; inspect and freeze their inputs before a campaign. The adaptation suites expose `ENGINE_BUILD` / `REMUX_WORKER` hooks, but these still need the candidate source/worker contract and suitable origin setup.

See `RUNBOOK.md` for exact next-stage setup/build commands. Missing actual-media harness and full-service adapters remain implementation work, not a permission or dependency-download issue.
