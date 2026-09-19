<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Range-fetch directly to a Matroska block inside a large Cluster

Full identity: `R321.range-fetch-directly-to-a-matroska-block-inside-a-large-cluster`. Original rank: 170.

Current decision: **blocked** (reconciled from **DEFER_SETUP**). No new media execution.

Current small-cluster fixture has no expensive prefix worth bypassing. The current reader already starts misses at requested offsets; demonstrating additional value needs an exact large-Cluster CueRelativePosition seek trace and dependent-frame control. Defer that fixture/index setup; do not treat unknown opportunity as a failed block-relative seek.

No matching candidate/reference/control execution for this exact gate. Large-Cluster CueRelativePosition trace and exact target/dependency oracle; present small clusters cannot expose the intended saving.

Next action: Next missing gate: Large-Cluster CueRelativePosition trace and exact target/dependency oracle; present small clusters cannot expose the intended saving. Compare the smallest bounded component with its independent output oracle; production API absence alone does not preclude the experiment.

## Stages

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | blocked | Unperformed fixture gate: Large-Cluster CueRelativePosition trace and exact target/dependency oracle; present small clusters cannot expose the intended saving. |
| screen | passed | Existing source/prerequisite/experimental screen reviewed; scientific verdict preserved at its exact scope. |
| correctness | blocked | No matching candidate/reference/control execution for this exact gate. Large-Cluster CueRelativePosition trace and exact target/dependency oracle; present small clusters cannot expose the intended saving. |
| performance | blocked | No relevant candidate correctness pass; no performance inference from source reports or existing-owner counters. |
| results | passed | Referenced evidence read and byte-pinned; historical claims remain imported, no new experiment inferred. |
| decision | passed | Normalized disposition preserves prior scoped scientific verdict and names the next missing gate. |

[Reconciliation](../../shared/runs/20260919T202508Z-r101-250-stage-reconciliation/run.json) · [Current metadata](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json)

Setup/fixture/environment blocks are not experimental failures. Integration and release qualification remain separate; historical definitions and bytes are retained.
