<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# native color with separately decoded transparency

Current disposition: **pursue** for the scoped capability. Correctness **passed**; performance **passed**; other research gates passed.

Prepared 32x32 VP8 color/mask first-picture task: two fresh WebCodecs decoders and CPU mask composition versus prepared native transparent WebM. Input encoding/extraction/packaging excluded. No GPU alpha shader or hardware decode claim. Alpha error0, premultiplied RGB error0 candidate /0.506 native, within original alpha<=2 RGB<=3 contract. Wrong timestamp pairing rejected. Initial native loadeddata draw failed and is preserved; diagnosed seek-to-first-picture correction includes seek cost, uses prior correctness harness timestamp+80ms selection, and does not change tolerance. Measured saving 76.89% with bootstrap95 [75.49999945014714, 77.99043127562612]; predeclared performance gate passed.

Research component gates complete in this profile; a separately authorized production integration must qualify actual ownership, representative media, color and lifecycle contracts.

[Current record](item.json) · [History](history.jsonl) · [Evidence](evidence/index.json) · [Run analysis](../../shared/runs/20260919T203737Z-presentation-performance/analysis.md)
