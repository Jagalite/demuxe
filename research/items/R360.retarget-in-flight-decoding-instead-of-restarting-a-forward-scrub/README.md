<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Retarget in-flight decoding instead of restarting a forward scrub

Disposition: **inconclusive**. correctness: **passed**, performance: **failed**.

An actual720p48-picture closed-GOP WebCodecs owner continues already-started forward targets35→40→47. Every timed retarget occurred while required output was still in flight. Target pixels and PTS match independent FFmpeg I420; backward and source-epoch changes restart, delayed old frame cannot publish, all frames/decoders close. Candidate submits48 packets in one decoder versus125 packets in three restarting owners. Nine alternating whole-owner pairs include setup, scheduled requests, decode, copy/hash, flush and teardown: baseline69.922ms, candidate65.978ms, saving5.64% with95%CI[-5.69956277294843, 14.488591025058795]; lower10%gate fails. Preserve variance and do not infer latency value from fewer submissions alone. The earlier broad absence-of-scrub-workload statement is narrowed: maintained component/custom-controls commits onchange, but legacy web/index.html and software-full.html issue oninput seeks. This research adapter is not integrated into that software owner; coalescing unstarted requests remains cheaper. Source replacement control uses a new epoch over identical encoded bytes; no cross-codec or B-picture qualification. Concurrent host load and warm browser limit extrapolation.

Next: Reopen with a concrete owner that receives already-started forward requests and a representative timed trace. Preserve coalescing for unstarted input; independently validate any new sample reordering, source/config transition, or compressed dependency shape.

[Current record](item.json) · [History](history.jsonl) · [Run analysis](evidence/20260919T214730Z-retarget/analysis.md)

[Fixture provenance metadata amendment](../../shared/runs/20260919T220430Z-presentation-provenance-amendment/analysis.md); output and gate decisions unchanged.

## Ecosystem follow-up EB06

Evaluated at `20260922T131542Z-ecosystem-evaluation`: **no_new_work_current_scope**. [Assessment](evidence/20260922T131542Z-ecosystem-evaluation/evaluation.json) · [Shared report](../../shared/runs/20260922T131542Z-ecosystem-evaluation/REPORT.md).

The inspected dedicated worker queues frames and copies on consumer operation 4 rather than on decoder output; generation changes close stale queued frames. Preview jobs cancel/coalesce. This does not qualify every shipped engine or a new lazy GPU presenter, and R360's prior performance gate remains failed.

Next gate / reopening condition: Reopen only when a measured presenter/preview trace shows avoidable mapping of superseded frames; compare total owner cost and required visible output while retaining dependency decoding.

This scoped supplement does not broaden earlier correctness or performance qualification.
