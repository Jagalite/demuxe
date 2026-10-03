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

## Sustained virtual-time regression gate (2026-10-03)

Added `tests/api-stability/playback-soak.mjs` to the maintained core suite. Six deterministic seeds execute 60,000 operation steps and check 452,083 transitions across persistent lifecycle/effect/resource and control histories. Lifecycle timelines span approximately 78 virtual days, including a 49-day idle jump; control timelines span approximately 29 days. Source replacement, close/reopen, pause/resume, delayed and duplicate results, track/settings acceptance and compensation, latest seeks, range stops, loops, cleanup timeout and late cleanup results are checked against independent contractual models. All physical obligations and timers must drain under explicit fair completion. Failure messages retain the seed, configured step count, failing step and bounded input suffix for deterministic reproduction.

The fake clock now dispatches deadlines chronologically, rechecks cancellation after each callback and includes newly scheduled deadlines inside an advance. Its old implementation could fire a canceled timer and miss an intermediate deadline. This is a test infrastructure fix; the campaigns exposed no playback implementation failure. Three deliberate behavioral faults (missing pause retirement, release accounting and rollback effects) are detected. Short histories must reproduce identical accounting.

Focused validation: **112/112 passed**, including the new soak and existing composed replay, replay artifact, setter schedules, effect runtime and resource ledger suites, in approximately 19 seconds. Receipt: `results/api-stability/playback-soak-2026-10-03/result.json`; log: `results/api-stability/playback-soak-2026-10-03/test.log`. Largest measured outstanding sets were 17 logical effects, 14 resources and 31 virtual timers. No full build or browser endurance campaign was run for this test-only change.

These are simulated control/ownership timelines, with synthetic source mode labels and fixed boundary observations. They do not simulate actual decoder/media advancement, browser permissions or event loops, native memory growth, A/V drift, provider networking or weeks of wall-clock playback. Those qualification boundaries remain open.

## Refresh accounting and integrated Player simulation (2026-10-03)

Resolved the inherited Shaka authorization-refresh accounting gap. Physical callback identities now share the request admission budget (32 playback / 4 preview) without double charging active requests. Abort, request deadline and destroy retire forward authority without releasing an unresolved callback's obligation. Only physical success/failure returns capacity; late results cannot publish credentials or retry. The pure state contains identities only. Diagnostics expose pending refreshes and include detached refresh obligations in pending requests.

Added seven public-Player simulation scenarios: advancing position with rate changes and buffering; EOF; overlapping latest seeks, volume and pause; failed settings compensation and track publication; range stops and repeated loops; close/reopen during seek with stale events; pause during physical play; and close during a loop seek. Production command scheduling, listeners, publication, readiness, effect execution and session disposal run against delayed synthetic backend methods. Source construction and routing, browser watchdogs, automatic codec fallback and actual decoding remain outside this fixture. No broad functional-core migration was needed.

Validation: **116/116 focused tests passed**, including 14 new tests; TypeScript validation passed. Two accounting regressions fail against the old adapter (zero reported obligations while a callback remains pending). Receipt and logs: `results/api-stability/refresh-and-media-simulation-2026-10-03/`.

The changed Shaka ownership rows were semantically reviewed and refreshed. The full ownership classifier does **not** pass on current HEAD: it finds pre-existing startup-escalation changes in six sources, seven unannotated fields and five pending indexed-write reviews. The receipt preserves these findings; this follow-up does not certify those unrelated changes. No browser/native endurance run was performed. Changes remain uncommitted.

### Review follow-up

Fixed one inherited runtime error-classification issue and two issues in the new simulation helper. During authorization refresh, abort/deadline rejection previously became a critical HTTP error and could install a terminal authorization error. The adapter now rechecks request cancellation before classifying refresh failure, preserving Shaka OPERATION_ABORTED/TIMEOUT. Accounting still remains charged until the callback physically settles. Both strengthened regressions fail on the pre-review adapter.

The public media simulation now advances position up to each scheduled physical callback and drains Promise continuations before advancing farther. Previously, delayed controls could be applied before accounting for the preceding playback interval. Operation pumping uses this same timeline. Its rejection helper now propagates falsy rejection reasons instead of silently treating them as success. Two deliberate reversions fail the matching regressions.

Review validation: **118/118 focused tests passed**, TypeScript validation passed, and the changed Shaka source/field audit scope has no pending reviews. The full ownership audit still flags the unrelated startup-escalation changes recorded above. Current receipt: `results/api-stability/refresh-and-media-simulation-2026-10-03/review-result.json`. Changes remain uncommitted.

## Seven Player policy gaps migrated (2026-10-03)

Completed all seven primary items in `FUNCTIONAL-CORE-POLICY-GAPS.md`: startup selection/prefetch ownership; play verification and recovery; seek admission and compensation; fault response/recovery phases; settings-driven route transactions; track confirmation; and promotion candidate sequencing. New `player-transport`, `track-confirmation` and `startup` machine domains are in the generated runtime closure. Existing settings, recovery, promotion and Native event-wait owners were extended. Adapters retain host observations, Error objects, physical calls and resource handles.

