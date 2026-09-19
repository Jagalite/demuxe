<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Decode one Vorbis stream in parallel using small overlapping boundaries

Current disposition: **blocked** — **setup** prerequisite. Historical review; no new media execution.

Local adaptation does not admit Vorbis decoding; software audio is continuous mpv-owned. Independent Vorbis jobs need packet/window overlap and global trimming before any parallel scheduler can safely splice PCM.

Prepare: **blocked**. Correctness: **blocked**. Performance: **blocked**.

Next: Inspect one pinned Vorbis packet stream and compare two jobs with a preceding packet, varying short/long window transition and EOF trim.

[Current record](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json) · [Review](../../shared/runs/20260919T202334Z-ranks251-392-reconciliation/analysis.md)
