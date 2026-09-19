<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Transfer owned packet storage into WebCodecs chunks

Current decision: **pursue**. Reconciled completed prior evidence: Whole-owned packet transfer detaches input, preserves chunk bytes and matches independent decoded I420. Shared heaps and oversized subviews reject at the candidate ownership guard. Normal maintained VP9 path already has zero owned packet bytes, so pursue only measured fallback/prefix branches, not global copying changes.

Historical stage reconciliation; no new experiment.

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | Existing fixture/tool/runtime results and archived output/control identities reconciled; no new setup claimed. |
| screen | passed | Historical bounded screening disposition recorded. This is completion of screening, not candidate correctness. |
| correctness | passed | Whole-owned packet transfer detaches input, chunk bytes and independent decodedI420 match; shared heap/oversized-subview guards reject. Scope ownership boundary, not global worker copy elimination. |
| performance | pending | Maintained ordinary VP9 trace has zero owned packet bytes; measure fallback/prefix branch exposure before timing. |
| results | passed | Archived observations and hashes reconciled, prior mismatches retained explicitly; no new execution. |
| decision | passed | Normalized historical scoped decision with stage-specific acceptance and remaining limitations. |

Next: Find where bytes/timestamps actually change, are copied, or are withheld. Compare against current persistent mux/parser behavior.

[Definition and state](item.json) · [History](history.jsonl) · [Evidence](evidence/index.json)
