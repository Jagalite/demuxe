<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Decode a GOP once for a pending exact-preview batch

Full identity: `R073.decode-a-gop-once-for-a-pending-exact-preview-batch`. Original rank: 159.

Current decision: **blocked** (reconciled from **DEFER_SETUP**). No new media execution.

No pending exact-preview request batch owner exists. Current decoder is single playback generation; historical twelve-process baseline is not current persistent-Wasm scheduling cost.

No matching candidate/reference/control execution for this exact gate. Pending-only same-GOP batch scheduler and cancellation/source-isolation oracle.

Next action: Define pending-only same-GOP batching with no wait-to-fill; compare requested frames to full decode and reject sparse/different-source jobs or cancellation leakage. Compare the smallest bounded component with its independent output oracle; production API absence alone does not preclude the experiment.

## Stages

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | blocked | Unperformed setup gate: Pending-only same-GOP batch scheduler and cancellation/source-isolation oracle. |
| screen | passed | Existing source/prerequisite/experimental screen reviewed; scientific verdict preserved at its exact scope. |
| correctness | blocked | No matching candidate/reference/control execution for this exact gate. Pending-only same-GOP batch scheduler and cancellation/source-isolation oracle. |
| performance | blocked | No relevant candidate correctness pass; no performance inference from source reports or existing-owner counters. |
| results | passed | Referenced evidence read and byte-pinned; historical claims remain imported, no new experiment inferred. |
| decision | passed | Normalized disposition preserves prior scoped scientific verdict and names the next missing gate. |

[Reconciliation](../../shared/runs/20260919T202508Z-r101-250-stage-reconciliation/run.json) · [Current metadata](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json)

Setup/fixture/environment blocks are not experimental failures. Integration and release qualification remain separate; historical definitions and bytes are retained.
