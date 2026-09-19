<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Copy a frame once to free the decoder

Current decision: **stop_current_profile**. Reconciled completed prior evidence: Copying one decoded frame to owned I420 preserves redraw after decoder closure, at 23040 additional copied bytes for this tiny frame. Existing held-frame ownership is bounded and no decoder surface-pressure evidence exists. Do not add routine copies without a trace showing blocked decoder surfaces.

Historical stage reconciliation; no new experiment.

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | Existing fixture/tool/runtime results and archived output/control identities reconciled; no new setup claimed. |
| screen | passed | Historical bounded screening disposition recorded. This is completion of screening, not candidate correctness. |
| correctness | passed | Owned I420 redraw matches reference after decoder closure, with23040copied bytes; this establishes one-frame ownership feasibility, not surface pressure relief. |
| performance | not_applicable | Stop current profile: bounded existing held frame and no pressure trace justify no routine copy or benchmark. |
| results | passed | Archived observations and hashes reconciled, prior mismatches retained explicitly; no new execution. |
| decision | passed | Normalized historical scoped decision with stage-specific acceptance and remaining limitations. |

Next: Trace the precise owner, generation, reset/flush/commit or allocation being changed. Reproduce the present behavior before removing any guard.

[Definition and state](item.json) · [History](history.jsonl) · [Evidence](evidence/index.json)
