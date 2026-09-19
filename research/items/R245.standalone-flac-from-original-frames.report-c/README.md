<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# standalone FLAC from original frames

Full identity: `R245.standalone-flac-from-original-frames.report-c`. Original rank: 225.

Current decision: **blocked** (reconciled from **DEFER_SETUP**). No new media execution.

Historical defer retained for the exact complete-frame identity gate. Complete original-frame excerpt profile with unchanged full frame hashes, truthful totals/checksum and browser duration/PCM. R270 setup is reusable but its rewritten headers are a different identity contract.

No matching candidate/reference/control execution for this exact gate. Complete original-frame excerpt profile with unchanged full frame hashes, truthful totals/checksum and browser duration/PCM. R270 setup is reusable but its rewritten headers are a different identity contract.

Next action: Implement one complete-frame excerpt writer only when requested, correct total samples/checksum, and compare frame payloads, PCM, duration and corrupted CRC rejection. Compare the smallest bounded component with its independent output oracle; production API absence alone does not preclude the experiment.

## Stages

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | blocked | Unperformed setup gate: Complete original-frame excerpt profile with unchanged full frame hashes, truthful totals/checksum and browser duration/PCM. R270 setup is reusable but its rewritten headers are a different identity contract. |
| screen | passed | Existing source/prerequisite/experimental screen reviewed; scientific verdict preserved at its exact scope. |
| correctness | blocked | No matching candidate/reference/control execution for this exact gate. Complete original-frame excerpt profile with unchanged full frame hashes, truthful totals/checksum and browser duration/PCM. R270 setup is reusable but its rewritten headers are a different identity contract. |
| performance | blocked | No relevant candidate correctness pass; no performance inference from source reports or existing-owner counters. |
| results | passed | Referenced evidence read and byte-pinned; historical claims remain imported, no new experiment inferred. |
| decision | passed | Normalized disposition preserves prior scoped scientific verdict and names the next missing gate. |

[Reconciliation](../../shared/runs/20260919T202508Z-r101-250-stage-reconciliation/run.json) · [Current metadata](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json)

Setup/fixture/environment blocks are not experimental failures. Integration and release qualification remain separate; historical definitions and bytes are retained.
