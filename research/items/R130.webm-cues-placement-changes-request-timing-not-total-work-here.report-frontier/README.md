<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# WebM Cues placement changes request timing, not total work here

Full identity: `R130.webm-cues-placement-changes-request-timing-not-total-work-here.report-frontier`. Original rank: 181.

Current decision: **blocked** (reconciled from **DEFER_SETUP**). No new media execution.

RangeReader already exposes byte-aligned cache requests; no Cues relocating/virtual byte-view writer exists. Historical near-equal totals only support request-shaping hypothesis, not a local byte-saving result.

No matching candidate/reference/control execution for this exact gate. Cues relocation writer and real startup/seek request-timing oracle; no byte-saving inference from historical near-equal totals.

Next action: Before building relocation, inspect current request timing for a real target; only if startup-versus-seek latency tradeoff matters compare front/tail Cues with unchanged cluster payloads and stale-offset control. Compare the smallest bounded component with its independent output oracle; production API absence alone does not preclude the experiment.

## Stages

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | blocked | Unperformed setup gate: Cues relocation writer and real startup/seek request-timing oracle; no byte-saving inference from historical near-equal totals. |
| screen | passed | Existing source/prerequisite/experimental screen reviewed; scientific verdict preserved at its exact scope. |
| correctness | blocked | No matching candidate/reference/control execution for this exact gate. Cues relocation writer and real startup/seek request-timing oracle; no byte-saving inference from historical near-equal totals. |
| performance | blocked | No relevant candidate correctness pass; no performance inference from source reports or existing-owner counters. |
| results | passed | Referenced evidence read and byte-pinned; historical claims remain imported, no new experiment inferred. |
| decision | passed | Normalized disposition preserves prior scoped scientific verdict and names the next missing gate. |

[Reconciliation](../../shared/runs/20260919T202508Z-r101-250-stage-reconciliation/run.json) · [Current metadata](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json)

Setup/fixture/environment blocks are not experimental failures. Integration and release qualification remain separate; historical definitions and bytes are retained.
