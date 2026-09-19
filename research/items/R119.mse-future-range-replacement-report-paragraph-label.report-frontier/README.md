<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# MSE future-range replacement [report paragraph label]

Current decision: **pursue**. Future RAP-aligned range replacement changes red to green after2s while retaining SourceBuffer. Stale canceled transaction leaves buffered ranges unchanged; valid commit plays to EOF. Video-only component; current combined A/V controller not integrated.

Historical stage reconciliation; no new experiment.

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | Existing fixture/tool/runtime results and archived output/control identities reconciled; no new setup claimed. |
| screen | passed | Historical bounded screening disposition recorded. This is completion of screening, not candidate correctness. |
| correctness | pending | Future red→green replacement and stale generation range preservation verified to EOF; exact full-frame/A/V boundary and real failed-append rollback remain unqualified. |
| performance | pending | Presentation transaction has no equivalent-work timing or memory benchmark. |
| results | passed | Archived observations and hashes reconciled, prior mismatches retained explicitly; no new execution. |
| decision | passed | Normalized historical scoped decision with stage-specific acceptance and remaining limitations. |

Next: Trace the precise owner, generation, reset/flush/commit or allocation being changed. Reproduce the present behavior before removing any guard.

[Definition and state](item.json) · [History](history.jsonl) · [Evidence](evidence/index.json)
