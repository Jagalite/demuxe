<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# dependency-aware corruption tracking

Current disposition: **blocked** — **setup** prerequisite. Historical review; no new media execution.

Current bridge retains recovery packets and waits for key entry after reset but has no per-picture contamination provenance graph. Historical exact output after next IDR supports conservative recovery, not certification inside arbitrary damaged GOPs.

Prepare: **blocked**. Correctness: **blocked**. Performance: **blocked**.

Next: Define a source-generation trust flag for one lost nonreference picture and one reference loss before adding per-picture provenance.

[Current record](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json) · [Review](../../shared/runs/20260919T202334Z-ranks251-392-reconciliation/analysis.md)
