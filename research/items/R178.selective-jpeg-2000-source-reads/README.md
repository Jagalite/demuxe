<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# selective JPEG 2000 source reads

Current disposition: **blocked** — **setup** prerequisite. Historical review; no new media execution.

RangeReader can fetch bounded offsets, but current software output is complete decoded image and no OpenJPEG decode-area callback/index adapter exists. Historical quality/reduce constraints did not reduce bytes inside the same tile.

Prepare: **blocked**. Correctness: **blocked**. Performance: **blocked**.

Next: Define source-bound tile/packet mapping and one OpenJPEG callback adapter; compare two corner ROIs and full-image reduced-resolution control, counting unique bytes rather than decoder calls.

[Current record](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json) · [Review](../../shared/runs/20260919T202334Z-ranks251-392-reconciliation/analysis.md)
