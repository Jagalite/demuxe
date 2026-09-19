<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Convert finite fMP4 fragments into a metadata-indexed native MP4 view

Full identity: `R090.convert-finite-fmp4-fragments-into-a-metadata-indexed-native-mp4-view`. Original rank: 171.

Current decision: **stop_current_profile** (reconciled from **STOP_PROFILE**). No new media execution.

Native already attempts unchanged source direct playback before remux. Building a flat Blob view solely to remove app append ownership has no route gap when direct complete fMP4 is accepted; indexing can reopen only for demonstrated seek deficiency.

Existing unchanged fMP4 native-direct playback/seeking removes the route gap; no newly authored flat-MP4 candidate to qualify.

Next action: First demonstrate native-direct seek deficiency on a target source before building a flat view.

## Stages

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | not_applicable | No candidate setup needed after scoped baseline/opportunity stop. |
| screen | passed | Existing source/prerequisite/experimental screen reviewed; scientific verdict preserved at its exact scope. |
| correctness | not_applicable | Existing unchanged fMP4 native-direct playback/seeking removes the route gap; no newly authored flat-MP4 candidate to qualify. |
| performance | not_applicable | No performance claim required for scoped profile stop, existing behavior or optional quality/test supplement. |
| results | passed | Referenced evidence read and byte-pinned; historical claims remain imported, no new experiment inferred. |
| decision | passed | Normalized disposition preserves prior scoped scientific verdict and names the next missing gate. |

[Reconciliation](../../shared/runs/20260919T202508Z-r101-250-stage-reconciliation/run.json) · [Current metadata](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json)

Setup/fixture/environment blocks are not experimental failures. Integration and release qualification remain separate; historical definitions and bytes are retained.
