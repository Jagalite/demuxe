<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Model unequal tails as explicit track-lifetime phases

Full identity: `R017.model-unequal-tails-as-explicit-track-lifetime-phases`. Original rank: 144.

Current decision: **blocked** (reconciled from **DEFER_SETUP**). No new media execution.

Current implementation already supports a bounded unequal-tail window with known ends and EOS/resume logic; it does not retire an ended SourceBuffer as proposed. The existing working approach must be baseline, not historical bounded rejection.

No matching candidate/reference/control execution for this exact gate. Measured residual tail cost and reversible retirement policy preserving backward restoration; baseline tail handling already exists.

Next action: Identify measured residual cost in current windowed tails before a retirement variant; if justified, test one audio-long tail and backward restoration, with a midstream gap forbidden from being treated as finality. Compare the smallest bounded component with its independent output oracle; production API absence alone does not preclude the experiment.

## Stages

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | blocked | Unperformed setup gate: Measured residual tail cost and reversible retirement policy preserving backward restoration; baseline tail handling already exists. |
| screen | passed | Existing source/prerequisite/experimental screen reviewed; scientific verdict preserved at its exact scope. |
| correctness | blocked | No matching candidate/reference/control execution for this exact gate. Measured residual tail cost and reversible retirement policy preserving backward restoration; baseline tail handling already exists. |
| performance | blocked | No relevant candidate correctness pass; no performance inference from source reports or existing-owner counters. |
| results | passed | Referenced evidence read and byte-pinned; historical claims remain imported, no new experiment inferred. |
| decision | passed | Normalized disposition preserves prior scoped scientific verdict and names the next missing gate. |

[Reconciliation](../../shared/runs/20260919T202508Z-r101-250-stage-reconciliation/run.json) · [Current metadata](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json)

Setup/fixture/environment blocks are not experimental failures. Integration and release qualification remain separate; historical definitions and bytes are retained.
