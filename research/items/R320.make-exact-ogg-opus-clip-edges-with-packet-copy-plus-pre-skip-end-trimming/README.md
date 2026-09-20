<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Make exact Ogg Opus clip edges with packet copy plus pre-skip/end trimming

Full key: `R320.make-exact-ogg-opus-clip-edges-with-packet-copy-plus-pre-skip-end-trimming`

Current decision: **stop_current_profile** (2026-09-19T21:45:10.321305+00:00).

Exact crop12345:67890 retains complete compressed prefix and55545 mono48k float samples, bit-identical to same-decoder continuous reference; wrong preskip fails. Five fresh alternating cold copy-author+decode pairs cost54.999ms versus32.198ms full decode+slice, ratio1.70814 fails0.9. Prepared decode median30.247ms reported separately, excludes authoring. Initial overlapping timings retained invalid. Earlier independent browser exactness and shortened-preroll mismatch remain pinned.

Stop current cold Python page-authoring cost profile. Exact Ogg sample-edge capability remains valid with fullprefix; prepared output has separate tradeoffs but measured savings below10percent. Reopen with faster page authoring or applicable repeatedly consumed clip workload and full endpoint cost.

No production integration or release qualification. Original provisional directory renamed after capture; replay into a new output directory. Exact original protocol and all measured samples retained.

| Stage | Status |
| --- | --- |
| define | passed |
| prepare | passed |
| screen | passed |
| correctness | passed |
| performance | failed |
| results | passed |
| decision | passed |

[Run](../../shared/runs/20260919T214510Z-ogg-exact-cost/run.json) · [Analysis](../../shared/runs/20260919T214510Z-ogg-exact-cost/analysis.md) · [Manifest](../../shared/runs/20260919T214510Z-ogg-exact-cost/manifest.json) · [History](history.jsonl) · [Evidence](evidence/index.json)

Disposition vocabulary normalized 2026-09-19T21:48:27.630401+00:00; no new execution.
