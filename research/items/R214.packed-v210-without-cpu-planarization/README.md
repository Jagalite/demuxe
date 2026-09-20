<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# packed v210 without CPU planarization

Disposition: **inconclusive**. correctness: **passed**, performance: **failed**.

ActualFFmpeg v21050x8 stream2048bytes, stride256 although9packinggroupsrequire144B/row. Independenthost yuv422p10le decoded400Y+200U+200V samples exactlyoriginaladmitted4..1019range. Initial0..1023 authoredinput revealedencoderclampingreserved0..3/1020..1023, retainedpriorplanes; changedfixture tolegalrange, notGPUtolerance. ActualGPU packedwordunpack intoownedu32planes andindependentintegerneighborconsumer reproduceall800rawsamples+800filteredoutputs exactly. Poisonedrowpadding and unusedpartiallastgroup fieldsdo notaffectvisibleplanes; truncatedbuffer/wrong144stride reject; submittedstaleGPUgeneration discard+freshsurvivor100framesexact; buffers/devicesclose,zeroGPUerrors. Ninealternatingcolddevice100frame jobs include sourcefetch/validation, CPUplanarization+3200Buploadversus2048Bpackedupload/GPUunpack, sameGPUintegerconsumer/readback/compareandteardown. Baseline375.500ms candidate443.689ms,saving-18.16% CI[-38.05665672235885, 0.5535938751215941], failslower95>=10%gate. NoRGB/HDRdisplayconversion, generalstride/colorformatadmission orphysicalenergyclaim. DirectpackedGPUboundaryreal, buttinycompleteworkloadcostdoesnotjustifyintegration; loadedhostvariationretained inuncertainty.

Next: ExactGPU v210 unpack/partialgroup/stride ownership gate complete, totalcost guardfailed. Reopenfor representative largerpacked422 workloads or viableGPUconsumer integration with unchanged10bit oracle and cheapestCPUbaseline.

[Current record](item.json) · [History](history.jsonl) · [Run analysis](evidence/20260920T001249Z-gpu-v210-legal-range/analysis.md)
