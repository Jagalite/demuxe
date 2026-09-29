# Build and testing setup

## 1. Preserve the evidence copy
Extract `Demuxe_Asyncify_Reviewed_Package.zip` and run:
```sh
cd demuxe-asyncify-reviewed
python3 -B verify.py
```
Keep this extraction unchanged. Create a second copy to compile and run tests. The verifier deliberately rejects
changed or untracked files in the evidence snapshot; it never regenerates hashes to bless local changes.

The recorded scope is infrastructure. Nothing in these commands publishes packages, modifies Git branches,
or overwrites production Demuxe assets.

## 2. Dependencies for the executable infrastructure tests
Tested environment: Python 3.13, Node 22, Clang/wasm-ld 17, Binaryen 133, Python Playwright and Chromium 144.
Python 3.12+ is needed by the prepared extraction scripts. A `wasm-opt` built with Asyncify support is required for rebuilding.
`TOOLCHAIN.lock.json` records the exact original artifact and tool hashes. Tools themselves are not bundled.

The main build driver sets `LD_LIBRARY_PATH` for a Binaryen distribution with adjacent `lib/`.
Use your operating system's appropriate distribution. Different versions/platforms require a fresh qualification record.
The existing Emscripten 4.0.14 SDK's wasm-opt is not assumed equivalent to the Binaryen CI artifact used here.

Set paths, then build the fixtures in the working copy:
```sh
export CLANG="/absolute/path/to/clang"
export CHROMIUM_EXECUTABLE="/absolute/path/to/chromium"
export WASM_OPT="/absolute/path/to/binaryen/bin/wasm-opt"

python3 -B scripts/build-dual.py --wasm-opt "$WASM_OPT"
```
This compiles the mpv infrastructure, C source bridge and additional continuation oracle. It creates nine Wasm files
including deliberately broken test inputs, audits their actual memory/exports, and writes `results/build.json`.
It does not use Emscripten or media libraries.

## 3. Browser checks
```sh
python3 -B scripts/run-dual.py --output local-dual.json
python3 -B review/run-continuations.py --output local-continuations.json
```
Expected complete-run outcomes: 94/94 and 27/27. Both commands return nonzero on an unexpected failure.
The first includes 15 mpv and 30 source-bridge cases per backend plus four negatives. The second includes additional
continuation correctness/failure tests plus the omitted-import negative. Some passing checks intentionally provoke a trap
and require terminal disposal; they are not successful media operations.

For a bounded diagnostic:
```sh
python3 -B scripts/run-dual.py --backends asyncify --suites range --filter memory-growth --output local-filtered.json
```
A filtered run is not full qualification. Unknown/duplicate backend or suite names are rejected.
The Chromium runner uses `--no-sandbox` for the container environment, but does not disable web security or bypass
origin/isolation policy. In this delivered runner, the successful transport is explicitly `about:blank` plus Blob Worker.
HTTP-origin and actual network-range testing are separate gates.

## 4. Host/build guards
```sh
node ffmpeg/tests/no-jspi-host.mjs
node review/tests/host-guards.mjs
node review/tests/audit-guards.mjs
python3 -B scripts/test-profiles.py
python3 -B review/test-result-contract.py
```
Expected counts are 8, 11, 7, 17 and 15, respectively. FFmpeg host cases use ccall doubles.
The exact recorded commands/results are in `results/`; do not relabel them as actual library execution.

The static audit can also be invoked independently:
```sh
node scripts/audit-wasm.mjs artifacts/continuation-probe.asyncify.wasm --asyncify
```
It inspects the defined Wasm memory section as well as imports/exports. Absence of pthread imports alone is insufficient
to prove private memory.

## 5. Actual FFmpeg build preparation — NOT qualified here
This is a separate local integration step. It requires a real Demuxe Git checkout containing the pinned commit
`a563f34571f6d319c8a919045b50920624710b00`, verified archives from `sources.lock.json` under `build/downloads`,
Emscripten 4.0.14, make, patch, Git, Node, and the host build tools.

Use a NEW output path outside both the repository and this package:
```sh
export DEMUXE_REPO="/absolute/path/to/demuxe"
export DEMUXE_SDK="$DEMUXE_REPO/build/emsdk-4.0.14"
export OUT="$HOME/tmp/demuxe-ffmpeg-asyncify-remux-review"

python3 -B ffmpeg/scripts/prepare-ffmpeg.py \
  --repo "$DEMUXE_REPO" --out "$OUT" \
  --profile remux --suspension asyncify

python3 -B "$OUT/build-ffmpeg.py" \
  --sdk "$DEMUXE_SDK" --jobs 4 --saved-stack-bytes 65536
```
Run independent fresh outputs for `--suspension jspi` and for `--profile transcode`.
The saved-stack option is an explicit initial budget, not a performance or full-media safety guarantee.
The ordinary C data stack and Asyncify saved-state budget are different resources.

The source patch uses one `EM_ASYNC_JS` read callback. The shared JavaScript wrapper uses one in-flight `ccall`
with `{async:true}`. It does not use the raw cooperative mpv scheduler.
Indirect callback instrumentation stays enabled. The new static auditor is copied into the prepared directory.

**A `build_completed_only` result is not a media pass.** This package does not supply a completed actual-FFmpeg
media test runner or production worker integration. The local agent must bind the experimental engine to the existing
qualification fixtures and compare metadata, packet/timestamp/PCM output and lifecycle behavior against the pthread baseline.
Do not silently substitute another source revision if the Git pin or archive is absent.

## 6. Actual mpv integration — still required
Do not change the previous loader's backend string to `asyncify` and assume this raw driver is now integrated.
Choose and implement one Emscripten-compatible continuation owner. Audit runtime callbacks, C++ exceptions,
errno/TLS, stack metadata and initialization. Then build fresh non-threaded dependencies and the restricted subtitle service.

The first real-service oracle must include actual ASS pixels and seek/source replacement, not just initialization.
Bitmap subtitles, fonts/attachments, delayed network reads and audio are separate qualifications.
Keep all production isolated routing unchanged while doing this work.

## 7. Required local result record
Record source and patch hashes, SDK and Binaryen versions, compiler/link flags, browser/OS, Wasm/glue hashes,
Worker-side isolation/memory/JSPI facts, declared fixture identities, exact positive/negative oracles,
and whether C actually completed or was abandoned. Keep setup failure separate from media incompatibility.
Do not reuse evidence from one suspension variant to admit the other.
