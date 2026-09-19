<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Turn abbreviated JPEG transport frames into browser-decodable images

Full identity: `R140.turn-abbreviated-jpeg-transport-frames-into-browser-decodable-images`. Original rank: 220.

Current decision: **blocked** (reconciled from **DEFER_SETUP**). No new media execution.

Current source worker consumes finite files/ranges and video adapter describes supported codecs; neither owns RTP/JPEG transport table parameters or missing-header reconstruction. Correct scan bytes alone cannot supply truthful JPEG tables.

No matching candidate/reference/control execution for this exact gate. Complete RTP/JPEG frame with explicit quantization/restart/geometry and independent decoded reference.

Next action: Obtain one complete RTP/JPEG frame with explicit quantization/restart/geometry metadata, reconstruct its header and compare decoded pixels with an independent source, rejecting missing tables. Compare the smallest bounded component with its independent output oracle; production API absence alone does not preclude the experiment.

## Stages

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | blocked | Unperformed fixture gate: Complete RTP/JPEG frame with explicit quantization/restart/geometry and independent decoded reference. |
| screen | passed | Existing source/prerequisite/experimental screen reviewed; scientific verdict preserved at its exact scope. |
| correctness | blocked | No matching candidate/reference/control execution for this exact gate. Complete RTP/JPEG frame with explicit quantization/restart/geometry and independent decoded reference. |
| performance | blocked | No relevant candidate correctness pass; no performance inference from source reports or existing-owner counters. |
| results | passed | Referenced evidence read and byte-pinned; historical claims remain imported, no new experiment inferred. |
| decision | passed | Normalized disposition preserves prior scoped scientific verdict and names the next missing gate. |

[Reconciliation](../../shared/runs/20260919T202508Z-r101-250-stage-reconciliation/run.json) · [Current metadata](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json)

Setup/fixture/environment blocks are not experimental failures. Integration and release qualification remain separate; historical definitions and bytes are retained.
