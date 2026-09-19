<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Compact large seek maps with checkpoints

Full identity: `R075.compact-large-seek-maps-with-checkpoints`. Original rank: 240.

Current decision: **blocked** (reconciled from **DEFER_SETUP**). No new media execution.

The current JS metadata probe is bounded and does not retain a dense 100000-entry seek map; FFmpeg owns the live demux index under a 4 MiB cap. The reported delta/checkpoint representation saves synthetic array bytes but does not identify a current array owner to replace.

No matching candidate/reference/control execution for this exact gate. Actual large-source index allocation/query identity; synthetic arrays are not a current dense seek-map owner.

Next action: Inspect one large-source real FFmpeg index allocation and expose its actual query/identity contract before testing block-16 deltas. Compare the smallest bounded component with its independent output oracle; production API absence alone does not preclude the experiment.

## Stages

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | blocked | Unperformed setup gate: Actual large-source index allocation/query identity; synthetic arrays are not a current dense seek-map owner. |
| screen | passed | Existing source/prerequisite/experimental screen reviewed; scientific verdict preserved at its exact scope. |
| correctness | blocked | No matching candidate/reference/control execution for this exact gate. Actual large-source index allocation/query identity; synthetic arrays are not a current dense seek-map owner. |
| performance | blocked | No relevant candidate correctness pass; no performance inference from source reports or existing-owner counters. |
| results | passed | Referenced evidence read and byte-pinned; historical claims remain imported, no new experiment inferred. |
| decision | passed | Normalized disposition preserves prior scoped scientific verdict and names the next missing gate. |

[Reconciliation](../../shared/runs/20260919T202508Z-r101-250-stage-reconciliation/run.json) · [Current metadata](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json)

Setup/fixture/environment blocks are not experimental failures. Integration and release qualification remain separate; historical definitions and bytes are retained.
