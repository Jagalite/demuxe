<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# compressed-fragment rewind cache

Full identity: `R143.compressed-fragment-rewind-cache.report-continuity`. Original rank: 183.

Current decision: **blocked** (reconciled from **DEFER_SETUP**). No new media execution.

Buffered seeks already reuse live MSE; evicted fragments are not retained as compressed payload cache and source readers are retired on restart. Rewind-after-eviction needs bounded source/codec-keyed compressed ownership separate from MSE receipts.

No matching candidate/reference/control execution for this exact gate. Byte-capped compressed rewind cache retaining init/RAP dependencies and invalidating source/configuration epochs.

Next action: Specify one two-fragment byte-capped rewind cache with init/RAP dependencies; evict then reappend exact bytes and verify target frame, changed source or codec epoch must invalidate cache. Compare the smallest bounded component with its independent output oracle; production API absence alone does not preclude the experiment.

## Stages

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | blocked | Unperformed setup gate: Byte-capped compressed rewind cache retaining init/RAP dependencies and invalidating source/configuration epochs. |
| screen | passed | Existing source/prerequisite/experimental screen reviewed; scientific verdict preserved at its exact scope. |
| correctness | blocked | No matching candidate/reference/control execution for this exact gate. Byte-capped compressed rewind cache retaining init/RAP dependencies and invalidating source/configuration epochs. |
| performance | blocked | No relevant candidate correctness pass; no performance inference from source reports or existing-owner counters. |
| results | passed | Referenced evidence read and byte-pinned; historical claims remain imported, no new experiment inferred. |
| decision | passed | Normalized disposition preserves prior scoped scientific verdict and names the next missing gate. |

[Reconciliation](../../shared/runs/20260919T202508Z-r101-250-stage-reconciliation/run.json) · [Current metadata](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json)

Setup/fixture/environment blocks are not experimental failures. Integration and release qualification remain separate; historical definitions and bytes are retained.
