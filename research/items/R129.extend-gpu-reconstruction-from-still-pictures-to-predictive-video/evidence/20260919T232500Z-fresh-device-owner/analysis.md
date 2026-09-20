<!-- SPDX-License-Identifier: CC-BY-4.0 -->

Actual96codedDCblocks feedGPUinverseDC;32real parsedP pictures keep resident referencebuffers. All33fullYUV outputs match independentFFmpeg; wrongreference differs andwrongsource/fractionalchroma reject. Completeprepared-syntaxGPUreconstruction cost including freshadapter/device/pipelines/transfers/readback is102.95%slower median thanexactCPUcomponent;5%gatefails. Stop currenttinyDC-onlyprofile, notgeneralsplitdecoder.

Correctness: ActualMPEG2 entropy DC/EOB/motion parsed;96coefficient GPUinverse (no uploaded initialpixels),512Pmacroblock prediction withresidentreferences. Independent33fullYUVpictureoracle exact, all22timedoutputs exact; wrongreference andsource/chromaphase controls; explicitresourcecleanup. Restricts initialI to DCmultiple8 withboundedmismatchrounding andP residual-free integerallplane motion.

Performance: Predeclared11alternating pairs ofequivalent prepared-syntax reconstruction including freshGPUadapter/device, pipelines, buffertransfer, dispatch, finalreadback andcleanup. Sharedentropy andbrowserstartup excluded. Median saving -1.0295081288030938; bootstrap95 [-1.1206896643859738, -0.594900861434025];5%gate fails. Warmup variation retained; no energy/nativeplayback claim.

Next/reopen: Reopen for larger realeligibleprofile or fully implemented integerIDCT/residual/fractionalprediction with equivalent fulloutput and completecost. Preserve generation/reference lifetime and exactchromaphase guards; do not generalize DC-only proof to full MPEG2 decoding.

Bounded research result, not production or release admission.
