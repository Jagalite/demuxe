<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# progressively refine one preview

Full identity: `R185.progressively-refine-one-preview`. Original rank: 246.

Current decision: **blocked** (reconciled from **DEFER_SETUP**). No new media execution.

The existing seek UI and retained video draw have no progressive-image preview resource owner. The report relies on compositor-visible progressive JPEG states that canvas did not expose; piping through current canvas drawing would not reproduce that mechanism.

No matching candidate/reference/control execution for this exact gate. Image-element progressive preview owner and source-generation cancellation; canvas snapshots do not expose the reported compositor refinement.

Next action: Specify one image-element preview owner and source-generation token before using a progressive JPEG; inspect compositor refinement and cancel before final scan. Compare the smallest bounded component with its independent output oracle; production API absence alone does not preclude the experiment.

## Stages

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | blocked | Unperformed setup gate: Image-element progressive preview owner and source-generation cancellation; canvas snapshots do not expose the reported compositor refinement. |
| screen | passed | Existing source/prerequisite/experimental screen reviewed; scientific verdict preserved at its exact scope. |
| correctness | blocked | No matching candidate/reference/control execution for this exact gate. Image-element progressive preview owner and source-generation cancellation; canvas snapshots do not expose the reported compositor refinement. |
| performance | blocked | No relevant candidate correctness pass; no performance inference from source reports or existing-owner counters. |
| results | passed | Referenced evidence read and byte-pinned; historical claims remain imported, no new experiment inferred. |
| decision | passed | Normalized disposition preserves prior scoped scientific verdict and names the next missing gate. |

[Reconciliation](../../shared/runs/20260919T202508Z-r101-250-stage-reconciliation/run.json) · [Current metadata](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json)

Setup/fixture/environment blocks are not experimental failures. Integration and release qualification remain separate; historical definitions and bytes are retained.
