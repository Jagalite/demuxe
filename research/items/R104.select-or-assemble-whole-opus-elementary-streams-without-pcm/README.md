<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Select or assemble whole Opus elementary streams without PCM

Full identity: `R104.select-or-assemble-whole-opus-elementary-streams-without-pcm`. Original rank: 219.

Current decision: **blocked** (reconciled from **DEFER_SETUP**). No new media execution.

Whole-track Opus packaging exists but selected component streams and family255 mapping are not exposed; current adaptation is mono/stereo. A self-delimiting component parser plus truthful layout/trim contract is needed.

No matching candidate/reference/control execution for this exact gate. Self-delimiting Opus multistream component selector with whole coupled-pair, layout and pre-skip rules.

Next action: Extract one entire independent mono component and one coupled pair from a marked fixture, compare payload/PCM and reject half-pair selection or mismatched pre-skip. Compare the smallest bounded component with its independent output oracle; production API absence alone does not preclude the experiment.

## Stages

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | blocked | Unperformed setup gate: Self-delimiting Opus multistream component selector with whole coupled-pair, layout and pre-skip rules. |
| screen | passed | Existing source/prerequisite/experimental screen reviewed; scientific verdict preserved at its exact scope. |
| correctness | blocked | No matching candidate/reference/control execution for this exact gate. Self-delimiting Opus multistream component selector with whole coupled-pair, layout and pre-skip rules. |
| performance | blocked | No relevant candidate correctness pass; no performance inference from source reports or existing-owner counters. |
| results | passed | Referenced evidence read and byte-pinned; historical claims remain imported, no new experiment inferred. |
| decision | passed | Normalized disposition preserves prior scoped scientific verdict and names the next missing gate. |

[Reconciliation](../../shared/runs/20260919T202508Z-r101-250-stage-reconciliation/run.json) · [Current metadata](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json)

Setup/fixture/environment blocks are not experimental failures. Integration and release qualification remain separate; historical definitions and bytes are retained.
