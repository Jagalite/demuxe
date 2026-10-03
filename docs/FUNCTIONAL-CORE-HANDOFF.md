# Functional-core migration handoff

Updated 2026-10-02. Work in `/Volumes/seed2/Projects/demuxe`, local `main`. User authorized all remaining local implementation, builds, tests and scoped commits; no PR or push. Preserve unrelated untracked Firefox docs/tests and result/research files. Subagent source/audit tasks are complete. The native build remains active; full qualification is not complete.

Long checks are explicitly deferred by the user: "dont do long checks right now". Source work, focused checks and the retained-field audit are complete in this checkpoint; do not start endurance, performance, full browser matrices or extended qualification. The already-running clean native build is separate from these checks; preserve its state and do not start a new expensive post-build pipeline.

## Current checkpoint

Checkpoint 23 is the commit containing this handoff; predecessor `e5b88399` is checkpoint 22. The scoped source migration and retained-field review are complete, with focused validation. Long qualification remains deferred by user instruction.

Integrated source since checkpoint 22:

- Production Software/Hybrid workers share pure initialization/source/command/pump/snapshot/PCM and preroll policy, with separate adaptive-decode and retained-presentation owners. Command capacity is 128; retained presentation keeps 16 frame slots and 8 pending requests.
- The retained decoder owns generation, native operation, key/drain/watchdog and frame admission in its pure core. Cancellation releases decoder/frame resources and retains a terminal mailbox responder until engine-owner worker termination, so native destruction can still receive its close acknowledgement; frame receipts are bounded 32 and decode pressure 8.
- I/O initialization, epoch, one physical read, one five-second authorization refresh and pump lifetime are pure. Both scheduling modes fault and clean up consistently. Shared-memory PCM terminal/epoch policy is pure without allocating a new snapshot on stable audio quanta.
- Private audio-worker RPC ingress reserves 128 queued/active obligations and 64 MiB copied payload capacity before capturing messages, with bounded envelope traversal and a reserved shutdown slot. Physical completion releases the slot; terminal retirement does not falsely free ignored native work.
- Native audio synchronously drops superseded resolver associations; private audio coalesces context observations behind one physical write/play lane. ByteReader reserves 128 queue/physical-work slots before closure creation; ignored provider work remains charged until settlement.
- Player play/seek intents reserve 128 combined slots before controller acquisition and queueing. Pause drops retired controller associations synchronously. Metadata inspection reserves 8 reads, 8 batches and 512 KiB before I/O, and keeps the 50 ms parse clock separate from overlapping I/O.
- Remux controller/worker pending operations and requests are bounded 128. Active/releasing worker owners are bounded 128; successful termination returns capacity, failed cleanup retains its receipt even after repeated release calls.
- Shared Shaka runtime caching admits at most 32 load slots and 128 consumers. Canceled fetch/text acquisition stays charged until physical completion. ProviderRuntime canonicalizes declared asset paths and rejects unknown/unqualified paths before caching; its byte/module entries are bounded by the finite manifest.
- YUV renderer construction rolls back listeners, shaders, program and textures. Destruction revokes the physical GL handle before independently releasing resources; late callbacks cannot reuse it. Shader strings are unchanged.
- Explicit beta/provider/core source inventories include all seven new pure helpers. A maintained worker guard covers dormant WebGPU codec assets under the empty qualified registry; activating a codec reopens their migration/qualification work.

Focused validation receipts (local logs):

| Scope | Result | Log |
| --- | --- | --- |
| Worker, PCM, native audio, decoder and WebGPU guard |104 pass | `/tmp/demuxe-functional-worker-audio-focused-final.log` |
| Play/seek bounds, cancellation, operations, legacy workers and metadata inspection |86 pass | `/tmp/demuxe-functional-intent-metadata-focused.log` |
| ByteReader |19 pass | `/tmp/demuxe-functional-byte-reader-focused.log` |
| Remux bounds and actual adapters |38 pass | `/tmp/demuxe-functional-remux-focused-final.log` |
| Private audio-worker ingress |18 pass | `/tmp/demuxe-functional-audio-ingress-focused.log` |
| Provider/Shaka runtime cache bounds |42 pass | `/tmp/demuxe-functional-runtime-cache-focused.log` |
| YUV acquisition/cleanup |11 pass | `/tmp/demuxe-functional-yuv-focused.log` |
| Explicit worker helper package inventories |1 pass | `/tmp/demuxe-functional-worker-assets-final.log` |

Full TypeScript source compilation passed; subsequent remux/worker changes passed targeted compilation. Static pure-source checks passed. Scoped changed source/generated SPDX checks passed. The repository-wide license scan was stopped when it exceeded the requested short-check scope; full package assembly, all-contract rerun and broader qualification remain pending. These focused receipts do not replace checkpoint 22's full 2,866-contract run plus consumer types.

## Post-checkpoint 23 review fixes

Review of `f81360ba` found two worker regressions, repaired in the review-fix commit following that checkpoint. Both Software and Hybrid PCM adapters recheck the native epoch before validating sampled cursor distance, discarding concurrent seek resets while preserving real capacity failures. The retained decoder keeps its single existing mailbox loop after logical cancellation, acknowledges subsequent native close requests, and rejects other work without creating a decoder; engine-owner termination releases the responder. All 46 focused checks pass (`/tmp/demuxe-review-fixed-focused.log`); all four new regression cases fail against `f81360ba` (`/tmp/demuxe-review-pcm-negative.log`, `/tmp/demuxe-review-decoder-negative.log`). The refreshed ownership classifier passes with zero changed sources or pending indexed writes. Long qualification remains deferred.

