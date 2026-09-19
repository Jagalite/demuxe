<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Use different output containers for different tracks

Current disposition: **pursue**. Historical execution reconciled; no new media run.

Independent MP4 AVC video and WebM Opus audio SourceBuffers play both video geometry intervals with880Hz audio to EOF. Technically viable mixed-container lane destination; not an automatic routing change.

Correctness: **pending**. Performance: **pending**.

Separate MP4 AVC and WebM Opus lanes produce marked output in both geometry intervals to EOF with cleanup. Exact cross-container timeline/sample alignment and adverse source/seek transitions are not recorded.

Next: Add independent A/V timeline and wrong-offset/cancel controls before whole split-lane correctness acceptance.

[Current record](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json) · [Acceptance review](../../shared/runs/20260919T201644Z-top100-31-65-reconciliation/analysis.md)
