<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# keep Hap BC1 compressed to presentation

Current disposition: **pursue**. Historical execution reconciled; no new media run.

Actual Hap1 packet with BC1 texture payload renders through WebGPU compression support and matches independently decoded host RGBA:16 compressed bytes vs128 RGBA bytes for tiny fixture. Uncompressed Hap transport only; Snappy/larger corpus/seek/cost not qualified.

Correctness: **pending**. Performance: **pending**.

Actual Hap BC1 payload renders exact host RGBA with resource cleanup; 16 compressed versus 128 expanded bytes is representation accounting. No executed malformed Hap control, Snappy path or seek/source lifecycle acceptance is present.

Next: Run malformed packet and replacement/replay controls for restricted uncompressed Hap before completing correctness.

[Current record](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json) · [Acceptance review](../../shared/runs/20260919T201644Z-top100-31-65-reconciliation/analysis.md)
