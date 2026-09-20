<!-- SPDX-License-Identifier: CC-BY-4.0 -->

Actual fixed-order1 mono signed16 FLAC with Rice-coded partition0 residuals,96000samples. Streaming entropy traversal accumulates777sample bins without full PCM or residual arrays. All124bins exactly match independent FFmpeg PCM for count/min/max/sum/integer energy across frame boundaries;96relative-prefix composition cases and frame energy identities exact. Wrong warmup differs or violates sample bounds; source identity, CRC, truncation and cancellation reject. Independent libFLAC validation passes. Five cold read/hash/entropy/summary jobs251.625ms versus full host decode/summary37.573ms ratio6.69693 fails<=0.9. Summary numeric payload4960bytes versus192000decodedPCMbytes is structural, not measuredRSS.

Stop this Python streaming entropy-summary cost profile. Exact summary/relative-prefix identities are demonstrated on real Rice-coded first-order FLAC, but avoiding PCM materialization does not imply less CPU. Compiled entropy traversal, different workload or bounded memory requirement needs a new declared experiment; no generic FLAC predictors/partitions, browser delivery or production integration claim.

No production integration or release qualification. Original provisional directory renamed after capture; replay into a new output directory. Exact original protocol and all measured samples retained.
