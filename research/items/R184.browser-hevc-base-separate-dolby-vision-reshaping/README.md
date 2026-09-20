<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# browser HEVC base + separate Dolby Vision reshaping

Full identity: `R184.browser-hevc-base-separate-dolby-vision-reshaping`.

Current decision: **stop_current_profile** (actual-route screen).

Genuine Dolby profile5 source supplies120nonidentity RPU frames; independent installedlibplacebo/MoltenVK produces deterministic BT2020PQfloat references at0/59/119, and identity-reshaping control differs. ActualChrome decodes24HEVCframes but exposedVideoFrame.format=null prevents raw10bitcopy. NativeGPUExternalTexture→documented nominal inversecolor→separate polynomial/matrix/PQ candidate executes on full first1920x1080picture: meanRGBerror0.032278,max0.357726,5241943scalars exceed predeclared2/1023PQ bound. Explicitfullrange override leavesbytes unchanged. Correctnessfailed; performanceN/A. Source/reference setup resolved, current separate-transform path unqualified; no universal Dolby/browser rejection or physicalHDRappearance claim.

Next action: Research profile concluded at fidelity failure. Reopen with a demonstrated precision-preserving native-base signal boundary and independently validated numerical kernel; preserve strict declared fidelity and source/RPU/PTS identity before timing.

## Definition and contract

The exact card is BLOCKED in this lab. FFmpeg includes dovi_rpu and a libplacebo filter, but there is no trusted Dolby Vision fixture or HDR-capable physical display. Chromium returns an empty support string for the tested hvc1/hev1 configurations, and WebGPU is unavailable on the permitted non-secure page. No synthetic RPU or SDR-only visual approximation was substituted for the intended claim.

Output contract: Configuration and ordered codec payloads where copy is intended; requested frames/audio/timeline/features at the declared output boundary.

Primary metric: Correct additional admitted source/destination capability; otherwise full startup and CPU/resource cost.

Adverse control: Alter one admission-critical configuration, remove a required dependency, or preserve video while making selected audio unsupported. Candidate must reject or use a declared fallback.

## Stages

| Stage | Status | Basis |
|---|---|---|
| define | passed | Prerequisite gate for browser HEVC base plus separately applied Dolby reshaping. |
| prepare | passed | Genuine nonidentity Dolby source acquired; independent libplacebo numeric reference and controls execute with pinned runtime/source provenance. |
| screen | passed | Genuine Dolby profile5 source supplies120nonidentity RPU frames; independent installedlibplacebo/MoltenVK produces deterministic BT2020PQfloat references at0/59/119, and identity-reshaping control differs. ActualChrome decodes24HEVCframes but exposedVideoFrame.format=null prevents raw10bitcopy. NativeGPUExternalTexture→documented nominal inversecolor→separate polynomial/matrix/PQ candidate executes on full first1920x1080picture: meanRGBerror0.032278,max0.357726,5241943scalars exceed predeclared2/1023PQ bound. Explicitfullrange override leavesbytes unchanged. Correctnessfailed; performanceN/A. Source/reference setup resolved, current separate-transform path unqualified; no universal Dolby/browser rejection or physicalHDRappearance claim. |
| correctness | failed | Genuine Dolby profile5 source supplies120nonidentity RPU frames; independent installedlibplacebo/MoltenVK produces deterministic BT2020PQfloat references at0/59/119, and identity-reshaping control differs. ActualChrome decodes24HEVCframes but exposedVideoFrame.format=null prevents raw10bitcopy. NativeGPUExternalTexture→documented nominal inversecolor→separate polynomial/matrix/PQ candidate executes on full first1920x1080picture: meanRGBerror0.032278,max0.357726,5241943scalars exceed predeclared2/1023PQ bound. Explicitfullrange override leavesbytes unchanged. Correctnessfailed; performanceN/A. Source/reference setup resolved, current separate-transform path unqualified; no universal Dolby/browser rejection or physicalHDRappearance claim. |
| performance | not_applicable | Declared independent numeric fidelity gate failed; no candidate performance benchmark or advantage claimed. |
| results | passed | Genuine Dolby profile5 source supplies120nonidentity RPU frames; independent installedlibplacebo/MoltenVK produces deterministic BT2020PQfloat references at0/59/119, and identity-reshaping control differs. ActualChrome decodes24HEVCframes but exposedVideoFrame.format=null prevents raw10bitcopy. NativeGPUExternalTexture→documented nominal inversecolor→separate polynomial/matrix/PQ candidate executes on full first1920x1080picture: meanRGBerror0.032278,max0.357726,5241943scalars exceed predeclared2/1023PQ bound. Explicitfullrange override leavesbytes unchanged. Correctnessfailed; performanceN/A. Source/reference setup resolved, current separate-transform path unqualified; no universal Dolby/browser rejection or physicalHDRappearance claim. |
| decision | passed | Genuine Dolby profile5 source supplies120nonidentity RPU frames; independent installedlibplacebo/MoltenVK produces deterministic BT2020PQfloat references at0/59/119, and identity-reshaping control differs. ActualChrome decodes24HEVCframes but exposedVideoFrame.format=null prevents raw10bitcopy. NativeGPUExternalTexture→documented nominal inversecolor→separate polynomial/matrix/PQ candidate executes on full first1920x1080picture: meanRGBerror0.032278,max0.357726,5241943scalars exceed predeclared2/1023PQ bound. Explicitfullrange override leavesbytes unchanged. Correctnessfailed; performanceN/A. Source/reference setup resolved, current separate-transform path unqualified; no universal Dolby/browser rejection or physicalHDRappearance claim. |

[New run](../../shared/runs/20260920T010751Z-dovi-signal-qualification/run.json) · [Evidence index](evidence/index.json) · [Complete history](history.jsonl) · [Item contract](item.json)
