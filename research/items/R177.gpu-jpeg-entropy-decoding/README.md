<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# GPU JPEG entropy decoding

Current disposition: **blocked** — **setup** prerequisite. Historical review; no new media execution.

Shared current evidence exposes a real nonfallback Apple WebGPU adapter, so the historical no-GPU/blocked-localhost verdict is no longer the blocker. Existing renderer accepts decoded planes; there is still no GPU JPEG entropy parser/kernel or malformed-input oracle.

Prepare: **blocked**. Correctness: **blocked**. Performance: **blocked**.

Next: Prepare one restart-bounded JPEG entropy segment and independent coefficient oracle, then test a single bounded GPU kernel with truncated/invalid Huffman controls.

[Current record](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json) · [Review](../../shared/runs/20260919T202334Z-ranks251-392-reconciliation/analysis.md)
