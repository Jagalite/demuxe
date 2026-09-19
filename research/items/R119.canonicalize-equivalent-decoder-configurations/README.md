<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Canonicalize equivalent decoder configurations

Current decision: **pursue**. Exact duplicate AVC SPS/PPS entries canonicalize to one copy, preserving48 browser-decoded frames and PTS against independent host oracle; same-ID changed SPS rejects. No semantic equivalence beyond exact duplicate parameter bytes; source reset still required.

Historical stage reconciliation; no new experiment.

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | Existing fixture/tool/runtime results and archived output/control identities reconciled; no new setup claimed. |
| screen | passed | Historical bounded screening disposition recorded. This is completion of screening, not candidate correctness. |
| correctness | passed | Exact duplicate SPS/PPS bytes canonicalize69→38description bytes; two48-frame browser decodes match independent pixels/timestamps; same-ID changed SPS rejects and cleanup recorded. Only byte-identical duplicates. |
| performance | pending | No repeated reconfiguration cost/workload benefit measured. |
| results | passed | Archived observations and hashes reconciled, prior mismatches retained explicitly; no new execution. |
| decision | passed | Normalized historical scoped decision with stage-specific acceptance and remaining limitations. |

Next: Find where bytes/timestamps actually change, are copied, or are withheld. Compare against current persistent mux/parser behavior.

[Definition and state](item.json) · [History](history.jsonl) · [Evidence](evidence/index.json)
