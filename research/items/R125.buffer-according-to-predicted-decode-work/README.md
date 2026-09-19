<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Buffer according to predicted decode work

Current decision: **pursue**. Correct72-frame serialized decode trace: packet-size linear model lowered held-out latency MAE versus constant prediction on24 held-out frames. Tiny synthetic trace only; predictive buffering controller and representative difficult-region value remain future confirmation.

Historical stage reconciliation; no new experiment.

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | Existing fixture/tool/runtime results and archived output/control identities reconciled; no new setup claimed. |
| screen | passed | Historical bounded screening disposition recorded. This is completion of screening, not candidate correctness. |
| correctness | pending | Serialized72-frame decoder trace is correct and47-training/24-held-out packet-size prediction improvesMAE. No buffering-controller output/lifecycle experiment; prediction evidence is not controller correctness. |
| performance | pending | One tiny trace and no controller benefit, repeated representative workloads or decision threshold. |
| results | passed | Archived observations and hashes reconciled, prior mismatches retained explicitly; no new execution. |
| decision | passed | Normalized historical scoped decision with stage-specific acceptance and remaining limitations. |

Next: Trace the precise owner, generation, reset/flush/commit or allocation being changed. Reproduce the present behavior before removing any guard.

[Definition and state](item.json) · [History](history.jsonl) · [Evidence](evidence/index.json)
