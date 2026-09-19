<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Crop or transform MJPEG in the coefficient domain

Current disposition: **blocked** — **setup** prerequisite. Historical review; no new media execution.

The current native/browser video codec bridge has no MJPEG coefficient transform or JPEG image-decode adapter. Display crop/rotation already occurs in the shader without rewriting media. A required transformed asset needs a coefficient-domain component and iMCU/orientation contract, not another display transform.

Prepare: **blocked**. Correctness: **blocked**. Performance: **blocked**.

Next: For a requested transformed MJPEG asset, use a perfect aligned grayscale JPEG crop as one component and compare retained coefficients plus decoded geometry; misaligned/edge transforms must reject rather than expand silently.

[Current record](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json) · [Review](../../shared/runs/20260919T202334Z-ranks251-392-reconciliation/analysis.md)
