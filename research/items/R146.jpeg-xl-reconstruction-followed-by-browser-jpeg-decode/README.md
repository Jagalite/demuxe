<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# JPEG XL reconstruction followed by browser JPEG decode

Current disposition: **blocked** — **setup** prerequisite. Historical review; no new media execution.

Current video route exposes codec frames, not a JPEG XL original-JPEG reconstruction adapter followed by browser image decode. A libjxl source file in dependency tree is not proof the required Wasm API is built/available.

Prepare: **blocked**. Correctness: **blocked**. Performance: **blocked**.

Next: Establish one bounded libjxl reconstruction API artifact and genuine JPEG-origin JXL fixture; exact JPEG hash then browser image equality, rejecting missing metadata/truncation/oversized output.

[Current record](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json) · [Review](../../shared/runs/20260919T202334Z-ranks251-392-reconciliation/analysis.md)
