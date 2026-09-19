<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# incremental mdat sample release

Current decision: **pursue**. Actual Chrome emits presented video frames from12 complete coded samples while mdat tail is withheld; first sample truncated by1byte presents0frames until remainder arrives. Both complete to EOF and clean up.

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | Authored or reused hashed synthetic fixture, executable component and independent reference/control for scoped screen. |
| screen | passed | Actual Chrome emits presented video frames from12 complete coded samples while mdat tail is withheld; first sample truncated by1byte presents0frames until remainder arrives. Both complete to EOF and clean up. |
| correctness | pending | Browser parser feasibility with callbacks and adverse incomplete sample passes; source-produced streaming output and complete fidelity/lifecycle remain unqualified. |
| performance | pending | No equivalent-work benchmark or owner opportunity measurement. |
| results | passed | Immutable positive/negative evidence and manifests registered. |
| decision | passed | Scoped pursue; remaining gate and actual owner opportunity explicit. |

Next: Expose truthful early fragment metadata/sample production from the actual streaming mux owner; add A/V and independent pixel oracle before route or latency claims.

[Contract](item.json) · [History](history.jsonl) · [Evidence](evidence/index.json)
