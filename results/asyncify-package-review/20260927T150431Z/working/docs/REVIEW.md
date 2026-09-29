# Demuxe Asyncify review and qualification report
**Review date: September 27, 2026**  
**Disposition: use this corrected research package for local testing; do not deploy it as a completed media engine.**

## 1. What the review establishes
The supplied JSPI/Asyncify investigation was inspected, its immutable package verified, and its original 94/94 expected browser outcomes reproduced before changes. This review then reproduced five previously uncovered defects in setup/host failure handling, fixed them, rebuilt the Wasm fixtures, reran the shared suites, and added continuation-specific fault tests.

The final record is **121/121 expected browser outcomes**: 90 existing ordinary positive cases; 26 additional continuation checks, some deliberately exercising fatal failures; and five negative controls rejected for the intended reason. There are also **58/58 host/build/audit checks** across five suites. These are different kinds of evidence, not 179 full-player tests.

The tests still do **not** initialize a complete libmpv service, produce subtitle pixels, execute FFmpeg media libraries, play audio, or qualify production routing. Earlier language that all major blockers were cleared was too strong. Full Emscripten continuation ownership, runtime state, and real-service behavior remain substantial unqualified gates.

## 2. Reproduced defects and corrections

| Finding | Before review | Correction | Evidence |
|---|---|---|---|
| C-stack layout not validated globally | Two logical slots could claim the same C stack without attachment rejecting it. | Validate every C-stack region at attachment, reject overlaps, and cache immutable validated bounds. | `review-before-fixes.json`; `review-host-after.json` |
| C stacks could overlap saved Asyncify storage | Independent checks did not reject cross-region aliasing. | Compare saved-continuation regions, including guards/metadata, with all C stacks and the current host-SP location. | Same before/after guard records |
| Failed attachment left a partial scheduler open | Missing Asyncify exports threw, but the scheduler was not terminally closed. | Any attachment failure closes its MessageChannel and abandons the partial instance. It cannot run afterward. | Same before/after guard records |
| Standalone FFmpeg could be reused after an unexpected ccall rejection | The next call could enter the same module following a Wasm trap. | Poison on unexpected ccall rejection/trap; reject subsequent entry and C teardown; require Worker/module disposal. Normal negative C results and busy-call rejection do not poison it. | Same before/after records; extra recovery/teardown guards |
| Invalid replacement could strand the current FFmpeg source | Its handle was closed before replacement input was validated. | Validate/set the new source before retiring the old handle; malformed input leaves the existing source usable. | Same before/after guard records |

Additional setup hardening:
- Root tasks must refer to admitted module exports, not arbitrary JavaScript functions.
- One FFmpeg module cannot be bound to two independent owners. A poisoned module cannot be rebound.
- Thread and saved-stack allocation macros have compile-time alignment/capacity checks.
- JSPI export profiles reject wildcards, duplicates, and unreviewed rm_* names.
- Test selectors reject unknown/duplicate backends and suites. Negative mutations must match an exact source anchor.
- Both JSPI APIs must be individually disabled for Asyncify cases. Missing cleanup/runtime evidence is failure, not an assumed zero.
- Result validation reads both the unit suite's `stats` and the range suite's `scheduler` records, and requires C cookie cleanup.
- Static binary audit checks the actual defined memory section, not only import names; it rejects embedded shared memory, memory64, wrong raw-backend artifacts, and absent Asyncify controls.
- The unit-only Blob callback now commits bytes when its logical owner resumes, rather than from an unrelated Promise callback.

These checks guard accidental build/loader mismatches. They do not make an arbitrary hostile module safe or provide a general pthread/TLS implementation.

## 3. Final executed test matrix

