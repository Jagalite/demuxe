<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Treat intentionally disabled tracks as removable work

Full identity: `R013.treat-intentionally-disabled-tracks-as-removable-work`. Original rank: 173.

Current decision: **pursue** (reconciled from **PURSUE_DESIGN**). No new media execution.

Explicit disabled-track intent has a concrete owner gap: current Native audio=no only mutes, while negative remux selection means automatic. Selected-track metadata experiment establishes packet-preserving exclusion is feasible, but no no-audio remux sentinel was implemented. Worth a separate explicit disable/re-enable contract; ordinary mute must keep audio prepared.

Related existing controls are retained; this specific candidate has no complete output/lifecycle gate.

Next action: Build only the bounded missing component: Explicit disable/re-enable sentinel and lifetime contract; negative stream selection currently means automatic and ordinary mute must retain audio.

## Stages

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | blocked | Exact candidate setup not implemented: Explicit disable/re-enable sentinel and lifetime contract; negative stream selection currently means automatic and ordinary mute must retain audio. |
| screen | passed | Existing source/prerequisite/experimental screen reviewed; scientific verdict preserved at its exact scope. |
| correctness | blocked | Related existing controls are retained; this specific candidate has no complete output/lifecycle gate. |
| performance | blocked | No performance claim or equivalent candidate workload established. |
| results | passed | Referenced evidence read and byte-pinned; historical claims remain imported, no new experiment inferred. |
| decision | passed | Normalized disposition preserves prior scoped scientific verdict and names the next missing gate. |

[Reconciliation](../../shared/runs/20260919T202508Z-r101-250-stage-reconciliation/run.json) · [Current metadata](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json)

Setup/fixture/environment blocks are not experimental failures. Integration and release qualification remain separate; historical definitions and bytes are retained.
