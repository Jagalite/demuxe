<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# ASS owner performance gates

Prepared input, nine alternating owner pairs, exact output checks before and during timing. Metric complete owner wall time including independent output hash/readback verification and cleanup. Warm browser/cache; cold owners; other research work may run concurrently. No CPU utilization, physical energy or peak physical memory claim. Cold libass Wasm worker startup and fonts are deliberately included.

## R021

Actual libass worker static/karaoke96renderrequests with repeat/rewind, track change and320/640layout changes. Exact glyph bytes/color/geometry/epoch cache bounded1MiB versus rasterize everytile. All composed RGBA hashes match untimed real libass baseline; native rendering still executes everyrequest, no next-change predictor. Complete worker/font/load/raster/key/cache/outputcheck/terminate costs included, retention zero at cleanup.

Baseline360.157ms; candidate342.464ms. Saving4.91%, paired bootstrap95[-0.7855216812002519, 10.038672730909337]. Predeclared lower95>=10% gate **failed**. A failed acceptance gate with interval crossing zero is inconclusive benefit, not proof of regression.

## R144

Restricted four-second fad(300,300) caption program, two opacity-regime maskfamilies. All98 requestedtimes includingrewind match independent real libass glyph geometry/masks/RGB exactly and alpha within original1-code bound. Unsupportedmove string rejected by narrow admission. Candidate template preparation includes2libass renders versus98baseline renders, plus worker/font/load/compare/termination; no general ASS source/layout semantics.

Baseline126.997ms; candidate116.592ms. Saving8.19%, paired bootstrap95[-8.375982414610462, 21.856847448795325]. Predeclared lower95>=10% gate **failed**. A failed acceptance gate with interval crossing zero is inconclusive benefit, not proof of regression.

