<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# FLAC bit-depth promotion without sample reconstruction

Full identity: `R174.flac-bit-depth-promotion-without-sample-reconstruction`. Original rank: 195.

Current decision: **blocked** (reconciled from **DEFER_SETUP**). No new media execution.

Current FLAC admission requires established 16/24-bit integer precision and ordinary encode, so 20-bit framing promotion is not present. The one-frame mono result needs a bounded subframe parser and truthful STREAMINFO/CRC rewriting.

No matching candidate/reference/control execution for this exact gate. Bounded FLAC subframe/wasted-bit parser and truthful20-to24-bit promotion controls; new framing helper does not parse residuals.

Next action: Prototype only independent mono 20-to-24 wasted-bit promotion and compare normalized exact samples, rejecting decorrelated stereo and malformed residual bounds. Compare the smallest bounded component with its independent output oracle; production API absence alone does not preclude the experiment.

## Stages

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | blocked | Unperformed setup gate: Bounded FLAC subframe/wasted-bit parser and truthful20-to24-bit promotion controls; new framing helper does not parse residuals. |
| screen | passed | Existing source/prerequisite/experimental screen reviewed; scientific verdict preserved at its exact scope. |
| correctness | blocked | No matching candidate/reference/control execution for this exact gate. Bounded FLAC subframe/wasted-bit parser and truthful20-to24-bit promotion controls; new framing helper does not parse residuals. |
| performance | blocked | No relevant candidate correctness pass; no performance inference from source reports or existing-owner counters. |
| results | passed | Referenced evidence read and byte-pinned; historical claims remain imported, no new experiment inferred. |
| decision | passed | Normalized disposition preserves prior scoped scientific verdict and names the next missing gate. |

[Reconciliation](../../shared/runs/20260919T202508Z-r101-250-stage-reconciliation/run.json) · [Current metadata](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json)

Setup/fixture/environment blocks are not experimental failures. Integration and release qualification remain separate; historical definitions and bytes are retained.
