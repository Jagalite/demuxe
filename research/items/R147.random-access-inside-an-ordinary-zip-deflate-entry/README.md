<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Random access inside an ordinary ZIP DEFLATE entry

Full identity: `R147.random-access-inside-an-ordinary-zip-deflate-entry`. Original rank: 221.

Current decision: **blocked** (reconciled from **DEFER_SETUP**). No new media execution.

Source readers expose literal file/range bytes with no archive coordinate mapping. Historical zlib snapshots are opaque process-local state and require a full initial inflate/CRC pass; browser DecompressionStream presence supplies no snapshot API.

No matching candidate/reference/control execution for this exact gate. Owned zlib snapshot index and archive-to-output coordinate map, including complete initial inflate/CRC cost.

Next action: Specify one owned inflate-state index for a bounded ZIP entry and compare random output ranges byte-for-byte, with bare compressed-cursor restart rejected. Compare the smallest bounded component with its independent output oracle; production API absence alone does not preclude the experiment.

## Stages

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | blocked | Unperformed setup gate: Owned zlib snapshot index and archive-to-output coordinate map, including complete initial inflate/CRC cost. |
| screen | passed | Existing source/prerequisite/experimental screen reviewed; scientific verdict preserved at its exact scope. |
| correctness | blocked | No matching candidate/reference/control execution for this exact gate. Owned zlib snapshot index and archive-to-output coordinate map, including complete initial inflate/CRC cost. |
| performance | blocked | No relevant candidate correctness pass; no performance inference from source reports or existing-owner counters. |
| results | passed | Referenced evidence read and byte-pinned; historical claims remain imported, no new experiment inferred. |
| decision | passed | Normalized disposition preserves prior scoped scientific verdict and names the next missing gate. |

[Reconciliation](../../shared/runs/20260919T202508Z-r101-250-stage-reconciliation/run.json) · [Current metadata](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json)

Setup/fixture/environment blocks are not experimental failures. Integration and release qualification remain separate; historical definitions and bytes are retained.