Review fixed premature automatic-policy exposure during mode replacement (a migration regression; its negative-control test failed before the fix). It also fixed existing duplicate error publication after failed recovery and seek fallback on typed `SOURCE_PERMISSION` / `SOURCE_CHANGED` errors whose messages did not match the legacy text classifier. Pause during fallback/restoration now suppresses any later physical play retry; close during seek compensation prevents resume/fallback. Track timeout preserves previous unconditional timer-failure behavior while observation-before-timeout can still confirm selection. Old constructorless seek fixtures were repaired to use current control/lifecycle owners.

Validation: **297/297 focused tests passed**, with no skips/cancellations, in about 1.5 seconds. TypeScript no-emit, static functional-core boundary and whitespace checks pass. Full current ownership classification passes: **879 supported-runtime fields reviewed, zero changed sources and zero pending indexed writes**. The previously unreviewed startup additions were semantically reviewed; this supersedes the earlier audit-gap note. Historical/development fields remain outside supported-runtime qualification. Receipt: `results/api-stability/policy-migration-2026-10-03/result.json`.

No browser/native endurance or performance campaign was run. The secondary Shaka backend compensation and private-software deadline-capture suggestions remain separate from the seven completed primary items. This is policy ownership and focused behavior evidence, not a claim that all physical playback is pure or fully qualified. Changes remain uncommitted; no push performed.

## Policy review and sequence coverage follow-up (2026-10-03)

Reviewed the seven migrated owners and their adapters. Fixed startup acquisition after destroy/ignored abort, canceled soft-timer acquisition, optional timer failure incorrectly rejecting active load, track confirmation cleanup reentry overriding success, gain evidence after reentrant close, terminal seek-restoration fallback, compensating play after a newer Pause, stale track-policy error publication, and immediate Play promise/evidence reuse across reentrant source replacement. Captured-session fencing now retires transport work outside its explicit selection phase. Track Promise cleanup reentry was introduced by the migration; session fencing strengthens the new owner. The other adapter behaviors were inherited. Several regressions were observed failing on pre-fix generated implementations before passing on the corrected ones.

Added 29 focused tests relative to the preceding 297-test migration receipt. The current combined check passes **340/340**, no skips or cancellations, in approximately 21 seconds (includes existing soak and bounded operation exploration). TypeScript, static core-boundary and ownership audit pass; the audit has 879 reviewed supported fields, zero changed sources and zero pending indexed writes. Receipt: `results/api-stability/policy-review-2026-10-03/result.json`.

Simulation coverage now includes 288 shuffled public-media steps across three seeds, with independently predicted position/rate/volume and owner-drain checks, plus 240 causal recovery schedules replayed twice with duplicate results. Intentional skipped-rate and omitted-pause mutations are detected. The existing six-seed soak still passes 60,000 operations / 452,083 checked transitions over 29–78 virtual days. See the replay inventory for what these fixtures execute and exclude.

Assessment: this is strong focused evidence for control, ownership, compensation and cancellation regressions. It is not sufficient to claim complete playback correctness. The mixed fixture injects accepted sources instead of constructing real routes and suppresses browser background scheduling. Dedicated adapter tests cover selected recovery/promotion/watchdog cases; real-browser route construction, media decoding, A/V drift, network/permission timing and endurance still need runtime qualification. No long browser/endurance checks, commits or pushes were performed.

## Adversarial integration campaign after baseline commit (2026-10-03)

Committed the reviewed migration/simulation baseline as `63d41aba`. The following additional work is uncommitted.

Added 115 adversarial tests: 39 real route-pipeline cases, 35 setting sequences, 26 startup acquisition schedules and 15 overlapping-media cases. The production select/discover/replace/accept/publication and resource-cleanup pipeline now runs in integration fixtures; probe results, admission inventory and physical backends are synthetic. Coverage includes first-candidate failure, pinned rollback, automatic re-enable, public Play/Seek fallback, nine candidate-stage interruption points, controls issued from acceptance callbacks, accepted Close/Open replacement and delayed cleanup. Every route fixture verifies exactly-once session destruction/removal and empty owners after teardown.

The new settings histories include 384 public commands with partial application, rollback/degraded outcomes, queued successors and reentrant method acquisition. New media bursts include 648 commands with normal, zero and jittered effect delays, plus Close at 0/1/5/29/30 ms and reopening with stale events. A deliberately ignored physical pause is detected. Startup sequences shuffle fetch/body/compile completion, timeout/destroy, retry and capacity saturation, including delayed cancellation and cancellation rejection.

These tests exposed and fixed three defect classes: backend method getters could retire work before the returned method was still invoked; HTTP/read failure could release startup ownership before body cancellation settled; and a failed early-deadline timer rearm escaped and lost deadline protection. Settings method invocation now rechecks transaction authority after acquisition. Startup cleanup retains its entry until physical cancellation settles and preserves the original error. A new explicit startup cancel event retires publication authority without freeing unresolved physical work. The getter/response cleanup issues were inherited; deadline rearm handling closes a gap in the newly migrated deadline owner.

Validation: **479/479 focused tests passed**, no skips/cancellations, in approximately 2.2 seconds. TypeScript, static core boundary and the refreshed ownership audit pass (879 supported fields, zero changed sources or pending indexed writes). Receipt: `results/api-stability/adversarial-sequences-2026-10-03/result.json`. No browser/native/endurance campaign or push was performed. The old long virtual soak was not rerun in this focused follow-up.
