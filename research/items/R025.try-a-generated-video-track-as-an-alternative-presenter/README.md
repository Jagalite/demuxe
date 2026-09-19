<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Try a generated video track as an alternative presenter

Full identity: `R025.try-a-generated-video-track-as-an-alternative-presenter`. Original rank: 231.

Current decision: **stop_current_profile** (reconciled from **STOP_PROFILE**). No new media execution.

The current legacy generated-track sink accepts three delayed writes and presents red/green/blue in order, with clean close. No replacement advantage over existing canvas presentation or complete A/V clock was demonstrated. Keep as a destination-specific option only if a MediaStream consumer is required.

Legacy generated track accepts three delayed writes and renders red/green/blue order with cleanup; no existing-canvas replacement advantage or complete A/V clock demonstrated.

Next action: Reopen only for a required MediaStream destination; preserve frame timing/EOF and measure complete ownership cost.

## Stages

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | Read and pinned historical fixture/output/control evidence; no rerun. |
| screen | passed | Existing source/prerequisite/experimental screen reviewed; scientific verdict preserved at its exact scope. |
| correctness | passed | Legacy generated track accepts three delayed writes and renders red/green/blue order with cleanup; no existing-canvas replacement advantage or complete A/V clock demonstrated. |
| performance | not_applicable | No performance claim required for scoped profile stop, existing behavior or optional quality/test supplement. |
| results | passed | Referenced evidence read and byte-pinned; historical claims remain imported, no new experiment inferred. |
| decision | passed | Normalized disposition preserves prior scoped scientific verdict and names the next missing gate. |

[Reconciliation](../../shared/runs/20260919T202508Z-r101-250-stage-reconciliation/run.json) · [Current metadata](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json)

Setup/fixture/environment blocks are not experimental failures. Integration and release qualification remain separate; historical definitions and bytes are retained.
