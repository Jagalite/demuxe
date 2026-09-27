# Local JSPI / Asyncify component campaign

Dedicated branch: `experiment/jspi-asyncify-20260927`.
Base: `e7a8d02d126e381b50af9836b202f3d5186082ea`.

This directory's parent is a working fork of the reviewed package. The original
`MANIFEST.json`, package docs and original results describe the supplied snapshot;
modified local sources are not covered by that original manifest. The untouched
verified extraction is recorded in `../LOCAL-ORIGIN.json`.

Local records: `../../../results/jspi-asyncify/20260927-01/`.
Builds: `/Volumes/seed2/Projects/demuxe-jspi-asyncify-builds-20260927/`.
Frozen fixtures and pthread engines: `../../../build/jspi-asyncify/frozen/`.

The work is independent of ongoing Player API edits. It does not change public
contracts, Player routing, generated JS, or served production engines. No CPU or
startup benchmark is being run while other development proceeds.

## Changes

- Static Emscripten auditing requires an explicit backend, checks the remux or
  transcode ABI and async read import, and derives Asyncify control facts from
  actual exports. Four Emscripten controls are required; the extra raw-driver
  get-state export remains required only for raw fixture builds.
- The FFmpeg builder passes the chosen backend/profile to the auditor and removes
  obsolete `EMMAKEN_CFLAGS` instead of setting it to an empty string. Configure
  uses an explicit Bash interpreter. Source/tool hashes accompany each build.
- The served pthread adaptation manifest uses FLAC level 0, while the package
  defaults to 5. `ffmpeg/scripts/relink-ffmpeg.py` reuses verified private libraries
  and records a fresh final link at level 0. Initial level-5 binaries and their
  failed packet-timing comparisons remain preserved. No timing assertion was
  relaxed to accept a different encoder configuration.
- Added 11 negative/positive Emscripten ABI checks.
- Added an actual FFmpeg Worker harness with private-memory JSPI/Asyncify and
  isolated pthread modes. Asyncify removes both JSPI APIs. It compares metadata,
  packet timing/payloads, decoded video and PCM, using frozen sources and baseline
  engines. Fault cases cover observed-pending-read cancellation, retained reader
  errors, source replacement/reopening, and terminal output-callback failures.

## Commands

From this worktree, infrastructure builds and host checks use the working package:

```sh
cd experiments/jspi-asyncify
node review/tests/emscripten-audit-guards.mjs
CLANG=/Volumes/seed2/Projects/demuxe/build/emsdk-4.0.14/upstream/bin/clang \
  python3 -B scripts/build-dual.py \
  --wasm-opt /Volumes/seed2/Projects/demuxe/build/emsdk-4.0.14/upstream/bin/wasm-opt
```

Browser runners use the private `build/jspi-asyncify/venv` and
`PLAYWRIGHT_NODEJS_PATH=/Users/jagatranvo/.nvm/versions/node/v23.5.0/bin/node`.
Also set `CHROMIUM_EXECUTABLE` to the installed Google Chrome executable and
`CLANG` as above. Run `scripts/run-dual.py` and `review/run-continuations.py` with
new output names; expected complete counts are 94 and 27.

From the worktree root, after all requested builds exist:

```sh
BUILD_ATTEMPT=02 TRANSCODE_ATTEMPT=03 RUN_NAME=media-components-01 \
  node experiments/jspi-asyncify/ffmpeg/tests/run-media.mjs
```

`PROFILES=remux` can run the remux slice first; `RUNTIMES=pthread` checks the frozen
baseline alone. Candidate comparisons require pthread first in the runtime list.
Each run creates a new result directory and snapshots harness/bridge sources.
Fresh build outputs and their `inputs.json`, commands, logs and build-result
records preserve failed and successful attempts separately.

For the AC-3 slice, set `PROFILES=transcode TRANSCODE_FIXTURE=ac3.mkv`; this
selects FLAC24 and a declared native-reference PCM tolerance of one 24-bit LSB.
Candidate output must still match the pthread PCM and all packet timing exactly.
The PCM24 fixture uses source-integer FLAC and exact source PCM equality. The
final harness retains the source video pixel format, including HEVC 10-bit, in
its offline decode comparison. Video packets are always copied and checked.
The 0/2-second targets test initial seek positioning; uninterrupted playback,
repeated live seeks, and MSE scheduling are not established by this harness.

`local/summarize.py` checks build/source/binary/result correspondence. The original
`results/jspi-asyncify/20260927-01/summary.json` is historical. Use the explicit
follow-up command below to verify the corrected campaign; it checks exact case
identities and matching artifacts without rewriting earlier records.

Actual mpv continuation ownership and subtitle rendering now have a separate
[17-case component qualification](../mpv/README.md), followed by a restricted
private-memory PCM/AudioWorklet audio campaign. Player integration, general audio,
multi-browser coverage and release qualification remain separate.

## Review fixes and COOP/COEP coverage

The follow-up verifier requires exact case identities, fixture assignments,
engine sets, and source snapshots. Version 2 media records also require document
and worker COOP/COEP observations, page/worker isolation, and hashes for replacement
fixtures and the video-codec helper. The server seals its input cache before
starting Chrome and serves only those recorded bytes.

Chrome coverage uses two environments: pthread with `COOP: same-origin` and
`COEP: require-corp`, and JSPI/Asyncify with both headers absent. Each case checks
the received headers, `crossOriginIsolated`, `SharedArrayBuffer` availability, and
the Wasm heap type. Asyncify additionally runs with both JSPI APIs disabled.
These are local component checks, not a production deployment/header audit or
coverage of every policy combination or browser.

The builder now records the original archive/config hashes and link command.
Relinking verifies those inputs and the current toolchain, and saves its own
script in the output prefix. Legacy builds without these records are rejected;
their missing provenance is never backfilled. Fresh transcode `-04` builds and
level-0 `-05` links exercise the corrected path. Earlier runs stay historical.

Regression checks:

```sh
python3 -B experiments/jspi-asyncify/local/test_review_fixes.py
node --test experiments/jspi-asyncify/ffmpeg/tests/frozen-inputs.test.mjs
```

The follow-up campaigns use `BUILD_ATTEMPT=02 TRANSCODE_ATTEMPT=05`, with the
same four slices as before and distinct `media-*-fix-01` result directories.
Verify those records without overwriting the historical summary:

```sh
python3 -B experiments/jspi-asyncify/local/summarize.py \
  --transcode-attempt 05 \
  --media-runs media-remux-jspi-fix-01 media-remux-asyncify-fix-01 \
    media-transcode-pcm-fix-01 media-transcode-ac3-fix-01 \
  --output results/jspi-asyncify/fix-20260927-01/summary.json
```
