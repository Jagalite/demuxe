<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# recover encoder decisions from the source

Full identity: `R187.recover-encoder-decisions-from-the-source`.

Current decision: **stop_current_profile** (actual_source_motion_and_target_hevc_encode).

Real AVC source motion vectors drive an actual x265 global search-range hook (57→16), not a proxy search model. Natural60-frame and scene-change60-frame sources export5408/5108 vectors; scene source retains keyframes0/30. Seven paired full encodes stay inside predeclared<=0.1dB quality loss and<=2% byte growth: natural PSNR improves0.00686dB/bytes+0.276%, scene output unchanged. Including fresh source-analysis pass, median complete costs1.0758x/1.0823x miss5% saving, with broad timing ranges. Stop this hint variant; no per-block vector injection or general encoder rejection.

Next action: Reopen for a true lower-overhead or per-block target-encoder hook; preserve scene-change and full rate-distortion comparison.

## Stages

| Stage | Status | Basis |
|---|---|---|
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | Actual source motion side data and real libx265 merange hook; predeclared quality/size/cost gates. |
| screen | passed | 5408/5108 vectors produce real target search-range16 versus57 baseline, scene cut included. |
| correctness | passed | Both120frame workload families decode with complete frame count; PSNR/byte bounds pass across7pairs, scene-change source includes Iframe30. |
| performance | failed | Complete source analysis+target encode median1.0758x/1.0823x, no5% saving; highly variable timings disclosed. |
| results | passed | Real AVC source motion vectors drive an actual x265 global search-range hook (57→16), not a proxy search model. Natural60-frame and scene-change60-frame sources export5408/5108 vectors; scene source retains keyframes0/30. Seven paired full encodes stay inside predeclared<=0.1dB quality loss and<=2% byte growth: natural PSNR improves0.00686dB/bytes+0.276%, scene output unchanged. Including fresh source-analysis pass, median complete costs1.0758x/1.0823x miss5% saving, with broad timing ranges. Stop this hint variant; no per-block vector injection or general encoder rejection. |
| decision | passed | Real AVC source motion vectors drive an actual x265 global search-range hook (57→16), not a proxy search model. Natural60-frame and scene-change60-frame sources export5408/5108 vectors; scene source retains keyframes0/30. Seven paired full encodes stay inside predeclared<=0.1dB quality loss and<=2% byte growth: natural PSNR improves0.00686dB/bytes+0.276%, scene output unchanged. Including fresh source-analysis pass, median complete costs1.0758x/1.0823x miss5% saving, with broad timing ranges. Stop this hint variant; no per-block vector injection or general encoder rejection. |

[New run](../../shared/runs/20260919T235525Z-source-motion-encoder/run.json) · [Evidence index](evidence/index.json) · [Complete history](history.jsonl) · [Item contract](item.json)
