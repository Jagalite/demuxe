<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Stream inside a fragment instead of making it smaller

Full identity: `R004.stream-inside-a-fragment-instead-of-making-it-smaller`. Original rank: 141.

Current decision: **stop_current_profile** (reconciled from **STOP_PROFILE**). No new media execution.

Reported 26-second trace: media first-emission-to-flush max 0.320 ms, peak queue depth one; no material withholding demonstrated at this boundary. Later browser delays not measured. Actual local raw records and prior manifest identity were inspected in this v4 import.

Existing26s producer trace has max0.320ms emission-to-flush and queue depth1; no candidate withholding optimization was justified.

Next action: Reopen on an attributable producer/worker withholding trace; inspect actual raw timings, not summary alone.

## Stages

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | not_applicable | No candidate setup needed after scoped baseline/opportunity stop. |
| screen | passed | Existing source/prerequisite/experimental screen reviewed; scientific verdict preserved at its exact scope. |
| correctness | not_applicable | Existing26s producer trace has max0.320ms emission-to-flush and queue depth1; no candidate withholding optimization was justified. |
| performance | not_applicable | No performance claim required for scoped profile stop, existing behavior or optional quality/test supplement. |
| results | passed | Referenced evidence read and byte-pinned; historical claims remain imported, no new experiment inferred. |
| decision | passed | Normalized disposition preserves prior scoped scientific verdict and names the next missing gate. |

[Reconciliation](../../shared/runs/20260919T202508Z-r101-250-stage-reconciliation/run.json) · [Current metadata](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json)

Setup/fixture/environment blocks are not experimental failures. Integration and release qualification remain separate; historical definitions and bytes are retained.
