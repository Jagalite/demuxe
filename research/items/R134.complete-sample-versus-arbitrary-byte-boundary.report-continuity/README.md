<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# complete-sample versus arbitrary byte boundary

Full identity: `R134.complete-sample-versus-arbitrary-byte-boundary.report-continuity`. Original rank: 128.

Current decision: **stop_current_profile** (reconciled from **STOP_PROFILE**). No new media execution.

For this actual A/V fMP4, neither complete first video sample nor 37-byte-truncated cut exposes a buffered range or early frame; both complete correctly after remaining data arrives. A complete video sample alone is insufficient for early muxed A/V output. No partial-delivery optimization justified on this fixture.

Both complete-first-video-sample and37-byte-short controls expose no early buffered range/frame, and complete after remainder; unchanged output and cleanup support scoped no-opportunity decision.

Next action: Reopen only on an actual muxed A/V fixture exposing useful earlier joint availability.

## Stages

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | Read and pinned historical fixture/output/control evidence; no rerun. |
| screen | passed | Existing source/prerequisite/experimental screen reviewed; scientific verdict preserved at its exact scope. |
| correctness | passed | Both complete-first-video-sample and37-byte-short controls expose no early buffered range/frame, and complete after remainder; unchanged output and cleanup support scoped no-opportunity decision. |
| performance | not_applicable | No performance claim required for scoped profile stop, existing behavior or optional quality/test supplement. |
| results | passed | Referenced evidence read and byte-pinned; historical claims remain imported, no new experiment inferred. |
| decision | passed | Normalized disposition preserves prior scoped scientific verdict and names the next missing gate. |

[Reconciliation](../../shared/runs/20260919T202508Z-r101-250-stage-reconciliation/run.json) · [Current metadata](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json)

Setup/fixture/environment blocks are not experimental failures. Integration and release qualification remain separate; historical definitions and bytes are retained.
