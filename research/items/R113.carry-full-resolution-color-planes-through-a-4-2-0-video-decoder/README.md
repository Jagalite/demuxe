<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Carry full-resolution color planes through a 4:2:0 video decoder

Current disposition: **blocked** — **setup** prerequisite. Historical review; no new media execution.

Current decoded YUV mapping assumes ordinary image planes and no carrier-atlas interpretation/profile exists. New prepared three-width luma atlas and shader require explicit contract and range oracle.

Prepare: **blocked**. Correctness: **blocked**. Performance: **blocked**.

Next: Create one trusted all-byte ramp carrier and decode-plane oracle, then exact atlas shader nearest lookup; reject clipping/neutral-chroma conversion changes and count larger coded surface/preparation.

[Current record](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json) · [Review](../../shared/runs/20260919T202334Z-ranks251-392-reconciliation/analysis.md)
