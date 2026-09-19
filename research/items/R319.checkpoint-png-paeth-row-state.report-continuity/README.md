<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Checkpoint PNG Paeth row state

Full identity: `R319.checkpoint-png-paeth-row-state.report-continuity`. Original rank: 216.

Current decision: **blocked** (reconciled from **DEFER_SETUP**). No new media execution.

Current byte readers do not expose inflated PNG rows or a PNG filter decoder. Prior-row checkpoints reduce post-inflate Paeth replay only; ordinary compressed-file random access still needs independent inflate state.

No matching candidate/reference/control execution for this exact gate. Already-inflated PNG row/checkpoint component and changed-prior-row control; full DEFLATE seek state separately accounted.

Next action: On already-inflated rows, compare band reconstruction with checkpoint versus row-zero replay and changed-prior-row rejection; account separately for full-file inflate. Compare the smallest bounded component with its independent output oracle; production API absence alone does not preclude the experiment.

## Stages

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | blocked | Unperformed setup gate: Already-inflated PNG row/checkpoint component and changed-prior-row control; full DEFLATE seek state separately accounted. |
| screen | passed | Existing source/prerequisite/experimental screen reviewed; scientific verdict preserved at its exact scope. |
| correctness | blocked | No matching candidate/reference/control execution for this exact gate. Already-inflated PNG row/checkpoint component and changed-prior-row control; full DEFLATE seek state separately accounted. |
| performance | blocked | No relevant candidate correctness pass; no performance inference from source reports or existing-owner counters. |
| results | passed | Referenced evidence read and byte-pinned; historical claims remain imported, no new experiment inferred. |
| decision | passed | Normalized disposition preserves prior scoped scientific verdict and names the next missing gate. |

[Reconciliation](../../shared/runs/20260919T202508Z-r101-250-stage-reconciliation/run.json) · [Current metadata](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json)

Setup/fixture/environment blocks are not experimental failures. Integration and release qualification remain separate; historical definitions and bytes are retained.
