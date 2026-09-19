<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Join, split or reorder independent FLAC channel subframes

Full identity: `R103.join-split-or-reorder-independent-flac-channel-subframes`. Original rank: 203.

Current decision: **blocked** (reconciled from **DEFER_SETUP**). No new media execution.

Maintained FLAC path decodes selected audio and admits mono/stereo; no residual-bit parser exposes independent subframes. Compressed channel selection is distinct from whole-track selection and needs new bounded framing/layout logic.

No matching candidate/reference/control execution for this exact gate. Independent-channel FLAC subframe bit-range parser, layout writer and decorrelated-stereo rejection.

Next action: Parse one independently coded four-channel FLAC and copy two complete subframe bit ranges; compare every sample with decode-select-reencode and reject mid/side or mismatched blocks. Compare the smallest bounded component with its independent output oracle; production API absence alone does not preclude the experiment.

## Stages

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | blocked | Unperformed setup gate: Independent-channel FLAC subframe bit-range parser, layout writer and decorrelated-stereo rejection. |
| screen | passed | Existing source/prerequisite/experimental screen reviewed; scientific verdict preserved at its exact scope. |
| correctness | blocked | No matching candidate/reference/control execution for this exact gate. Independent-channel FLAC subframe bit-range parser, layout writer and decorrelated-stereo rejection. |
| performance | blocked | No relevant candidate correctness pass; no performance inference from source reports or existing-owner counters. |
| results | passed | Referenced evidence read and byte-pinned; historical claims remain imported, no new experiment inferred. |
| decision | passed | Normalized disposition preserves prior scoped scientific verdict and names the next missing gate. |

[Reconciliation](../../shared/runs/20260919T202508Z-r101-250-stage-reconciliation/run.json) · [Current metadata](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json)

Setup/fixture/environment blocks are not experimental failures. Integration and release qualification remain separate; historical definitions and bytes are retained.
