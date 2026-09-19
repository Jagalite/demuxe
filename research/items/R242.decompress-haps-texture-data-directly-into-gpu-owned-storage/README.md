<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Decompress Hap’s texture data directly into GPU-owned storage

Current disposition: **blocked** — **setup** prerequisite. Historical review; no new media execution.

Current textures upload decoded R8/RGBA bytes. No bounded Hap/Snappy job parser, GPU overlap-dependency scheduler or compressed-texture copy path exists. BC support alone cannot provide GPU Snappy reconstruction.

Prepare: **blocked**. Correctness: **blocked**. Performance: **blocked**.

Next: Define one bounded Snappy job graph and exact reconstructed-byte oracle; overlapping backreference and compressed-block alignment controls must pass before GPU presentation.

[Current record](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json) · [Review](../../shared/runs/20260919T202334Z-ranks251-392-reconciliation/analysis.md)
