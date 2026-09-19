<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Cache bounded decoded previews for scrub revisits

Full identity: `R055.cache-bounded-decoded-previews-for-scrub-revisits`. Original rank: 154.

Current decision: **blocked** (reconciled from **DEFER_SETUP**). No new media execution.

UI seek-preview means visibility of controls, not generated image previews. No requested thumbnail producer/cache exists; adding a second decoder merely to measure cache hits exceeds first-pass scope.

No matching candidate/reference/control execution for this exact gate. Bounded approximate preview producer/cache contract with source-time keys and stale-capture rejection.

Next action: Specify eight-image/byte-capped approximate preview API and source/time key; evaluate one reverse gesture only after producer exists, rejecting late old-source capture. Compare the smallest bounded component with its independent output oracle; production API absence alone does not preclude the experiment.

## Stages

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | blocked | Unperformed setup gate: Bounded approximate preview producer/cache contract with source-time keys and stale-capture rejection. |
| screen | passed | Existing source/prerequisite/experimental screen reviewed; scientific verdict preserved at its exact scope. |
| correctness | blocked | No matching candidate/reference/control execution for this exact gate. Bounded approximate preview producer/cache contract with source-time keys and stale-capture rejection. |
| performance | blocked | No relevant candidate correctness pass; no performance inference from source reports or existing-owner counters. |
| results | passed | Referenced evidence read and byte-pinned; historical claims remain imported, no new experiment inferred. |
| decision | passed | Normalized disposition preserves prior scoped scientific verdict and names the next missing gate. |

[Reconciliation](../../shared/runs/20260919T202508Z-r101-250-stage-reconciliation/run.json) · [Current metadata](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json)

Setup/fixture/environment blocks are not experimental failures. Integration and release qualification remain separate; historical definitions and bytes are retained.
