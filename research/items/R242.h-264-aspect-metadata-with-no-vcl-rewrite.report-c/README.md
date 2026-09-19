<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# H.264 aspect metadata with no VCL rewrite

Full identity: `R242.h-264-aspect-metadata-with-no-vcl-rewrite.report-c`. Original rank: 134.

Current decision: **blocked** (reconciled from **DEFER_SETUP**). No new media execution.

Current code preserves existing sample_aspect_ratio and retained display geometry. It does not expose a requested aspect-metadata editing/export operation; adding SPS/VUI and pasp patching would be a distinct semantic feature.

No matching candidate/reference/control execution for this exact gate. Length-safe SPS/VUI/pasp editor for explicit aspect correction with VCL/timestamp identity controls.

Next action: If explicit metadata correction is required, test one length-preserving avcC/pasp edit and all VCL/PTS hashes; altered SPS length or B-frame timestamps must reject or use a fully validated rewriter. Compare the smallest bounded component with its independent output oracle; production API absence alone does not preclude the experiment.

## Stages

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | blocked | Unperformed setup gate: Length-safe SPS/VUI/pasp editor for explicit aspect correction with VCL/timestamp identity controls. |
| screen | passed | Existing source/prerequisite/experimental screen reviewed; scientific verdict preserved at its exact scope. |
| correctness | blocked | No matching candidate/reference/control execution for this exact gate. Length-safe SPS/VUI/pasp editor for explicit aspect correction with VCL/timestamp identity controls. |
| performance | blocked | No relevant candidate correctness pass; no performance inference from source reports or existing-owner counters. |
| results | passed | Referenced evidence read and byte-pinned; historical claims remain imported, no new experiment inferred. |
| decision | passed | Normalized disposition preserves prior scoped scientific verdict and names the next missing gate. |

[Reconciliation](../../shared/runs/20260919T202508Z-r101-250-stage-reconciliation/run.json) · [Current metadata](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json)

Setup/fixture/environment blocks are not experimental failures. Integration and release qualification remain separate; historical definitions and bytes are retained.
