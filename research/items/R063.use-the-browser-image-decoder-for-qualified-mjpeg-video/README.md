<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Use the browser image decoder for qualified MJPEG video

Current disposition: **blocked** — **setup** prerequisite. Historical review; no new media execution.

The maintained bridge supports AVC/HEVC/VP8/VP9/AV1 WebCodecs configurations, not an MJPEG image-decoder promise adapter with mpv timing. createImageBitmap availability alone would repeat a known primitive. Genuine AVI1 table normalization, color/field/orientation and stale-result ownership are not implemented.

Prepare: **blocked**. Correctness: **blocked**. Performance: **blocked**.

Next: Scope self-contained JPEG followed by one genuine AVI1/default-table frame through a bounded image promise adapter; compare decoded geometry/color to a fixed oracle and close stale results after source replacement, without adding an independent audio clock.

[Current record](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json) · [Review](../../shared/runs/20260919T202334Z-ranks251-392-reconciliation/analysis.md)
