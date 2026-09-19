<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Incremental MJPEG stripe decode/upload

Full identity: `R206.incremental-mjpeg-stripe-decode-upload`. Original rank: 164.

Current decision: **blocked** (reconciled from **DEFER_SETUP**). No new media execution.

Presenter gets complete mp_image/VideoFrame outputs, not partial libjpeg stripes. Overlap would require a decoder stripe callback and unpublished-texture owner; multiple uploads alone showed no reported gain.

No matching candidate/reference/control execution for this exact gate. Decoder stripe callback plus unpublished-texture completion fence and partial-frame rejection.

Next action: Expose one bounded stripe callback and completion fence only if existing decoder permits it; compare complete pixels and withhold publication until final stripe, with partial-frame negative control. Compare the smallest bounded component with its independent output oracle; production API absence alone does not preclude the experiment.

## Stages

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | blocked | Unperformed setup gate: Decoder stripe callback plus unpublished-texture completion fence and partial-frame rejection. |
| screen | passed | Existing source/prerequisite/experimental screen reviewed; scientific verdict preserved at its exact scope. |
| correctness | blocked | No matching candidate/reference/control execution for this exact gate. Decoder stripe callback plus unpublished-texture completion fence and partial-frame rejection. |
| performance | blocked | No relevant candidate correctness pass; no performance inference from source reports or existing-owner counters. |
| results | passed | Referenced evidence read and byte-pinned; historical claims remain imported, no new experiment inferred. |
| decision | passed | Normalized disposition preserves prior scoped scientific verdict and names the next missing gate. |

[Reconciliation](../../shared/runs/20260919T202508Z-r101-250-stage-reconciliation/run.json) · [Current metadata](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json)

Setup/fixture/environment blocks are not experimental failures. Integration and release qualification remain separate; historical definitions and bytes are retained.
