<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Process only the audio region that an explicitly requested crossfade changes

Current disposition: **blocked** — **setup** prerequisite. Historical review; no new media execution.

Current API exposes filters/gain and sequential queue playback, not an authorized crossfade source-to-presentation map or hybrid copied/new FLAC seam construction. Processing only a seam requires independent FLAC numbering/configuration and audio/video/caption overlap semantics. General allow-lossy admission is not that authorization.

Prepare: **blocked**. Correctness: **blocked**. Performance: **blocked**.

Next: Define one explicit equal-rate PCM/FLAC crossfade contract; compare a frame-aligned copied/processed seam with a full-render integer-rounding oracle, rejecting mixed rates and preserving unchanged video/audio outside the seam.

[Current record](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json) · [Review](../../shared/runs/20260919T202334Z-ranks251-392-reconciliation/analysis.md)
