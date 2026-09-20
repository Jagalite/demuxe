<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# JPEG XL DC preview

Disposition: **pursue**. correctness: **passed**, performance: **not_applicable**.

Built official libjxl v0.11.2 pinned332feb17d17311c748445f7ee75c4fb55cc38530 with isolated pinnedHighway/Brotli and installedLCMS2, generated genuine1024x768 progressiveVarDCT JPEGXL. Actual streaming API feeds64bytes atatime. First FRAME_PROGRESSION+FlushImage reports intended1:8 DC output after12795consumed/12800provided bytes of46709total (27.40%read,5bytes bounded readahead). Expanded intentionallyapproximate previewPSNR20.8523dB vs final, passes predeclared20dB; bytefraction<50%gatepasses. Full stream decode matches separate djxl CLI complete2359296RGBbytes exactly. Cancellation atsameactualevent gives identicalpreview/consumed/providedcounts, neverreads moreorproducesfullimage, destroysdecoder/closesfile. Truncatedheader rejects8; freshfullowner aftercancel/badsource exact. Correctnesspassed forcodec-progressive preview capability, performanceN/A: byteboundary and earlyreadstop arenotbrowserlatency/energy claims. No browserJPEGXLcodecservice, generic truncatedJPEGheuristic, exactpreviewclaim, orproductionroutingchange. Fixture/source/runtime/notices and buildlogs retained.

Next: Scoped native codec-progressive preview gates complete. Browser/Wasm service, widercontent quality, latency/resource comparison and delivery byte savings need separate requestedprofiles; no productionroute changed.

[Current record](item.json) · [History](history.jsonl) · [Run analysis](evidence/20260919T231357Z-libjxl-progressive/analysis.md)

[Upstream notice clarification](../../shared/runs/20260919T232748Z-presentation-notice-amendment/analysis.md); gates unchanged.
