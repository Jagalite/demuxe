<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Decode RAW sensor data once; develop the picture during playback

Current disposition: **blocked** — **setup** prerequisite. Historical review; no new media execution.

Presenter receives decoded YUV/RGB; there is no retained Bayer sensor plane, DNG metadata/profile parser or development recipe owner. Existing 601/709 shader is not RAW development.

Prepare: **blocked**. Correctness: **blocked**. Performance: **blocked**.

Next: Scope one RGGB R16 sensor-plane adapter with integer color oracle before UI adjustments; gray-as-RGB and unsupported CFA/layout must fail, counting upload/retention.

[Current record](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json) · [Review](../../shared/runs/20260919T202334Z-ranks251-392-reconciliation/analysis.md)
