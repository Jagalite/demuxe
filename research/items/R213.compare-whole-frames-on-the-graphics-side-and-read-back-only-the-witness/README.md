<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Compare whole frames on the graphics side and read back only the witness

Current decision: **pursue**. Actual GPU atomic difference witness scans all 15360 resident RGBA pixels with four-byte readback. Equal frame and first/middle/last changed pixels match CPU oracle. Opportunity restricted to pixels already on GPU; no measured whole-player savings.

Historical stage reconciliation; no new experiment.

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | Existing fixture/tool/runtime results and archived output/control identities reconciled; no new setup claimed. |
| screen | passed | Historical bounded screening disposition recorded. This is completion of screening, not candidate correctness. |
| correctness | passed | Actual GPU all15360resident RGBA pixels checked; equal and first/middle/last changes match CPUoracle; four-byte witness readback and cleanup/errors recorded. Resident-pixel scope only. |
| performance | pending | No CPU/latency/transfer benchmark; uploading solely for compare could erase benefit. |
| results | passed | Archived observations and hashes reconciled, prior mismatches retained explicitly; no new execution. |
| decision | passed | Normalized historical scoped decision with stage-specific acceptance and remaining limitations. |

Next: Trace the precise owner, generation, reset/flush/commit or allocation being changed. Reproduce the present behavior before removing any guard.

[Definition and state](item.json) · [History](history.jsonl) · [Evidence](evidence/index.json)
