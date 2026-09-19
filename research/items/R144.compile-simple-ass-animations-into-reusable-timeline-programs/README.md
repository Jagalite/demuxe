<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Compile simple ASS animations into reusable timeline programs

Current decision: **pursue**. Restricted fad animation reused two opacity-regime mask templates plus piecewise alpha; matches actual libass geometry/masks with at most one alpha unit at seven times including rewind. Single-mask variant fails because libass changes outline mask when fill becomes opaque. No general ASS compiler or measured gain.

Historical stage reconciliation; no new experiment.

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | Existing fixture/tool/runtime results and archived output/control identities reconciled; no new setup claimed. |
| screen | passed | Historical bounded screening disposition recorded. This is completion of screening, not candidate correctness. |
| correctness | passed | Two opacity-regime templates match real libass masks/geometry with≤1alpha-unit error at seven times including rewind; preserved single-mask variant fails. Restricted fad program only. |
| performance | pending | No compilation/cache/retention/CPU workload benchmark or generalASS claim. |
| results | passed | Archived observations and hashes reconciled, prior mismatches retained explicitly; no new execution. |
| decision | passed | Normalized historical scoped decision with stage-specific acceptance and remaining limitations. |

Next: Identify the exact subtitle representation, maintained renderer and existing cache behavior. Distinguish an oracle discrepancy from a player defect.

[Definition and state](item.json) · [History](history.jsonl) · [Evidence](evidence/index.json)
