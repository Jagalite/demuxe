<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Share one demux pass across independent playback and export timelines

Full identity: `R334.share-one-demux-pass-across-independent-playback-and-export-timelines`. Original rank: 118.

Current decision: **blocked** (reconciled from **DEFER_SETUP**). No new media execution.

Current remux mutates packet timestamps and stream index before feeding one mux context; each player owns a separate reader/cursor. A canonical immutable packet broker plus independent output lifetimes is absent. Tee capability alone does not supply dynamic authority, seek or slow-consumer policies.

No matching candidate/reference/control execution for this exact gate. Immutable packet fanout component with two independent mux cursors and slow/cancel isolation.

Next action: Scope two consumers sharing one qualified start and cloned packet wrappers; compare both complete packet/timestamp outputs with independent persistent muxers, and cancel/slow one consumer without mutating the other. Compare the smallest bounded component with its independent output oracle; production API absence alone does not preclude the experiment.

## Stages

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | blocked | Unperformed setup gate: Immutable packet fanout component with two independent mux cursors and slow/cancel isolation. |
| screen | passed | Existing source/prerequisite/experimental screen reviewed; scientific verdict preserved at its exact scope. |
| correctness | blocked | No matching candidate/reference/control execution for this exact gate. Immutable packet fanout component with two independent mux cursors and slow/cancel isolation. |
| performance | blocked | No relevant candidate correctness pass; no performance inference from source reports or existing-owner counters. |
| results | passed | Referenced evidence read and byte-pinned; historical claims remain imported, no new experiment inferred. |
| decision | passed | Normalized disposition preserves prior scoped scientific verdict and names the next missing gate. |

[Reconciliation](../../shared/runs/20260919T202508Z-r101-250-stage-reconciliation/run.json) · [Current metadata](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json)

Setup/fixture/environment blocks are not experimental failures. Integration and release qualification remain separate; historical definitions and bytes are retained.
