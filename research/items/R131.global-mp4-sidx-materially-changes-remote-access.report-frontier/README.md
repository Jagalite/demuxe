<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# global MP4 sidx materially changes remote access

Current decision: **pursue**. Reconciled completed prior evidence: Same-size same-packet indexed and unindexed variants reach identical target pixel hashes at 20s. Global index reduces this bounded native request trace from 6656858 to 6296410 bytes. Benefit is modest on this 26-second local fixture; pursue asset-side metadata only with real remote byte/latency exposure.

Historical stage reconciliation; no new experiment.

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | Existing fixture/tool/runtime results and archived output/control identities reconciled; no new setup claimed. |
| screen | passed | Historical bounded screening disposition recorded. This is completion of screening, not candidate correctness. |
| correctness | passed | Same-size index variants preserve2002packet metadata records and identical20s target pixel hash; no-SIDX control and cleanup present. Scoped target seek only. |
| performance | pending | Local transmitted-byte saving360448bytes observed; cold network/latency distribution and deployment exposure unqualified. |
| results | passed | Archived observations and hashes reconciled, prior mismatches retained explicitly; no new execution. |
| decision | passed | Normalized historical scoped decision with stage-specific acceptance and remaining limitations. |

Next: Find where bytes/timestamps actually change, are copied, or are withheld. Compare against current persistent mux/parser behavior.

[Definition and state](item.json) · [History](history.jsonl) · [Evidence](evidence/index.json)
