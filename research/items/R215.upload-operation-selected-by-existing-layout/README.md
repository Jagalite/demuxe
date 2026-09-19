<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# upload operation selected by existing layout

Current decision: **pursue**. Reconciled completed prior evidence: A direct stride-aware heap upload produces byte-identical GL pixels, removes120 JavaScript row-copy bytes for the tested frame, restores row state and rejects short stride. Driver copies and CPU benefit remain unmeasured.

Historical stage reconciliation; no new experiment.

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | Existing fixture/tool/runtime results and archived output/control identities reconciled; no new setup claimed. |
| screen | passed | Historical bounded screening disposition recorded. This is completion of screening, not candidate correctness. |
| correctness | passed | Actual stride-awareGL pixels byte-identical to checkerboard reference; badstride rejects, row state restored and frame closes. Black/whiteSDR only. |
| performance | pending | 120JS-copy bytes removed is not CPU saving; driver copies/color/HDR remain outside scope. |
| results | passed | Archived observations and hashes reconciled, prior mismatches retained explicitly; no new execution. |
| decision | passed | Normalized historical scoped decision with stage-specific acceptance and remaining limitations. |

Next: Identify the CPU/GPU representation boundary and actual useful work removed. Check existing renderer fusions, caches, kernel fast paths and hardware gates.

[Definition and state](item.json) · [History](history.jsonl) · [Evidence](evidence/index.json)
