<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Mux media to reduce the extra bytes required for integrity verification

Current disposition: **blocked** — **setup** prerequisite. Historical review; no new media execution.

Current remote authority is strong ETag/immutable ranges, not hash-piece integrity units, and FFmpeg controls output interleaving. Layout-to-verification alignment requires a supplied piece boundary contract and new output identity; no such current producer is present.

Prepare: **blocked**. Correctness: **blocked**. Performance: **blocked**.

Next: Specify one verification-unit map over a small remux output and count cold bytes until verified AV against ordinary interleaving.

[Current record](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json) · [Review](../../shared/runs/20260919T202334Z-ranks251-392-reconciliation/analysis.md)
