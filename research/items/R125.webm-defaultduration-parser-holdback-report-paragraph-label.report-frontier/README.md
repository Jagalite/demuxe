<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# WebM DefaultDuration parser holdback [report paragraph label]

Current decision: **pursue**. Reconciled completed prior evidence: Truthful 100ms VP8 DefaultDuration yields one early frame and [0,0.1] range from the first block. Replacing only this metadata with same-size Void yields neither until remaining bytes arrive. Worth retaining as parser-availability regression coverage; does not justify inventing VFR durations or claim a missing maintained mux feature.

Historical stage reconciliation; no new experiment.

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | Existing fixture/tool/runtime results and archived output/control identities reconciled; no new setup claimed. |
| screen | passed | Historical bounded screening disposition recorded. This is completion of screening, not candidate correctness. |
| correctness | passed | VP8 first-block DefaultDuration100ms exposes one frame/[0,.1]range; same-size Void adverse variant exposes none until tail. Both EOF and cleanup recorded. Parser-availability regression scope only; VP9 cases do not show same benefit. |
| performance | not_applicable | Regression-only parser behavior; no fabricatedVFR duration or maintained-mux speed claim. |
| results | passed | Archived observations and hashes reconciled, prior mismatches retained explicitly; no new execution. |
| decision | passed | Normalized historical scoped decision with stage-specific acceptance and remaining limitations. |

Next: Find where bytes/timestamps actually change, are copied, or are withheld. Compare against current persistent mux/parser behavior.

[Definition and state](item.json) · [History](history.jsonl) · [Evidence](evidence/index.json)
