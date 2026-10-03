# Functional-core migration handoff

Updated 2026-10-02. Work in `/Volumes/seed2/Projects/demuxe`, local `main`. User authorized all remaining local implementation, builds, tests and scoped commits; no PR or push. Preserve unrelated untracked Firefox docs/tests and result/research files. Subagents remain active. Do not stop at a checkpoint and call the migration complete.

## Current checkpoint

Checkpoint 22 is the scoped commit containing this handoff. Predecessor `b26826a4` (checkpoint 21); earlier `e9544e02` (20), `4c12b871` (19).

**2,866 tests plus consumer types pass.** Final report: `results/api-stability/gate-unit-all-node-1790990620835/result.json`. Full build/license check, 81-file reusable core boundary, static pure guard and candidate package compilation (194 sources, 224 outputs) pass. Logs: `/tmp/demuxe-functional-twentysecond-{build,pure,package}-final.*` and `/tmp/demuxe-functional-twentysecond-contracts-final.log`.

Integrated source:

- Host queues reserve 128 active/queued calls plus mandatory cleanup; retirement rejects/detaches queued work while native active work stays charged. Worker ingress, copied bytes, native commands, refreshes and presentation fences are bounded.
- All backend RPC profiles, Wasm waiters/attachment retention, actual outstanding MediaCapabilities queries, Native waits/captions/subtitle timeline and Shaka network/caption uncertainty now have explicit admission bounds. Native select/add reserve timeline capacity before readiness; verify/seek keep immediate dispatch.
- Preview/caller/pregenerator acquisition, MediaView/media-element, scrubber image/timer/URL, document presentation and Player element cleanup handle failure and reentry. Shared completion precedes cleanup, successor UI is fenced, independent releases continue after a failure.
- Native EOF pause observations preserve accepted play intent until the boundary owner acts. Both checkpoint 21 and exact `092445fe` baseline reproduce the earlier whole-source-loop bug.
- Deterministic composed effect/resource replay, nine setter contract models, actual preview route isolation, bounded operation/MediaSession state exploration, synthetic full-DTO replay artifacts, literal route eligibility/fallback fixtures, causal shrinking and behavioral mutation controls are integrated. See `FUNCTIONAL-CORE-REPLAY-INVENTORY.md` for finite bounds and explicit exclusions.

## Active remaining architecture work

The expanded audit identified actual production policy still in `web/software-full-engine-worker.js` and `web/filter-retained-engine-worker.js`. These are blockers, not physical-state exceptions. `FUNCTIONAL-CORE-WORKER-SCOPE.md` defines the supported package/worker boundary and separately identifies historical demo/benchmark variants.

- `playback_host`: `/tmp/demuxe-lifetime-containment-work`; owns shared legacy-worker lifecycle/scheduling/command policy and physical worker edits, plus final field/effect inventory. The scanner expanded to 1,163 storage/module bindings across 80 files before supported-scope filtering. Root consumer classifications are `/tmp/demuxe-consumer-field-classification.json`; refresh hashes and newly added receipts before finalizing.
- `subtitle_policy`: coordinates disjoint adaptive-decode and retained-presentation helpers/tests with `playback_host`. Its replay, Shaka bounds, consumer review and reachability patches are already integrated; do not reapply them.
- `worklet_fault`: native build and package/browser qualification under `build/local-functional-final-preflight-b26826a4-20261002`. Clean native checkout `/Volumes/seed2/Projects/demuxe-functional-final-native-b26826a4-20261002`; pinned SDK/tools/source archives shared, build/cache/objects fresh. Pipeline has passed fresh Software, Hybrid, remux and subtitle stages and is compiling private release variants. Native C sources have not changed in checkpoint 22.

After worker integration, rerun appropriate source gates, update explicit source/package inventories, complete the hash-bound field/effect audit and freeze the final source candidate. Then refresh every package wrapper/source companion and qualify exact installed outputs. Architecture and release qualification remain incomplete.

## Evidence and preserved failures

Checkpoint 22 first full gate: `results/api-stability/gate-unit-all-node-1790990163607`. Five subtitle assertions caught an unnecessary microtask introduced while charging readiness; readiness now waits inside only the already-admitted add/select operations. One PiP fake lacked `removeEventListener`; its complete browser API cleanup shape is restored. The metadata inspector process timed out once; all 19 isolated checks and the complete final gate pass. Original failed evidence is retained.

Focused EOF/consumer/presentation run passed 89 checks. Old behavior fails the new EOF pause controls, scrubber acquisition controls and consumer reentry controls; logs and isolated stages remain under `/tmp/demuxe-{boundary-pause,scrubber,consumer-preview,consumer-review,backend-retention}*`. No source changed after the final checkpoint 22 build; later edits are documentation only.

A separately hashed installed six-source EOF overlay passes 30 seconds/two whole-source EOF crossings in Chromium and Firefox with changing pictures, nonzero sampled audio and drained cleanup. A 40-second Chromium close/reopen/pause/seek/preview history also passes. Actual unactivated autoplay/fullscreen rejection followed by real same-stack gesture success passes both browsers. These diagnostic receipts live under the preflight directory and do not qualify the eventual final package. Original preflight core verification passed 227 output hashes and seven SSR imports.

Exact `092445fe` baseline inputs were recovered and hash-verified: 554 outputs. Baseline range-loop output prerequisites pass Native/Hybrid/Software, preserving the separately reproduced whole-source EOF failure. Performance has not been measured while native builds run.

## Final qualification plan

66 top-level execution rows: 12 browser groups, two extended sequence groups, four installed playback rows, six activation rows, six full 3,605-second endurance rows and 36 paired performance trials. Endurance at concurrency two has a three-hour floor; isolated performance and remaining browser gates bring expected post-freeze work to 4–5 hours. Record concurrent workload identity and require maintained cadence validity. Chromium CPU/RSS/CDP and latency are measured; Firefox has latency/progression/resources, and absent CPU data stays unavailable. Native build/package completion precedes final execution.

Required/extended remote CI still needs publication authorization. Complete local equivalents first. Local scope excludes PR/push. Do not run a main build while tests read generated files, including license stamping. Agents stage outside main; root integrates. Never stage results or use broad `git add .`.
