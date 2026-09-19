<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Decode seek preroll without producing unwanted presentation frames

Full identity: `R135.decode-seek-preroll-without-producing-unwanted-presentation-frames`. Original rank: 207.

Current decision: **blocked** (reconciled from **DEFER_SETUP**). No new media execution.

Current remux preserves encoded samples and decoder bridge has no AV1 display-instruction rewriter. Suppressing presentation while retaining reference decoding requires authoring legal hidden preroll, not toggling a generic visibility flag.

No matching candidate/reference/control execution for this exact gate. Reference-validated constrained AV1 hidden-preroll sequence with required-reference negative control.

Next action: Prepare one reference-decoder-validated AV1 preroll sequence, compare continuing pictures and timestamps, and remove a required reference as adverse control. Compare the smallest bounded component with its independent output oracle; production API absence alone does not preclude the experiment.

## Stages

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | blocked | Unperformed fixture gate: Reference-validated constrained AV1 hidden-preroll sequence with required-reference negative control. |
| screen | passed | Existing source/prerequisite/experimental screen reviewed; scientific verdict preserved at its exact scope. |
| correctness | blocked | No matching candidate/reference/control execution for this exact gate. Reference-validated constrained AV1 hidden-preroll sequence with required-reference negative control. |
| performance | blocked | No relevant candidate correctness pass; no performance inference from source reports or existing-owner counters. |
| results | passed | Referenced evidence read and byte-pinned; historical claims remain imported, no new experiment inferred. |
| decision | passed | Normalized disposition preserves prior scoped scientific verdict and names the next missing gate. |

[Reconciliation](../../shared/runs/20260919T202508Z-r101-250-stage-reconciliation/run.json) · [Current metadata](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json)

Setup/fixture/environment blocks are not experimental failures. Integration and release qualification remain separate; historical definitions and bytes are retained.
