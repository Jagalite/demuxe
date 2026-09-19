<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Expose an edited MP4 as a virtual byte-range URL

Full identity: `R109.expose-an-edited-mp4-as-a-virtual-byte-range-url`. Original rank: 205.

Current decision: **blocked** (reconciled from **DEFER_SETUP**). No new media execution.

RangeReader is a consumer, not a virtual source server, and the existing MP4 probe does not author sample tables. The historical virtual resource reused reference-authored headers, leaving core mapping/authoring and authority work unresolved.

No matching candidate/reference/control execution for this exact gate. Finite edited MP4 sample-table/range-map author with source-validator and cross-boundary byte oracle.

Next action: Specify one video-only closed-GOP A/B/A address map, compare random cross-boundary ranges with a materialized oracle, and reject changed source validators. Compare the smallest bounded component with its independent output oracle; production API absence alone does not preclude the experiment.

## Stages

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | blocked | Unperformed setup gate: Finite edited MP4 sample-table/range-map author with source-validator and cross-boundary byte oracle. |
| screen | passed | Existing source/prerequisite/experimental screen reviewed; scientific verdict preserved at its exact scope. |
| correctness | blocked | No matching candidate/reference/control execution for this exact gate. Finite edited MP4 sample-table/range-map author with source-validator and cross-boundary byte oracle. |
| performance | blocked | No relevant candidate correctness pass; no performance inference from source reports or existing-owner counters. |
| results | passed | Referenced evidence read and byte-pinned; historical claims remain imported, no new experiment inferred. |
| decision | passed | Normalized disposition preserves prior scoped scientific verdict and names the next missing gate. |

[Reconciliation](../../shared/runs/20260919T202508Z-r101-250-stage-reconciliation/run.json) · [Current metadata](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json)

Setup/fixture/environment blocks are not experimental failures. Integration and release qualification remain separate; historical definitions and bytes are retained.
