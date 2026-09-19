<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Fuse qualified video effects into one GPU presentation pass

Full identity: `R023.fuse-qualified-video-effects-into-one-gpu-presentation-pass`. Original rank: 197.

Current decision: **blocked** (reconciled from **DEFER_SETUP**). No new media execution.

Retained output uses canvas and current YUV presentation combines geometry/color conversion but subtitles remain a separate draw; requested video filters still require Software. GPU capability exists, yet a retained-frame effect contract/shader registry is not implemented.

No matching candidate/reference/control execution for this exact gate. Exact combined effect/alpha/color contract and fused shader candidate, with context-loss and subtitle controls.

Next action: Define one exact rotation plus simple color operation and compare a research fused presenter against existing output pixels including subtitle alpha and context loss. Compare the smallest bounded component with its independent output oracle; production API absence alone does not preclude the experiment.

## Stages

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | blocked | Unperformed setup gate: Exact combined effect/alpha/color contract and fused shader candidate, with context-loss and subtitle controls. |
| screen | passed | Existing source/prerequisite/experimental screen reviewed; scientific verdict preserved at its exact scope. |
| correctness | blocked | No matching candidate/reference/control execution for this exact gate. Exact combined effect/alpha/color contract and fused shader candidate, with context-loss and subtitle controls. |
| performance | blocked | No relevant candidate correctness pass; no performance inference from source reports or existing-owner counters. |
| results | passed | Referenced evidence read and byte-pinned; historical claims remain imported, no new experiment inferred. |
| decision | passed | Normalized disposition preserves prior scoped scientific verdict and names the next missing gate. |

[Reconciliation](../../shared/runs/20260919T202508Z-r101-250-stage-reconciliation/run.json) · [Current metadata](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json)

Setup/fixture/environment blocks are not experimental failures. Integration and release qualification remain separate; historical definitions and bytes are retained.
