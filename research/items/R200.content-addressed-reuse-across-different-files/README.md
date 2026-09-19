<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# content-addressed reuse across different files

Current decision: **pursue**. Two different owned file wrappers share exact coded packets/configuration through bounded content-addressed entries, retaining source timelines separately. Poisoned digest entry rejects, changed configuration misses, all references released. No workload benefit or cross-authority reuse claim.

Historical stage reconciliation; no new experiment.

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | Existing fixture/tool/runtime results and archived output/control identities reconciled; no new setup claimed. |
| screen | passed | Historical bounded screening disposition recorded. This is completion of screening, not candidate correctness. |
| correctness | passed | Different owned wrappers share exact coded packets/config; poisoned entry rejects, changed config misses and all owner refs release. Per-source timelines kept separate; no cross-authority claim. |
| performance | pending | 45hits/806retained vs4552logical bytes is a work count; hash/lookup/retention/real workload costs unmeasured. |
| results | passed | Archived observations and hashes reconciled, prior mismatches retained explicitly; no new execution. |
| decision | passed | Normalized historical scoped decision with stage-specific acceptance and remaining limitations. |

Next: Trace the precise owner, generation, reset/flush/commit or allocation being changed. Reproduce the present behavior before removing any guard.

[Definition and state](item.json) · [History](history.jsonl) · [Evidence](evidence/index.json)
