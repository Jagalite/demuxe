<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Local screening campaign — initial checkpoint

Started 19 September 2026 at source `c5a82ca0346d1e27be8f8007d4a68585ababcb75`, initially clean. No runtime implementation, automatic routing, licensing, commit or publication changes were made. New work consists of this evidence directory and `tests/local-screening-baseline.mjs`.

The supplied reference bundle was extracted under `references/`; every entry in its SHA-256 manifest verified. ZIP SHA-256: `904b0190ce810591ff6130cd642c2ed270d61b4ca844e294df341b54112a6958`. Report identities and the unchanged 17-item queue are in `inventory.jsonl` and `queue.md`. R74 uses the bundled text snapshot, not recovered raw report bytes. Its original evidence TAR remains a pointer. R242-A, R131, R274 and R272 lack their report bytes here and remain identity-unresolved. Other later items are unreviewed.

## Current evidence

- Maintained `npm run build` passed, including TypeScript and license boundaries. An initial attempt failed because this new evidence was under the guide's suggested but unclassified `research/` directory; moving it to the established `results/` boundary fixed that without changing licensing.
- 28 focused contract tests passed. These include asynchronous local-reader epoch retirement, cancellation, source identity separation, admission, and distinctions between prepared and executed output. These are component checks, not an integrated stale-generation fault injection.
- Chrome 152.0.7977.83, macOS 26.5.2 arm64: local `fixtures/example.mp4` direct playback passed startup, seek, EOF and worker cleanup. Requested options were `mode: native`, `nativeRemux: never`; actual plan was `native-direct`. Browser-served JS bytes were checked against local bytes, including the server's virtual index facade. Fixture and served-asset hashes are in the result.
- A deliberate missing-video-observation control suppressed both frame-count advancement and frame callbacks. Playback verification timed out and did not mark the plan verified. This checks missing-output evidence; it does not establish a pixel/PCM wrong-content oracle.
- R40: the maintained component received 81 alternating forward/backward slider input events over animation frames, then one change commit. Backend seek count was zero before commit and one afterward, at exactly 7.3 seconds. Scoped decision: `NO_CURRENT_OPPORTUNITY` for this UI path. Public exact-seek semantics remain unchanged. This does not establish exact covering-frame identity or remux cancellation correctness.
- R02: the direct backend and video element were identical before and after play. Scoped decision: `ALREADY_IMPLEMENTED` for prepared direct-candidate promotion; no broader startup/fallback claim.
- R74: `native/adaptation/flac.h:94` still contains converted-frame staging before FIFO ownership. Optional runtime and admitted fixture corpus are absent, so no stage cost, candidate or performance verdict exists.
- R01: same-source inspection already feeds admission; deep inspection and remux use separate workers. Missing engine-backed fallback baseline prevents measuring duplicated authorized work. No broker or reuse patch was added.

## Reproduce and inspect

Run from the repository root, using a fresh RESULT_ROOT to preserve prior results:

```sh
npm run build
node --test tests/repair-evidence-contracts.mjs tests/runtime-capability-contracts.mjs tests/file-reader.mjs tests/cheap-mp4-probe.mjs tests/plan-admission.mjs tests/seek-boundary-contracts.mjs
RESULT_ROOT=results/local-screening/runs/<fresh-run-id> node tests/local-screening-baseline.mjs
npm run check:licenses
```

The passing browser record is `runs/direct-local-04/result.json`. Build, contract and browser console logs are under `runs/initial-baseline/`. `manifest.json` records source, locks, harness and generated JS hashes. The harness starts its own ephemeral localhost server and browser and closes both.

Earlier runs are retained: `direct.log` failed in the new harness because a virtual server facade was treated as a disk file; `direct-02` correctly exposed the absent remote inspector engine; `direct-local-03` passed the negative control but the positive assertion read a non-enumerable browser object through serialization. The final harness explicitly reads its numeric properties. None of these failed runs contributes positive lifecycle evidence.

## Next ready work and remaining gates

Baseline B0 is partial: integrated stale-generation rejection and independent wrong-content oracles remain. B1 direct is narrowly exercised; remux is blocked. B2 adaptation and B3 ASS are not established. Audio decoded-byte counters do not prove exact samples, speaker output, or physical A/V sync. No benchmarks, survivor combinations, soak or release qualification ran.

Provision the locked SDK/source archive and matching maintained remux/adaptation engines in isolated build outputs; preserve build manifests and do not substitute binaries from historical labs. Generate and identify admitted fixtures using maintained recipes, then establish B2 and profile R74's staging cost. Before timing, declare the complete-session primary metric and worthwhile threshold. R01 needs a matching fallback baseline. Lower-ranked independent audits may proceed in the saved order; no reranking has occurred.

Do not expand automatic admission or remove guards. Each initial decision's exact report hash and reopening condition is in `inventory.jsonl`.
