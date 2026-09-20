<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Decode → graphics processing → encode

Disposition: **stop_current_profile**. correctness: **failed**, performance: **not_applicable**.

Actual3-frame128x96 VP9 decode→WebGPU RGBinversion→timestamp-ownedcanvasVideoFrame→nativeVP9 VideoEncoder→independentfinaldecode. Same nativeencoder CPUinversion reference validatesallsourceRGBA againstindependentFFmpeg. Bothroutes encode/decodeall3frames at0/41667/83333us, includinglastframe; no MediaRecorder callback/real-time loss confound. Strictoutputfails: independenthostfinalI420 has2591different samples,max15. PreencoderGPUtransformedframe RGBA diagnostics already128/144/128differentchannels,max68, concentratedlast-column green; CPUinvertedinputs0differences. GPUcanvasframesBGRX vsCPUframesRGBA, identicaldeclaredsRGB/BT709/fullrange metadata. Failurethus precedesfinalencoding, but GPUYUVconversion versus canvasframecapture subboundary notfullyisolated. Onebounded source-path correction replacesRGBAcopyExternalImage staging withimportExternalTexture+textureSampleBaseClampToEdge; sameexactfailedoutputhashes, no thresholdrelaxation. Earlierstagingroute andintermediatediagnosis retained. Actualstale transformedframe discarded beforeencoderhandoff yields0encodedoutputs; freshsurvivor reproducescandidate output,38frames/9decoders/5encoders openedandclosed; wrongnoinversion outputdiffers andmissinglastframe detected. Lifecycle/timestamps pass but pixelcontractfails; no performancepairs run. browserdiagnosticharness passed=true isnotfidelitypass: strictComparisonPassed=false andresults.json explicitfalse. StopcurrentGPUvideo-to-canvas inversionroute; no productionrouting or realtimequalification.

Next: ReopenonlyafterfirstGPUcolor/canvascapturedivergence isfixed underexactsame3-frame independentCPU/hostoracle; preserve allPTS/lastframe/stalehandoffcontrols. Do notbenchmark or routeproduction on APIavailability/completeframecount alone.

[Current record](item.json) · [History](history.jsonl) · [Run analysis](evidence/20260920T003140Z-external-texture-source/analysis.md)