## Full behavioral re-review after checkpoint 23

The two earlier review fixes are committed as `df196088`. [The full migration re-review](FUNCTIONAL-CORE-REREVIEW.md) compares that candidate with the recorded pre-cutover baseline `092445fe`. It found two further regressions: Hybrid first-generation frame arrival can erase an already-pending native selection, losing the paused startup/seek frame; private playback close during bitmap capture can discard the late bitmap before explicit cleanup. Both regressions are now repaired in the working tree: first-generation admission preserves selections in the current presentation epoch, and retired bitmap captures dispose their late results before rejecting. All 110 focused controls pass; five new regression cases fail against their previous implementations. Generated retained-presentation output and the ownership inventory are refreshed. Full behavioral qualification is still pending. The review also identifies an inherited Shaka authorization-refresh accounting limitation, separately from migration regressions. Long qualification remains deferred.

## Frozen ownership inventory

[The maintained audit](functional-core-audit/README.md) records 871 explicitly reviewed supported fields, 67 reviewed dormant WebGPU fields and 225 historical/development exclusions, with zero pending supported-field annotations. It also records 118 indexed writes and 258 source/policy/packaging hashes. The classifier rejects missing annotations, changed sources (including pure owners) and unreviewed indexed writes. Reproduce with the two commands in that README. Exact receipts: `functional-core-audit/validation-receipt.json` and `/tmp/demuxe-functional-checkpoint23-field-{scan,review}.log`.

The initial name/type-based inventory was triage only; it was replaced with explicit reviewed annotations before this checkpoint. Async/callback lists remain review leads with documented limitations, not a proof about arbitrary aliases, callbacks, third-party internals or native memory. Dormant and historical exclusions are not counted as migrated production policy. Architecture source review does not grant final runtime or release qualification.

## Native build and deferred continuation

The already-running clean native build is under `/Volumes/seed2/Projects/demuxe-functional-final-native-b26826a4-20261002`, with pinned SDK/tools/source archives shared and native object/cache directories fresh. It has passed standard Software, Hybrid, remux and subtitle stages plus private remux/transcode adaptation variants; the private subtitle profile is complete, private audio dependencies are compiling, and playback-full remains. No native C source changed in checkpoints 22–23. Current exact state and the deferred 66-row plan are in `build/local-functional-final-preflight-b26826a4-20261002/deferred-qualification-handoff-cp23.json`.

Do not queue post-build qualification. When the user resumes long checks, refresh package wrappers/source companions from the final source candidate, rerun the complete source/package gates, then qualify those exact installed outputs. No PR/push is authorized.

## Evidence and preserved failures

Checkpoint 23 integration failures are preserved in `/tmp/demuxe-functional-decoder-focused.log` (old VM fixture lacked new pure-owner imports) and `/tmp/demuxe-functional-worker-audio-focused.log` (native source patch had not yet been emitted). The corrected fixtures/generated outputs pass the focused final runs above.

Checkpoint 22 first full gate: `results/api-stability/gate-unit-all-node-1790990163607`. Five subtitle assertions caught an unnecessary microtask introduced while charging readiness; readiness now waits inside only the already-admitted add/select operations. One PiP fake lacked `removeEventListener`; its complete browser API cleanup shape is restored. The metadata inspector process timed out once; all 19 isolated checks and the complete final gate pass. Original failed evidence is retained.

Focused EOF/consumer/presentation run passed 89 checks. Old behavior fails the new EOF pause controls, scrubber acquisition controls and consumer reentry controls; logs and isolated stages remain under `/tmp/demuxe-{boundary-pause,scrubber,consumer-preview,consumer-review,backend-retention}*`. Checkpoint 23 source work follows the final checkpoint 22 build; its focused receipts must not be represented as another complete 2,866-test run.

A separately hashed installed six-source EOF overlay passes 30 seconds/two whole-source EOF crossings in Chromium and Firefox with changing pictures, nonzero sampled audio and drained cleanup. A 40-second Chromium close/reopen/pause/seek/preview history also passes. Actual unactivated autoplay/fullscreen rejection followed by real same-stack gesture success passes both browsers. These diagnostic receipts live under the preflight directory and do not qualify the eventual final package. Original preflight core verification passed 227 output hashes and seven SSR imports.

Exact `092445fe` baseline inputs were recovered and hash-verified: 554 outputs. Baseline range-loop output prerequisites pass Native/Hybrid/Software, preserving the separately reproduced whole-source EOF failure. Performance has not been measured while native builds run.

## Deferred final qualification plan

Do not run this plan until the user resumes long qualification. Previously planned 66 top-level execution rows: 12 browser groups, two extended sequence groups, four installed playback rows, six activation rows, six full 3,605-second endurance rows and 36 paired performance trials. Endurance at concurrency two has a three-hour floor; isolated performance and remaining browser gates bring expected post-freeze work to 4–5 hours. Record concurrent workload identity and require maintained cadence validity. Chromium CPU/RSS/CDP and latency are measured; Firefox has latency/progression/resources, and absent CPU data stays unavailable. Native build/package completion precedes final execution.

Required/extended remote CI still needs publication authorization. Complete local equivalents first. Local scope excludes PR/push. Do not run a main build while tests read generated files, including license stamping. Agents stage outside main; root integrates. Never stage results or use broad `git add .`.
