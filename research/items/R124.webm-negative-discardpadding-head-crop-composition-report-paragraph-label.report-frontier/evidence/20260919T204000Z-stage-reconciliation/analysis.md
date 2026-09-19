<!-- SPDX-License-Identifier: CC-BY-4.0 -->

Historical evidence reviewed and hashed; no experiment rerun.

Correctness: pending. Chrome exactly applies additional480sample head trim to95520frames while independent FFmpeg remains96000. Cross-decoder semantic divergence is unresolved, not a passed universal trim oracle.

Performance: not_applicable. Resolve trim correctness/oracle disagreement before any performance question.

Prior finding remains scoped: Corrected prior transcription: Chrome native decode applies requested additional480-sample head trim exactly, output95520 samples; host FFmpeg output stays unchanged96000 despite identical packet payloads. Browser composition is viable for this profile, but cross-decoder trim semantics/oracle divergence must be resolved before integration. No universal trimming rule.

Production integration and release qualification remain separate.
