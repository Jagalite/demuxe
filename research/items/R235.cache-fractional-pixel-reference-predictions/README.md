<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Cache fractional-pixel reference predictions

Current disposition: **blocked** — **setup** prerequisite. Historical review; no new media execution.

Actual qpel owner already reuses horizontal temporaries within a block. Historical H264-like cache is not a normative replacement across phases/chroma/weighted prediction; persistent cache needs finalized reference identity and measured hot repeat exposure.

Prepare: **blocked**. Correctness: **blocked**. Performance: **blocked**.

Next: Instrument repeated nontrivial qpel keys in the pinned kernel before adding a bounded cache; compare an old/new reference at identical coordinates.

[Current record](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json) · [Review](../../shared/runs/20260919T202334Z-ranks251-392-reconciliation/analysis.md)
