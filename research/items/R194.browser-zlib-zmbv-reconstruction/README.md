<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# browser zlib + ZMBV reconstruction

Current disposition: **pursue**. Historical execution reconciled; no new media run.

Persistent browser DecompressionStream plus strict ZMBV32 motion/XOR reconstruction matches all eight host reference frames. Cold dependent frame rejects. Bounded 32x32 CPU component; other pixel formats and GPU presentation not claimed.

Correctness: **passed**. Performance: **pending**.

Eight actual browser persistent-zlib ZMBV32 frames equal independent host BGR0, cold delta input rejects, inflater lifetime/cleanup recorded. Accepted bounded CPU reconstruction only; other bit depths and presentation absent.

Next: Profile complete inflation/reconstruction on representative content after declaring workload; add route seek/cancel when integrating.

[Current record](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json) · [Acceptance review](../../shared/runs/20260919T201644Z-top100-31-65-reconciliation/analysis.md)
