# Review fixes and COOP/COEP validation

All three findings from `../review-20260927-01/REVIEW.md` are fixed in the
isolated `experiment/jspi-asyncify-20260927` worktree.

- The evidence verifier requires exact case identities and matching fields,
  fixtures, engines, and source snapshots. A repeated reader-failure case cannot
  substitute for cancellation. Audit and glue identities are tied to the build.
- The media server uses the bytes recorded before Chrome starts, then seals its
  cache. Unknown inputs are rejected. Runtime helper and replacement-fixture
  hashes are included.
- Original builds record archive/config hashes, the link command, and the command
  file hash. Relinking verifies these, observes and compares the current toolchain,
  rejects input changes during preflight, and snapshots the relink script. Legacy
  builds lacking this provenance are rejected without backfilling their records.

## Validation

- **49/49 host/regression checks:** 18 Python evidence/build-contract checks,
  1 frozen-input check, and 30 existing host/ABI checks. Compiler calls in the
  Python tests are doubles; actual builds are separately recorded below.
- An actual legacy transcode build was rejected before output creation:
  `legacy-relink-rejection.json`.
- Fresh full JSPI and Asyncify transcode builds: external `transcode-*-04`.
  Fresh verified FLAC-level-0 links: external `transcode-*-05`. Both final Wasm
  files match their historical `-03` binaries byte-for-byte.
- **64/64 fresh Chrome component cases:** remux JSPI 12, remux Asyncify 12,
  PCM24 adaptation 20, AC-3 adaptation 20. These include 48 candidate cases and
  16 pthread reference cases. Cancellation, reader failures, replacement and
  reopening, fatal callbacks, packet timing/payload, and decoded output checks
  remain enforced.
- `summary.json` passed the stricter case/source/build/artifact verifier.
  Its 121 infrastructure results are historical evidence revalidated against
  their source hashes; those browser infrastructure campaigns were not rerun.

## COOP/COEP

Every fresh case records and asserts document response headers, a worker-side
fetch of its script's response headers, page/worker isolation, shared-memory
availability, and the Wasm heap type in Chrome 153.0.8010.53.

| Runtime | COOP | COEP | Isolated / SAB available | Wasm heap |
| --- | --- | --- | --- | --- |
| pthread reference | same-origin | require-corp | Yes | SharedArrayBuffer |
| JSPI | absent | absent | No | ArrayBuffer |
| Asyncify | absent | absent | No | ArrayBuffer |

Asyncify also runs with both JSPI APIs disabled. This tests these two local
header configurations, not all policy combinations or production hosting.

## Completion boundary

The full JSPI/Asyncify mpv engine has **not** been built or run. The completed
media work is the FFmpeg remux/audio-transcode component; the supplied raw
coroutine/continuation infrastructure is a separate test layer. Full mpv
playback, subtitle rendering, non-shared audio output, Player/MSE integration,
other browsers, and release qualification remain unfinished.

Implementation changes and new results remain in this worktree. The main Player
API checkout, production routes, and original evidence were not modified. No
commit or push was made.
