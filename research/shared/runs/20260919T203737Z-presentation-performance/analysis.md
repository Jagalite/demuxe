<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Prepared presentation component performance

Nine alternating owner pairs per workload, 10,000 paired resamples of aggregate candidate/baseline wall-time ratio. Predeclared lower 95% saving bound >=10%. Browser152.0.7977.83; local host concurrent research load may affect timings, so these are scoped component evidence, not release qualification. No physical energy, CPU utilization or peak-memory measurement. Browser process/cache shared between pairs; owners are cold, browser is not.

## R024

Thirty prepared 1280x720 black/white limited-range I420 frames; actual maintained YUVPresenter versus fresh raw VideoFrames/Canvas2D. Complete owner allocation, row packing/upload/draw, final readback and teardown. Source decode and fixture preparation excluded. No general color/HDR/rotation claim.

Full final image independently exact; invalid stride rejects and frame resources close. Earlier overlapping mock metadata failure and interleaved-generation timing variant retained; final measurement prepares all source heaps before tasks.

Baseline mean 38.771ms; candidate 25.059ms. Saving 35.36%, paired bootstrap95 [28.61, 42.00]%. Performance gate **passed**.

## R335

64x48 software-preferred H264 two closed GOPs, synthetic WebGPU device.destroy loss. Recovery, synchronized held redraw, next GOP independent host hashes and teardown included; preloss setup recorded separately. Real driver loss and player integration excluded.

Held GPU redraw exact and all subsequent decoded planes match independent host hashes; stale presenter epoch rejected, next frame differs, cleanup completes. Planned corrupted-hash control was implemented as different subsequent-picture hash rather than deliberate hash mutation; stale generation is the explicit adverse control.

Baseline mean 5.593ms; candidate 4.722ms. Saving 15.58%, paired bootstrap95 [11.63, 19.18]%. Performance gate **passed**.

## R183

Prepared 32x32 VP8 color/mask first-picture task: two fresh WebCodecs decoders and CPU mask composition versus prepared native transparent WebM. Input encoding/extraction/packaging excluded. No GPU alpha shader or hardware decode claim.

Alpha error0, premultiplied RGB error0 candidate /0.506 native, within original alpha<=2 RGB<=3 contract. Wrong timestamp pairing rejected. Initial native loadeddata draw failed and is preserved; diagnosed seek-to-first-picture correction includes seek cost, uses prior correctness harness timestamp+80ms selection, and does not change tolerance.

Baseline mean 2.356ms; candidate 0.544ms. Saving 76.89%, paired bootstrap95 [75.50, 77.99]%. Performance gate **passed**.

## R097

Same prepared first-picture task with native transparent WebM as candidate. This measures native owner startup, not packet packaging time or whole media conversion. Native transparency capability remains correct; no startup speed benefit.

Native alpha output remains correct through current first-picture and retained prior seek/rewind/EOF evidence. Native owner startup is slower than separate decoding on this tiny prepared fixture; do not mistake capability for a latency win.

Baseline mean 0.544ms; candidate 2.356ms. Saving -332.65%, paired bootstrap95 [-354.35, -308.16]%. Performance gate **failed**.

