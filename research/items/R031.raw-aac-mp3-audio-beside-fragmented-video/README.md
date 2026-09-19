<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Raw AAC/MP3 audio beside fragmented video

Current disposition: **pursue**. Historical execution reconciled; no new media run.

Raw AAC audio SourceBuffer beside fragmented AVC video plays marked audio through both geometry intervals and EOF. Priming/offset and production append lifecycle still need integration checks.

Correctness: **pending**. Performance: **pending**.

Raw AAC lane alongside fragmented AVC renders both 160x96 and 320x180 intervals with 880 Hz signal and EOF, original audio SourceBuffer retained and cleanup passes. This is not an independent exact priming/offset/gap or adverse lifecycle oracle; MP3 untested.

Next: Compare required audio samples/timestamps at transitions and run canceled append/seek control; keep MP3 outside accepted scope.

[Current record](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json) · [Acceptance review](../../shared/runs/20260919T201644Z-top100-31-65-reconciliation/analysis.md)
