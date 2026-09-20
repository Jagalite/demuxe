<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Preserve hardware-overlay eligibility through subtitle and UI composition

Full identity: `R295.preserve-hardware-overlay-eligibility-through-subtitle-and-ui-composition`.

Current decision: **stop_current_profile** (actual_route_experiment).

Actual source-attributed native NV12 CALayer composition is preserved for plain video, separate captions/controls, counter-transforms, fullscreen and multi-video; the identity multiply wrapper and canvas use RGB composition. Matched native/wrapper pixels differ by at most1RGB including caption/control/scroll/resize cases. Actual WindowServer output contains all73source IDs0..72 for both qualified A/V layouts. Rendered AAC cue-transition alignment bounds are <=46.0ms native and<=53.9ms wrapper; a real600ms delay is rejected. Clean muxed-A/V CPU median ratio0.838383 suggests16.16%lower cost, but only8of9pairs improve (worst1.109280), failing the predeclared every-pair robustness criterion. Stop this profile at that gate; do not claim noaverageCPUbenefit. Hardware overlay promotion, physicalenergy, photons andspeakerlatency are not established.

Next action: Reopen with an independently predeclared longer/representative confirmatory cost study; keep all appearance, actualsource delivery and audio-engine alignment controls. Do not change automaticrouting from this result.

## Stages

| Stage | Status | Basis |
|---|---|---|
| define | passed | Foreground Chrome152 on AppleM1, authored640x36024fps SDR H264/AAC, same ordinary DOMcaptions/controls and equivalent identitymultiply-on-white wrapper. Native CALayer class and source-coded WindowServer images are measured. This is scoped native-surface composition research, not hardwareplane promotion, universalCSS, physicalspeaker synchronization orrelease qualification. |
| prepare | passed | Authored framebarcodes and AACfrequencycues, independent hostvideooracle, exactChrome source+license, owned-window capture, actualCPUcounters and adversecontrols prepared. Setup failures retained. |
| screen | passed | Actual NV12native versusRGBflattened paths observed; nativeAVLayer/physicaloverlaypromotion is not inferred from diagnosticcolors. |
| correctness | passed | Same requested video/UI appearance max1RGB; captionchange/controlhide/scroll/resize/fullscreen/multivideo exercised. ActualWindowServer all73source IDsmonotonic for both A/Vlayouts; PCMengine/displaycue transitions within100ms including<=32ms quantizationuncertainty.600mswrongdelay and colorchangingcanvas rejected. Initialcapturegaps and pause/seekcounterdiagnostics remain visible. |
| performance | failed | FinalmuxedAAC9alternating clean2200ms playback intervals: median native/wrapperCPU0.838383,8/9faster, worst1.109280. >=5%median conditionpasses but every-pair conditionfails. No negativeclaim about averageCPUbenefit orGPU/energy; excludes sharedbrowser/source setup. |
| results | passed | Actual source-attributed native NV12 CALayer composition is preserved for plain video, separate captions/controls, counter-transforms, fullscreen and multi-video; the identity multiply wrapper and canvas use RGB composition. Matched native/wrapper pixels differ by at most1RGB including caption/control/scroll/resize cases. Actual WindowServer output contains all73source IDs0..72 for both qualified A/V layouts. Rendered AAC cue-transition alignment bounds are <=46.0ms native and<=53.9ms wrapper; a real600ms delay is rejected. Clean muxed-A/V CPU median ratio0.838383 suggests16.16%lower cost, but only8of9pairs improve (worst1.109280), failing the predeclared every-pair robustness criterion. Stop this profile at that gate; do not claim noaverageCPUbenefit. Hardware overlay promotion, physicalenergy, photons andspeakerlatency are not established. |
| decision | passed | Actual source-attributed native NV12 CALayer composition is preserved for plain video, separate captions/controls, counter-transforms, fullscreen and multi-video; the identity multiply wrapper and canvas use RGB composition. Matched native/wrapper pixels differ by at most1RGB including caption/control/scroll/resize cases. Actual WindowServer output contains all73source IDs0..72 for both qualified A/V layouts. Rendered AAC cue-transition alignment bounds are <=46.0ms native and<=53.9ms wrapper; a real600ms delay is rejected. Clean muxed-A/V CPU median ratio0.838383 suggests16.16%lower cost, but only8of9pairs improve (worst1.109280), failing the predeclared every-pair robustness criterion. Stop this profile at that gate; do not claim noaverageCPUbenefit. Hardware overlay promotion, physicalenergy, photons andspeakerlatency are not established. |

[New run](../../shared/runs/20260920T041733Z-native-surface-qualification/run.json) · [Evidence index](evidence/index.json) · [Complete history](history.jsonl) · [Item contract](item.json)
