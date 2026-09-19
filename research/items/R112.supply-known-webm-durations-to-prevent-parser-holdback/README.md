<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Supply known WebM durations to prevent parser holdback

Full identity: `R112.supply-known-webm-durations-to-prevent-parser-holdback`. Original rank: 161.

Current decision: **already_implemented** (reconciled from **ALREADY_IMPLEMENTED**). No new media execution.

Maintained VP9/Opus output already contains video DefaultDuration. Its first block is audio and gives no early frame with or without video duration metadata; do not infer an A/V timing benefit from video-only VP8. Retain truthful duration signaling; no missing metadata fix is needed in this output profile.

DefaultDuration exists in maintained VP9/Opus; removing it does not change first-audio-block early availability. Video-only VP8 control differs; preserve truthful metadata without inferring mixed A/V benefit.

Next action: Retain duration correctness; reopen a demonstrated mixed A/V parser-holdback profile.

## Stages

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | Read and pinned historical fixture/output/control evidence; no rerun. |
| screen | passed | Existing source/prerequisite/experimental screen reviewed; scientific verdict preserved at its exact scope. |
| correctness | passed | DefaultDuration exists in maintained VP9/Opus; removing it does not change first-audio-block early availability. Video-only VP8 control differs; preserve truthful metadata without inferring mixed A/V benefit. |
| performance | not_applicable | No performance claim required for scoped profile stop, existing behavior or optional quality/test supplement. |
| results | passed | Referenced evidence read and byte-pinned; historical claims remain imported, no new experiment inferred. |
| decision | passed | Normalized disposition preserves prior scoped scientific verdict and names the next missing gate. |

[Reconciliation](../../shared/runs/20260919T202508Z-r101-250-stage-reconciliation/run.json) · [Current metadata](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json)

Setup/fixture/environment blocks are not experimental failures. Integration and release qualification remain separate; historical definitions and bytes are retained.
