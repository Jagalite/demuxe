<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# independently checkable remux construction record

Current decision: **pursue**. Reconciled completed prior evidence: Independent source/output byte ranges, packet timestamps and config hashes validate214 packets and reject wrong offset, swapped range, timing, configuration and stale source. Useful reproducible remux audit artifact, not performance gain.

Historical stage reconciliation; no new experiment.

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | Existing fixture/tool/runtime results and archived output/control identities reconciled; no new setup claimed. |
| screen | passed | Historical bounded screening disposition recorded. This is completion of screening, not candidate correctness. |
| correctness | passed | Independent byte ranges/config/timestamps validate214packets; wrongoffset, swappedrange, wrongtime/config and stale-source controls reject. Pure local construction audit, not universal mux/source authority proof. |
| performance | not_applicable | Audit reproducibility capability, no performance gain claimed. |
| results | passed | Archived observations and hashes reconciled, prior mismatches retained explicitly; no new execution. |
| decision | passed | Normalized historical scoped decision with stage-specific acceptance and remaining limitations. |

Next: Find where bytes/timestamps actually change, are copied, or are withheld. Compare against current persistent mux/parser behavior.

[Definition and state](item.json) · [History](history.jsonl) · [Evidence](evidence/index.json)
