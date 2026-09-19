<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# reversible XOR frame cache

Current disposition: **blocked** — **setup** prerequisite. Historical review; no new media execution.

Current retained output is a bounded live VideoFrame map plus one redraw frame; it is not an archive of full decoded reverse-preview frames. A checkpoint/XOR/zlib representation would require an exact decoded-plane cache and eviction owner. The report also shows random data can exceed raw size. New R318 closed-GOP component supplies exact decoded frames; XOR/checkpoint encoding, eviction and growth fallback remain separate unimplemented setup.

Prepare: **blocked**. Correctness: **blocked**. Performance: **blocked**.

Next: If reverse-preview retention is requested, compare one bounded coherent and one incompressible real decoded sequence against both raw-cache traversal and persistent decode; cap representation growth and preserve checkpoint bridge reconstruction.

[Current record](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json) · [Review](../../shared/runs/20260919T202334Z-ranks251-392-reconciliation/analysis.md)
