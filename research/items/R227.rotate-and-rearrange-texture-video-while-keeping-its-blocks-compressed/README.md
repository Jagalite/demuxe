<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Rotate and rearrange texture video while keeping its blocks compressed

Current disposition: **blocked** — **setup** prerequisite. Historical review; no new media execution.

Current texture uploads are uncompressed YUV/RGBA, not BC1/BC3 video blocks. Shared GPU compression support is only a capability; source secondary compression and selector permutation are new format infrastructure. New R195 ETC1S→BC1/BC3 run now provides a usable synthetic compressed-texture fixture and GPU renderer; this does not implement the required block/selector spatial permutation or BC3 alpha transform.

Prepare: **blocked**. Correctness: **blocked**. Performance: **blocked**.

Next: Reuse research/items/R195.prepared-texture-video-to-several-gpu-destinations/evidence/20260919T200653Z-basis compressed fixtures to implement bounded block/selector permutation, comparing decode-transform output and partial-edge/BC3-alpha controls.

[Current record](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json) · [Review](../../shared/runs/20260919T202334Z-ranks251-392-reconciliation/analysis.md)
