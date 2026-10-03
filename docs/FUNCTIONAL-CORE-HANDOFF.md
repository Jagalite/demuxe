# Functional-core migration handoff

Updated 2026-10-02. Work in `/Volumes/seed2/Projects/demuxe`, local `main`. Local builds/tests and scoped commits are authorized; no PR or push. Preserve unrelated untracked Firefox docs/tests and all result/research files. Subagents are authorized; all stages described below are integrated and agents are finished.

## Current checkpoint

Checkpoint 21 is the current scoped commit containing this handoff. Predecessors: `4c12b871` (checkpoint 19), `e9544e02` (checkpoint 20), `ad611218` (checkpoint 18).

**2,712 tests plus consumer types pass.** Report: `results/api-stability/gate-unit-all-node-1790987837212/result.json`. Full build/license boundaries (81 reusable source/output files), static pure guard and candidate package compilation (194 sources, 224 outputs) pass. Architecture and v1 qualification remain incomplete.

Integrated work:

- Resource reservation precedes Player backend/surface construction; late acquisition and cleanup retain the original deadline/accounting, including reentrant physical-handle publication.
- Lower subtitle worker composes lifecycle/RPC/refresh/open deadlines, timeline/selection/completeness, visual deadlines and attachment budgets. Failed physical/native attachment acquisition rolls back or faults the lifetime while retaining close cleanup.
- Lower playback host owns creation/retirement, preroll, source failure, render invalidation and event budgets; native destruction is recorded before reentrant retirement checks.
- Selective worklet owns lifetime/header identity with scalar cadence/admission policy; physical DSP cursors remain mutable. Review fixed callback-triggered output revocation and unsigned cursor wrap.
- Player Session fault identity belongs to accepted/candidate source owners; original Errors remain in a WeakMap. Nested dispatch, retirement, cancelled-command observations and serial exhaustion are covered.
- Remux deployment has one composed selection; runtime is derived. Provider callbacks and preparation allocation/publication use operation/revision fences.
- Promotion timer/controller, track-confirmation waits, Player observation listeners and Native constructor listeners now contain failed/reentrant acquisition and independent cleanup. Physical listener-map receipt identity does not replace pure playback authority.

## Evidence and preserved failures

Checkpoint 19 gate: `results/api-stability/gate-unit-all-node-1790986895108` (2,581 tests plus types). Checkpoint 20 gate: `results/api-stability/gate-unit-all-node-1790987286138` (2,654 plus types).

Checkpoint 21 first gate: `results/api-stability/gate-unit-all-node-1790987767581` (seven obsolete fixture failures). Recovery/prototype fixtures now initialize/preserve deployment state; listener rollback assertion checks removed entry. All original route/retry/error assertions remain. Focused repair passes 22 checks; final complete gate passes above.

Logs: `/tmp/demuxe-functional-twentyfirst-{build,pure,contracts-final}.log`; `/tmp/demuxe-functional-twentyfirst-package.json` is large, print counts only. Test-only fixture repairs followed the final source build; no source changed after the successful build.

Selective synthetic receipt: `/tmp/demuxe-selective-worklet-comparison.json` binds reviewed source hashes. 36 differential histories / 7,200 steps and allocation probes pass. Median Node/V8 callback cost before→after: stereo 2.410→3.479 us, six channels 3.190→4.279 us, eight channels 3.687→4.892 us. This overhead is not browser audio or whole-player CPU qualification. Prior receipt retained as `...-comparison-before-review.json`.

Completed isolated stages remain in `/tmp/demuxe-playback-host-work`, `/tmp/demuxe-selective-worklet-work`, `/tmp/demuxe-subtitle-worker-policy-work`, `/tmp/demuxe-player-fault-work`, `/tmp/demuxe-deployment-selection-work`, `/tmp/demuxe-promotion-acquisition-work`, `/tmp/demuxe-backend-acquisition-work`. They contain intermediate baselines/dependency copies; do not recopy over main. Old-control and focused logs are under `/tmp/demuxe-{deployment,promotion-acquisition,backend-acquisition,player-fault}*` and referenced by the migration plan.

## Next work and remaining gates

1. Complete the field/effect/resource ownership inventory and retained-state bounds. The ownership document now records scoped checkpoint 19–21 bounds and explicit physical/DSP exceptions; it is not an exhaustive whole-stack proof. Domain-specific effect interpreters remain outside the generic executor, and lower-host queue/caller containment needs whole-stack audit.
2. Complete composed replay and causal schedule exploration, independent reference models, shrinking, mutations, transition/pair coverage and resource liveness assumptions. Bounded sanitized production traces intentionally omit private payloads and are not exact external replay.
3. Qualify the exact final installed package and supported browsers with actual audio/video output, preview/activation/permission/cleanup histories, long sessions and performance/allocation comparisons. Earlier frozen receipts and Node/V8 probes do not qualify this candidate.
4. Run required/extended CI when publication is authorized. This task remains local main with no PR/push authorization.

References: `docs/FUNCTIONAL-CORE-MIGRATION-PLAN.md` and `docs/FUNCTIONAL-CORE-OWNERSHIP.md`. Never run a main build while tests read generated files, including license stamping. Agents must stage outside main; root integrates reviewed slices and inventories. Do not stage results or use broad `git add .`.
