<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# native frame relay without JS pixel readback

Full identity: `R145.native-frame-relay-without-js-pixel-readback.report-continuity`. Original rank: 132.

Current decision: **blocked** (reconciled from **DEFER_SETUP**). No new media execution.

Current Hybrid transfers decoded VideoFrames directly to a single canvas consumer, already avoiding pixel copies in noCopy mode. The exact report proposes native media-track capture/generator routing, an absent destination contract.

No matching candidate/reference/control execution for this exact gate. Requested media-track destination and capture/processor/generator relay with frame completeness oracle.

Next action: Name a required second media-track destination and verify one capture/processor/generator relay with frame IDs; a dropped/delayed final frame must fail requested output completeness. Compare the smallest bounded component with its independent output oracle; production API absence alone does not preclude the experiment.

## Stages

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | blocked | Unperformed setup gate: Requested media-track destination and capture/processor/generator relay with frame completeness oracle. |
| screen | passed | Existing source/prerequisite/experimental screen reviewed; scientific verdict preserved at its exact scope. |
| correctness | blocked | No matching candidate/reference/control execution for this exact gate. Requested media-track destination and capture/processor/generator relay with frame completeness oracle. |
| performance | blocked | No relevant candidate correctness pass; no performance inference from source reports or existing-owner counters. |
| results | passed | Referenced evidence read and byte-pinned; historical claims remain imported, no new experiment inferred. |
| decision | passed | Normalized disposition preserves prior scoped scientific verdict and names the next missing gate. |

[Reconciliation](../../shared/runs/20260919T202508Z-r101-250-stage-reconciliation/run.json) · [Current metadata](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json)

Setup/fixture/environment blocks are not experimental failures. Integration and release qualification remain separate; historical definitions and bytes are retained.