| Suite | Result | What actually executes |
|---|---:|---|
| Pinned mpv dispatch/thread pool, JSPI | 15/15 | Real unchanged mpv source; freestanding allocator and compatibility headers |
| Same mpv infrastructure, Asyncify | 15/15 | Same source after actual Binaryen transformation; JSPI APIs absent |
| C range bridge, JSPI | 30/30 | Real candidate C bridge with test-only mpv registration shim |
| Same range bridge, Asyncify | 30/30 | Real transformed bridge; no complete demuxer/service |
| Additional continuation checks, JSPI | 12/12 | New freestanding C correctness/failure oracle |
| Additional continuation checks, Asyncify | 14/14 | Same oracle, plus saved-stack corruption/exhaustion checks |
| Negative controls across suites | 5/5 rejected | Wrong stack switching (2), removed final cancellation validation (2), omitted async-import instrumentation (1) |
| New ABI/FFmpeg host guards | 11/11 | Real Wasm export metadata; ccall test doubles for FFmpeg |
| Retained no-JSPI FFmpeg host tests | 8/8 | ccall doubles with JSPI property access forbidden |
| Build-profile guards | 17/17 | Host flags/source checks, not Emscripten compilation |
| Result-validation guards | 15/15 | Deliberately incomplete/incorrect synthetic test reports |
| Static binary-audit guards | 7/7 | Real module binaries plus malformed/shared-memory negative fixtures |

Primary evidence: `results/review-dual-final.json`, `results/review-continuations.json`, `results/review-host-after.json`, `results/ffmpeg-no-jspi-host.json`, `results/profiles.json`, `results/review-contracts.json`, and `results/review-audit.json`.

Build-to-run hashes and source inputs are recorded in `results/build.json` and the final result files. `verify.py` checks their correspondence.

## 4. Asyncify-specific findings
### Rewind must not replay side effects
The extra C oracle increments counters on the way into and out of a suspending indirect callback. Its ordinary instrumented build passes. A deliberately broken build omits `review_io.value` from the Asyncify import list. That build repeats entry-side effects, and the test rejects it with **“continuation side effects repeated”**.

This is stronger than checking that an export eventually returns the expected integer: a replay can return the right value while duplicating earlier work. The new oracle checks both results and execution counts.

### An unwind return is not completion
The test observes a real pending read and requires the public task promise to remain pending, with the C post-read counter still zero. Only the final resumed execution may resolve it.

### Saved-state and C-stack ownership survive interleaving
Tests cover nested C-stack data, eight logical tasks resuming in a different order, ready-before-unwind completion, duplicate wake rejection, and memory growth while a continuation is saved.

### Faults must kill the instance, not be “recovered” by another mode
A throwing import and a Wasm trap after resumption must close the scheduler. The abandon test requires the pending public operation to reject and verifies that a late wake never runs the C post-read code. Abandoned execution is not reported as completed C teardown.

The normal saved-continuation budget is 64 KiB per task in this experiment. A deliberately undersized 256-byte variant fails during the same nested-stack workload that passes with the normal budget. A separate corrupted-canary case is rejected. **This does not prove memory-safety under every possible overflow:** detection can happen after a write/trap, so the whole instance must be discarded. The approximately 3,904-byte saved-state high-water in the nested test is only an infrastructure diagnostic, not media-stack sizing guidance.

## 5. Toolchain and browser limits
Execution used Chromium **144.0.7559.96**, Clang **17.0.0**, and Binaryen reporting version **133** from the previously supplied main-branch CI artifact. It did **not** use Demuxe's pinned Emscripten **4.0.14** pipeline.

`TOOLCHAIN.lock.json` records binary/archive hashes and the original artifact provenance. Compiler tools are not bundled. A different wasm-opt, compiler, or browser is a new qualification run; a historical pass must not be reused as evidence for it.

All accepted browser cases used `crossOriginIsolated === false`, no exposed `SharedArrayBuffer`, and private `ArrayBuffer` memory. Existing Asyncify cases remove both JSPI APIs individually. The extra Asyncify oracle installs throwing property getters and requires **zero accesses** to either API.

Local HTTP navigation was attempted without changing browser security settings and failed with `net::ERR_BLOCKED_BY_ADMINISTRATOR`. The successful runs use `about:blank` and Blob Workers. This is **not** HTTP Range, CORS, authentication, CSP, origin deployment, Firefox, Safari, mobile, or older-browser qualification. Hiding JSPI in one modern engine does not emulate an older engine's other features.

