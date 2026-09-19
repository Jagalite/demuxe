<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# WebM negative DiscardPadding head-crop composition [report paragraph label]

Current decision: **pursue**. Corrected prior transcription: Chrome native decode applies requested additional480-sample head trim exactly, output95520 samples; host FFmpeg output stays unchanged96000 despite identical packet payloads. Browser composition is viable for this profile, but cross-decoder trim semantics/oracle divergence must be resolved before integration. No universal trimming rule.

Historical stage reconciliation; no new experiment.

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | Existing fixture/tool/runtime results and archived output/control identities reconciled; no new setup claimed. |
| screen | passed | Historical bounded screening disposition recorded. This is completion of screening, not candidate correctness. |
| correctness | pending | Chrome exactly applies additional480sample head trim to95520frames while independent FFmpeg remains96000. Cross-decoder semantic divergence is unresolved, not a passed universal trim oracle. |
| performance | not_applicable | Resolve trim correctness/oracle disagreement before any performance question. |
| results | passed | Archived observations and hashes reconciled, prior mismatches retained explicitly; no new execution. |
| decision | passed | Normalized historical scoped decision with stage-specific acceptance and remaining limitations. |

Next: Find where bytes/timestamps actually change, are copied, or are withheld. Compare against current persistent mux/parser behavior.

[Definition and state](item.json) · [History](history.jsonl) · [Evidence](evidence/index.json)
