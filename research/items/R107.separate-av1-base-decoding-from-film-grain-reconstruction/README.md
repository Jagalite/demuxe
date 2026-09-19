<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Separate AV1 base decoding from film-grain reconstruction

Full identity: `R107.separate-av1-base-decoding-from-film-grain-reconstruction`. Original rank: 242.

Current decision: **blocked** (reconciled from **DEFER_SETUP**). No new media execution.

Browser video submission preserves AV1 coded payloads and returns reconstructed frames; no grain-disable bitstream parser or grain synthesis component exists here. Historical host grain-off CPU improvement intentionally changes pictures and is not an exact-output result.

No matching candidate/reference/control execution for this exact gate. Valid AV1 grain stream and reference pre/post-grain planes before grain-sidecar/synthesis work.

Next action: First inventory one valid AV1 grain fixture and a reference exposing pre/post-grain planes; scope a parser-only sidecar before any external synthesis. Compare the smallest bounded component with its independent output oracle; production API absence alone does not preclude the experiment.

## Stages

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | blocked | Unperformed fixture gate: Valid AV1 grain stream and reference pre/post-grain planes before grain-sidecar/synthesis work. |
| screen | passed | Existing source/prerequisite/experimental screen reviewed; scientific verdict preserved at its exact scope. |
| correctness | blocked | No matching candidate/reference/control execution for this exact gate. Valid AV1 grain stream and reference pre/post-grain planes before grain-sidecar/synthesis work. |
| performance | blocked | No relevant candidate correctness pass; no performance inference from source reports or existing-owner counters. |
| results | passed | Referenced evidence read and byte-pinned; historical claims remain imported, no new experiment inferred. |
| decision | passed | Normalized disposition preserves prior scoped scientific verdict and names the next missing gate. |

[Reconciliation](../../shared/runs/20260919T202508Z-r101-250-stage-reconciliation/run.json) · [Current metadata](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json)

Setup/fixture/environment blocks are not experimental failures. Integration and release qualification remain separate; historical definitions and bytes are retained.
