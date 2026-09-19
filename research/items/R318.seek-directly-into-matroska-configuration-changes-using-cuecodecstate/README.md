<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Seek directly into Matroska configuration changes using CueCodecState

Full identity: `R318.seek-directly-into-matroska-configuration-changes-using-cuecodecstate`. Original rank: 172.

Current decision: **blocked** (reconciled from **DEFER_SETUP**). No new media execution.

Remux explicitly rejects changed video extradata and its seek state does not expose Matroska CueCodecState. Indexed configuration-epoch mapping requires a demux/configuration transaction, while cues cannot recreate prediction history.

No matching candidate/reference/control execution for this exact gate. Two-epoch Matroska CueCodecState source plus per-epoch RAP/configuration reference.

Next action: Provide one two-epoch Matroska fixture and validate CueCodecState bytes/identity before one seek each direction; mid-GOP cold start or wrong epoch state must reject. Compare the smallest bounded component with its independent output oracle; production API absence alone does not preclude the experiment.

## Stages

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | blocked | Unperformed fixture gate: Two-epoch Matroska CueCodecState source plus per-epoch RAP/configuration reference. |
| screen | passed | Existing source/prerequisite/experimental screen reviewed; scientific verdict preserved at its exact scope. |
| correctness | blocked | No matching candidate/reference/control execution for this exact gate. Two-epoch Matroska CueCodecState source plus per-epoch RAP/configuration reference. |
| performance | blocked | No relevant candidate correctness pass; no performance inference from source reports or existing-owner counters. |
| results | passed | Referenced evidence read and byte-pinned; historical claims remain imported, no new experiment inferred. |
| decision | passed | Normalized disposition preserves prior scoped scientific verdict and names the next missing gate. |

[Reconciliation](../../shared/runs/20260919T202508Z-r101-250-stage-reconciliation/run.json) · [Current metadata](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json)

Setup/fixture/environment blocks are not experimental failures. Integration and release qualification remain separate; historical definitions and bytes are retained.
