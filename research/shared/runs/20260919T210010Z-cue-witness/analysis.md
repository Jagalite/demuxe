<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Cue materialization and GPU witness gates

Prepared input, nine alternating owner pairs, exact output checks before and during timing. Metric complete owner wall time including independent output hash/readback verification and cleanup. Warm browser/cache; cold owners; other research work may run concurrently. No CPU utilization, physical energy or peak physical memory claim. Both benchmarks include cold owner setup and teardown.

## R048

Actual native TextTrack window with10000 authored cues and six forward/backward seeks. Both implementations match independent half-open authored interval/text oracle at actual media time; deleting active cue detected. Candidate materializes at most21 cues versus10000 baseline; total memory not measured. Complete video/Blob startup, cue creation and removal, seek with one animation-frame presentation opportunity, output checking, source/URL teardown included. Hidden native cue selection only, no styling or subtitle drawing claim.

Baseline139.189ms; candidate101.578ms. Saving27.02%, paired bootstrap95[21.6645649461766, 31.765502716631055]. Predeclared lower95>=10% gate **passed**. A failed acceptance gate with interval crossing zero is inconclusive benefit, not proof of regression.

## R213

Actual GPU witness checks all1048576 resident RGBA pixels with4byte result versus reading both full buffers and CPU short-circuit comparison. Equal/first/middle/last/allchanged controls each repeatedtwice match independent change metadata. Tenchecks read40bytes candidate versus83886080bytes baseline. Whole task includes fresh GPU device/pipeline/buffers, initialization and percase uploads, generation, readback/verification and resource destruction. No GPU-driven pixel producer integration, CPU utilization, physical memory or energy claim.

Baseline46.700ms; candidate31.100ms. Saving33.40%, paired bootstrap95[21.580288821819792, 43.80232796379785]. Predeclared lower95>=10% gate **passed**. A failed acceptance gate with interval crossing zero is inconclusive benefit, not proof of regression.