## 6. Setup to retain
**Raw mpv infrastructure proof:** use the custom continuation driver and one owning Worker. Each logical task has an independent C stack and saved-continuation region. All suspension must pass through the scheduler; external Promise callbacks cannot choose which stack to resume.

**Standalone FFmpeg candidate:** keep the serialized `SingleOwner`, common `EM_ASYNC_JS` read boundary, and ordinary Emscripten async ccall contract. This does not use the raw multi-task mpv continuation driver. Separate final-link profiles select JSPI or Asyncify.

`ffmpeg/scripts/prepare-ffmpeg.py` and `build-ffmpeg.py` are prepared source/build drivers, not full-library-tested integration. They retain fresh output prefixes, pinned source checks, no pthreads, covered indirect callbacks, and separate runtime identity. The saved stack can be changed explicitly with `--saved-stack-bytes`; changing it requires requalification.

**Do not put two continuation owners in one mpv module.** Emscripten's ordinary Asyncify state handling and this raw multi-task driver are not interchangeable. A full mpv port still needs either an explicitly integrated Emscripten fiber backend or a tightly audited raw-driver integration where all suspending imports and runtime callbacks follow one owner.

## 7. What remains before production
1. Build the actual pinned FFmpeg libraries and both suspension variants. Compare probe metadata, packet payload/timestamps, selected-audio output, priming/padding, cancellation and replacement against the pthread baseline.
2. Integrate exactly one continuation owner into the complete Emscripten-built mpv service. Audit constructors, errno/TLS, C++ exceptions, stack metadata, callbacks, and dependency imports.
3. Execute the actual subtitle lifecycle: create, initialize, load, select, render real pixels, seek/replay, replace, cancel, destroy/recreate. Test ASS/SRT/mov_text and bitmap formats independently, plus attached fonts and the existing timing/recovery behavior.
4. Qualify HTTP transport, origin policy, sustained workload, malformed media, resource ceilings, and supported browser/device combinations.
5. Implement mpv audio's non-shared PCM/actual-consumption feedback separately. A successful subtitle or scheduler test proves no audio-clock behavior.
6. Only then add runtime-specific routing/assets and release evidence, preserving the current isolated production route.

The bounded study does not require mpv video output, general full-player compatibility, or a production rewrite. None of those paths was changed here.

## 8. Reading the package
- `README.md`: first commands and scope.
- `docs/BUILD_AND_TEST.md`: reproducible unit and prepared FFmpeg commands.
- `docs/SOURCE_CHANGE_MAP.md`: exact changed files and local integration targets.
- `docs/LOCAL_AGENT_HANDOFF.md`: the next work, with explicit acceptance gates.
- `patches/from-investigation.patch`: source-only delta against the previous investigation, not against production Demuxe.
- `historical/`: prior reports and retained failures. These are not current support claims.
- `MANIFEST.json`, `verify.py`: immutable-package and evidence verification.

Use the complete package rather than merging runtime files blindly into the old full-service loader.

## 9. Primary reference documentation (not execution evidence)
- Emscripten asynchronous code, ordinary-call reentrancy and indirect-call instrumentation: https://emscripten.org/docs/porting/asyncify.html
- Emscripten explicit fibers and separate stack storage: https://emscripten.org/docs/api_reference/fiber.h.html
- Emscripten compiler settings: https://emscripten.org/docs/tools_reference/settings_reference.html
- Pinned runtime source relevant to Demuxe's SDK: https://github.com/emscripten-core/emscripten/blob/4.0.14/src/lib/libasync.js
- Pinned EM_ASYNC_JS header: https://github.com/emscripten-core/emscripten/blob/4.0.14/system/include/emscripten/em_js.h

The live documentation retrieved during this review identifies a newer development SDK, not Demuxe's 4.0.14 pin.
The package tests use Clang/Binaryen directly. Documentation describing support must not be relabeled as a successful pinned-SDK run.
