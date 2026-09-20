<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Decode an Ambisonic sound field natively, then render its spatial meaning separately

Full key: `R241.decode-an-ambisonic-sound-field-natively-then-render-its-spatial-meaning-separately`

Current decision: **pursue** (2026-09-19T21:23:45.431436+00:00).

Actual browser decode→native channel graph output is sample-identical to independently materialized software-matrix output for both six-channel permutation/gains and four ACN/SN3D directions. Wrong ordering and failure to stop a real stale source produce large errors; stop/disconnect/closed lifecycle passes. Seven-pair full decode/setup/render ratios1.05190 and1.05202 pass the predeclared1.10 cost ceiling; no speedup, CPU, energy or opaque-memory claim.

Pursue declared static indexed channel operations/directional renderer within bounded cost. Physical speakers, headtracking and realtime video-owner integration are separate from this offline component.

No production integration or release qualification. Original provisional directory renamed after capture; replay into a new output directory. Exact original protocol and all measured samples retained.

| Stage | Status |
| --- | --- |
| define | passed |
| prepare | passed |
| screen | passed |
| correctness | passed |
| performance | passed |
| results | passed |
| decision | passed |

[Run](../../shared/runs/20260919T212345Z-graph-cost/run.json) · [Analysis](../../shared/runs/20260919T212345Z-graph-cost/analysis.md) · [Manifest](../../shared/runs/20260919T212345Z-graph-cost/manifest.json) · [History](history.jsonl) · [Evidence](evidence/index.json)
