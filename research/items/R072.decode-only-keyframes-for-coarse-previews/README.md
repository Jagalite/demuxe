<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Decode only keyframes for coarse previews

Full identity: `R072.decode-only-keyframes-for-coarse-previews`. Original rank: 158.

Current decision: **blocked** (reconciled from **DEFER_SETUP**). No new media execution.

No maintained coarse-preview service or explicit skip_frame policy exists. Historical host hashes/CPU support a coarse-only experiment, not a browser result or permission to alter playback decoding.

No matching candidate/reference/control execution for this exact gate. Explicit coarse-only preview job with open-GOP/non-key rejection, separate from exact playback.

Next action: Define one source-scoped coarse preview job and use existing decode harness only after that API exists; open-GOP/non-key request must not masquerade as exact seek. Compare the smallest bounded component with its independent output oracle; production API absence alone does not preclude the experiment.

## Stages

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | blocked | Unperformed setup gate: Explicit coarse-only preview job with open-GOP/non-key rejection, separate from exact playback. |
| screen | passed | Existing source/prerequisite/experimental screen reviewed; scientific verdict preserved at its exact scope. |
| correctness | blocked | No matching candidate/reference/control execution for this exact gate. Explicit coarse-only preview job with open-GOP/non-key rejection, separate from exact playback. |
| performance | blocked | No relevant candidate correctness pass; no performance inference from source reports or existing-owner counters. |
| results | passed | Referenced evidence read and byte-pinned; historical claims remain imported, no new experiment inferred. |
| decision | passed | Normalized disposition preserves prior scoped scientific verdict and names the next missing gate. |

[Reconciliation](../../shared/runs/20260919T202508Z-r101-250-stage-reconciliation/run.json) · [Current metadata](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json)

Setup/fixture/environment blocks are not experimental failures. Integration and release qualification remain separate; historical definitions and bytes are retained.
