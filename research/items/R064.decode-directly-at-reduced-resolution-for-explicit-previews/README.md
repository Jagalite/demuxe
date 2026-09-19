<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Decode directly at reduced resolution for explicit previews

Full identity: `R064.decode-directly-at-reduced-resolution-for-explicit-previews`. Original rank: 156.

Current decision: **blocked** (reconciled from **DEFER_SETUP**). No new media execution.

No preview/economy decode policy exists; software decoder options only set resource bounds. Lowres is codec-specific and intentional quality change, not permission from small display size.

No matching candidate/reference/control execution for this exact gate. Explicit reduced-detail profile and codec-specific lowres candidate/oracle; no permission inferred from display size.

Next action: Once explicit preview intent exists, query compiled MJPEG/MPEG2 max_lowres and compare one frame with full-decode scaling; unsupported codec must retain full decode and report pixel differences. Compare the smallest bounded component with its independent output oracle; production API absence alone does not preclude the experiment.

## Stages

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | blocked | Unperformed setup gate: Explicit reduced-detail profile and codec-specific lowres candidate/oracle; no permission inferred from display size. |
| screen | passed | Existing source/prerequisite/experimental screen reviewed; scientific verdict preserved at its exact scope. |
| correctness | blocked | No matching candidate/reference/control execution for this exact gate. Explicit reduced-detail profile and codec-specific lowres candidate/oracle; no permission inferred from display size. |
| performance | blocked | No relevant candidate correctness pass; no performance inference from source reports or existing-owner counters. |
| results | passed | Referenced evidence read and byte-pinned; historical claims remain imported, no new experiment inferred. |
| decision | passed | Normalized disposition preserves prior scoped scientific verdict and names the next missing gate. |

[Reconciliation](../../shared/runs/20260919T202508Z-r101-250-stage-reconciliation/run.json) · [Current metadata](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json)

Setup/fixture/environment blocks are not experimental failures. Integration and release qualification remain separate; historical definitions and bytes are retained.
