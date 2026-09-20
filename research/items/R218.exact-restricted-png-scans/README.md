<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# exact restricted PNG scans

Disposition: **inconclusive**. correctness: **passed**, performance: **failed**.

Actual67x19 opaqueRGBA8 PNG, twoIDAT chunks, alternatingNone/Sub/Up filters, independentlyFFmpegdecoded5092bytes exactoriginal. BrowserboundedCRC/header/continuousIDAT parser+nativeDecompressionStream produces5111filteredbytes, GPU128thread workgroup uses fourchannel parallelprefixSub scans and previousrow Up state, directlywritesRGBA8texture. FullGPUrender/readback everybyte exactnativePNGbitmap/FFmpeg, with6Average/Paeth/interlace/bitdepth/oversize/CRC controls. SubmittedstaleGPUoutputneverpublished; freshsurvivor30framesexact, allbitmaps/buffers/textures/devicesclose. Initialno-opwidthcontrol and reservedWGSLfiltername failures retained as harnessdiagnostics, notcandidatefidelitynegative. Ninealternating colddevice30imagewholejobs include repeatedbinaryfetch/parse/inflateorbitmapdecode,expandeduinttransfer,GPUsetup/reconstruction/upload/render/readback/compare/teardown. NativePNGbitmapbaseline165.322ms candidate158.189ms, saving4.31% CI[-9.307680875228819, 18.04375653800976]; failslower95>=10%gate. Parser profile67x19 noninterlacedopaqueRGBA8 only; noPNGalpha/colorprofile/generalfilterclaim. GPUscanexecution established, pointestimate doesnotestablishwhole-route speedup; highjitter included inpaireduncertainty.

Next: ActualrestrictedPNG GPUscans correct, totalcost gate inconclusive. Reopenonlyfor relevantlarger/representative restrictedassets or materiallycheaper executor, keeping nativePNG baseline and fullinflate/transfer/readbackcosts.

[Current record](item.json) · [History](history.jsonl) · [Run analysis](evidence/20260920T001429Z-gpu-png-predictor-name/analysis.md)
