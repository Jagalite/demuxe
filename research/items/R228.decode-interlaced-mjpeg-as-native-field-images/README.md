<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Decode interlaced MJPEG as native field images

Current disposition: **blocked** — **setup** prerequisite. Historical review; no new media execution.

Video configuration and presentation do not expose a JPEG-field parser or field-time compositor. Current image dimensions alone cannot distinguish temporally separate interlaced fields; weaving would not satisfy the requested deinterlacing output.

Prepare: **blocked**. Correctness: **blocked**. Performance: **blocked**.

Next: Extract two known opposite field identifiers and compare field order/timing with the software decoder before browser image decoding integration.

[Current record](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json) · [Review](../../shared/runs/20260919T202334Z-ranks251-392-reconciliation/analysis.md)
