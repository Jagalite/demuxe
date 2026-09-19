<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Retime existing frames without creating new pictures

Current decision: **pursue**. Explicit2x held/slower presentation patches timing without adding pictures:24 original compressed samples and decoded frames retained, every PTS/DTS/duration doubles. No motion interpolation or default rate change.

Historical stage reconciliation; no new experiment.

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | Existing fixture/tool/runtime results and archived output/control identities reconciled; no new setup claimed. |
| screen | passed | Historical bounded screening disposition recorded. This is completion of screening, not candidate correctness. |
| correctness | passed | All24 unchanged coded samples and decoded frames match; every PTS/DTS/duration doubles. Wrong skeleton/zero duration rejected by shared constructor. Pure fixed-template retime only. |
| performance | not_applicable | Explicit altered timing capability; no performance saving claim or benchmark required for this decision. |
| results | passed | Archived observations and hashes reconciled, prior mismatches retained explicitly; no new execution. |
| decision | passed | Normalized historical scoped decision with stage-specific acceptance and remaining limitations. |

Next: Find where bytes/timestamps actually change, are copied, or are withheld. Compare against current persistent mux/parser behavior.

[Definition and state](item.json) · [History](history.jsonl) · [Evidence](evidence/index.json)
