<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Copy-on-write tiled retained pictures

Disposition: **stop_current_profile**. correctness: **passed**, performance: **failed**.

Implemented real postdecode immutable tile owner using60 actual256x144 MPEG2 I/P/B decoded pictures,16x16Y/8x8UV tiles and exact tile byte comparisons. Everyflattened I420 frame matches hostdecoder oracle; copying/altering one tile leaves earlier owner byteexact. Retentionevicts to3frames; sourceclear/randomadverseframe stays exact; allcache owners clear. Ownedunique bytes and actualPython tuple/listtable sizes 166067→81589B (50.87% reduction); this accounts namedcontainers/payloads, notwholeprocessRSS ordecoderinternalmemory. However9alternating60-frame pipeline pairs including comparison/allocation/retention/flatten/fullSHA256/teardown cost 1.632→89.063ms, regression5356.6% CI[5115.135412556034, 5616.622340870214]; failspredeclared joint25%heapreduction plus<=10%costregressiongate. This ispositive sharingcorrectness but negative Python postdecode representation cost, notcodec-internal skipped reconstruction/write proof. Stop measuredvariant; no inferential unchangedtiles orproductionframeformat changes.

Next: Reopen with materiallydifferent representation/consumer that eliminates fullpostdecode tile scans or costly presentation flattening, and remeasure complete cost and ownedstate. Existing sharing correctness doesnotqualify decoder-internal COW.

[Current record](item.json) · [History](history.jsonl) · [Run analysis](evidence/20260919T232407Z-retained-tile-owner/analysis.md)
