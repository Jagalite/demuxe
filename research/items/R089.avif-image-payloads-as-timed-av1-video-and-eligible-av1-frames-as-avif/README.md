<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# AVIF image payloads as timed AV1 video, and eligible AV1 frames as AVIF

Disposition: **stop_current_profile**. correctness: **failed**, performance: **not_applicable**.

Prepared3 real64x64 single-item AVIFs with matching8bit420 limited-range BT709 sequence configuration; audited sequence profile0/still_picture1/reduced_still_picture_header1. Retained AV1 payload bytes survive AVIF→timed MP4 and3independent reverse MP4→AVIF samples exactly, with identical full hostdecoded I420. Actual Chrome native MP4 and MSE each render all3 requested0/.5/1s pictures; reverse AVIF browser outputs equal original AVIF outputs exactly. Strict image-versus-video fullRGBA contract nevertheless fails on both native/MSE with435/633/651 channel differences, max1; eachroute gives same video hashes, so containers and coded bytes are preserved but decoded display-rounding isnotstrictly identical. Preserve strictfailure, do not silently permitonecodeerror. Actual AVIF decode sourceepoch invalidation closes stale bitmap/freshsurvivor exact;8created/8closed, actual distinctimage order falsifier works. Extracted sequence-profile mutation rejects compatibilityguard beforeauthoring; this isconfigguard control, notclaimofvalidmutantmedia. Preserve unsupported aomenc --color-range setup option and syntax-only browserharness correction; encoded ffprobe verifies actualrange/color instead. Correctnessfailed, performanceN/A. Restrictedrepresentation reuse feasible; exact browser presentation profile rejected, no allAVIF/grids/auxiliary/intersample-dependency claim.

Next: Reopen only with output conversion that meets original exact image/video presentation contract, or a separately requested precision contract declared beforeexecution. Preserve successful unchanged-codec-payload representation evidence and native/MSE one-code failure; no performance run.

[Current record](item.json) · [History](history.jsonl) · [Run analysis](evidence/20260919T231029Z-avif-default-range/analysis.md)

[Nonexecuted harness diagnostic](evidence/20260919T233728Z-nonexecuted-syntax-diagnostic/analysis.md); original bytes and stage decisions preserved.
