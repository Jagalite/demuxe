<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Checkpoint the software decoder inside a GOP

Full identity: `R123.checkpoint-the-software-decoder-inside-a-gop`.

Current decision: **pursue** (source_audit_with_retained_component_evidence).

Prior component-scoped pursue remains unchanged. Whole-player readiness: Not a JS policy or existing player ABI toggle. Faithful integration needs decoder-internal safe-boundary state plus demux position, mpv decode/filter/output queues, A/V clocks, cancellation and retained checkpoint lifetime. Existing research wrapper only owns a standalone single-thread AVC decoder. Narrow optional preview caching or already-pending batching has less decoder-internal integration burden when those requested workloads exist.

Next action: A measured user workload repeatedly seeks inside the same eligible software-decoded GOP, ordinary preview reuse/batching does not meet that request, and profiling shows decoder replay dominates enough to repay internal integration and retained-state cost.

## Stages

| Stage | Status | Basis |
|---|---|---|
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | Actual codec-aware retained/rebased state copier wrapped by versioned in-process handle; no raw context memcpy. |
| screen | passed | Checkpoint inside one GOP restores repeated suffixes after original decoder continuation. |
| correctness | passed | 3x30 full frames/PTS exact per7paired jobs; source/runtime/owner/version/cut and dropped-handle controls; all owned contexts retired. |
| performance | passed | Prepared-runtime complete3scrub job including checkpoint construction median16.57% faster;95% paired-bootstrap saving1.565–22.23%; cold startup variability kept separate. |
| results | passed | Prior component-scoped pursue remains unchanged. Whole-player readiness: Not a JS policy or existing player ABI toggle. Faithful integration needs decoder-internal safe-boundary state plus demux position, mpv decode/filter/output queues, A/V clocks, cancellation and retained checkpoint lifetime. Existing research wrapper only owns a standalone single-thread AVC decoder. Narrow optional preview caching or already-pending batching has less decoder-internal integration burden when those requested workloads exist. |
| decision | passed | Prior component-scoped pursue remains unchanged. Whole-player readiness: Not a JS policy or existing player ABI toggle. Faithful integration needs decoder-internal safe-boundary state plus demux position, mpv decode/filter/output queues, A/V clocks, cancellation and retained checkpoint lifetime. Existing research wrapper only owns a standalone single-thread AVC decoder. Narrow optional preview caching or already-pending batching has less decoder-internal integration burden when those requested workloads exist. |

[New run](../../shared/runs/20260920T130952Z-whole-player-readiness-audit/run.json) · [Evidence index](evidence/index.json) · [Complete history](history.jsonl) · [Item contract](item.json)
