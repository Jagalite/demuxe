<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# JPEG mosaic from restart intervals

Disposition: **pursue**. correctness: **passed**, performance: **not_applicable**.

Authored actual64x64 grayscale JPEG mosaic fromtwoindependent matching-table JPEGs with8MCU restartintervals. Alternated8pixel rowintervals fromsourceA/B andrenumberedrestartmarkers; all8compressedentropysegments reusedverbatim, no coefficient/pixel reencoding inauthor. Independent coefficient dump verifies4096selected quantized coefficients exact; fullFFmpegcandidatepixels equal corresponding source-row oracle. Actualbrowser image decode full4096RGBApixels equals independently composed native sourceimage rows with0changedchannels. ActualvalidJPEGdifferentquantization andmissingrestart inputs reject; wrongrowplan differs; lateimage sourceepoch closes,4bitmapscreated/closed. Correctnesspassed/performanceN/A foradditionalcompressed rowcompositioncapability. Scopegrayscale one-MCU-rowintervals, matchingtables/geometry; no arbitraryrectangle/chromasubsampling/parallelbrowser orspeedclaim; no productionchange.

Next: Scoped compressed restart-row composition gates complete. Different geometries/chroma/paralleldecode or integrationcost require separatecontracts; no general JPEG rectangle composition claim.

[Current record](item.json) · [History](history.jsonl) · [Run analysis](evidence/20260919T232912Z-restart-row-mosaic/analysis.md)
