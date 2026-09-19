<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Extract embedded ASS while leaving video Native

Current disposition: **pursue**. Historical execution reconciled; no new media run.

Restricted Matroska range reader extracts3 ASS cues and exact attached font with764367bytes read from7.87MB source under2MiB cap, skipping media payloads. Actual libass tiles match independent demux on correct muxed timeline, including long active cue15s, rewind and stale publication guard.8372 tiny reads need coalescing before remote use; no default Native admission.

Correctness: **passed**. Performance: **pending**.

Restricted Matroska extraction returns three cues and exact font, bounded 764367/7873050 bytes. Actual libass agrees with independent demux at seven times including long active cue and rewind; stale output rejects and worker closes. 8372 tiny reads remain a cost issue, not a failed output gate.

Next: Coalesce remote reads under unchanged cue/font budget and measure end-to-end extraction; preserve muxed timeline oracle.

[Current record](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json) · [Acceptance review](../../shared/runs/20260919T201644Z-top100-31-65-reconciliation/analysis.md)
