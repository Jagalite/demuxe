<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# H.264 self-contained IDR suffix

Current disposition: **pursue**. Historical review; no new media execution.

Host FFmpeg 8.1.2 decodes 48-frame SPS/PPS/IDR suffix exactly against full 72-frame reference. Missing configuration returns decode failure; dependent entry exits zero but yields wrong suffix and correctly fails oracle. This is host component, not pinned-Wasm/browser seek execution.

Prepare: **passed**. Correctness: **passed**. Performance: **pending**.

Next: Test actual target decoder/transport while including configuration discovery and scanning costs; preserve dependent-entry wrong-output control.

[Current record](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json) · [Review](../../shared/runs/20260919T202334Z-ranks251-392-reconciliation/analysis.md)
