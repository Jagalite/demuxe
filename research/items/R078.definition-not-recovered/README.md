<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Play texture-native video without a conventional video decoder

Full identity: `R078.definition-not-recovered`.

Current decision: **pursue** (actual_route_qualification).

Texture-native browser playback qualified for declared Hap1 BC1 bounded-fidelity profile; visiblecanvas max1LSB RGB, exactalpha, lifecycle/timingcontrols,16.09% median job saving and8x less textureupload/storage. Strict byte-exact CPU/GPU profile remains failed.

Next action: Add container/format eligibility and fidelitypolicy before integration; qualify Snappy, other BC modes, dimensions, audio sync and realworldlong streams separately. Never advertise strict CPUdecode bitexactness.

## Definition and contract

32frame30fps128x128 opaque Hap1 BC1 AVI, bounded container parser, compressed GPU texture upload and visiblecanvas presentation without conventional decoder. Revised profile RGBerror<=1/255 and alphaexact versus FFmpeg; original strictbyteexact profile failed GPUinterpolation and is not qualified.

Derived openly from the recovered title; the original detailed report is unavailable.

All32candidateframes and all32baselineframes checked; candidate max1LSB RGB and exactalpha. Wrongframe/corruptselector/truncated/codec/EOF controls; seeks, epochcancel, freshdevices; wallclock sequence32frames, actualcanvas screenshot validates lastframe independently.

Nine alternating fresh-device32frame jobs incl parsing,pipeline,uploads,render,fullreadback andteardown; median ratio 0.839050, allpairs faster, >=5% median threshold met.8x less upload/source texture storage, not8x totalGPU memory. Visiblecanvas timeline separately verified; no physicalscanout claim.

## Stages

| Stage | Status | Basis |
|---|---|---|
| define | passed | 32frame30fps128x128 opaque Hap1 BC1 AVI, bounded container parser, compressed GPU texture upload and visiblecanvas presentation without conventional decoder. Revised profile RGBerror<=1/255 and alphaexact versus FFmpeg; original strictbyteexact profile failed GPUinterpolation and is not qualified. |
| prepare | passed | Synthetic generation, independent oracle, exactcommands/runtimehashes and wrongoutput controls recorded; preserveddiagnostics included. |
| screen | passed | Actual candidate executed, no conventionaldecode fallback hidden; scoped admissibility and failures recorded. |
| correctness | passed | All32candidateframes and all32baselineframes checked; candidate max1LSB RGB and exactalpha. Wrongframe/corruptselector/truncated/codec/EOF controls; seeks, epochcancel, freshdevices; wallclock sequence32frames, actualcanvas screenshot validates lastframe independently. |
| performance | passed | Nine alternating fresh-device32frame jobs incl parsing,pipeline,uploads,render,fullreadback andteardown; median ratio 0.839050, allpairs faster, >=5% median threshold met.8x less upload/source texture storage, not8x totalGPU memory. Visiblecanvas timeline separately verified; no physicalscanout claim. |
| results | passed | Texture-native browser playback qualified for declared Hap1 BC1 bounded-fidelity profile; visiblecanvas max1LSB RGB, exactalpha, lifecycle/timingcontrols,16.09% median job saving and8x less textureupload/storage. Strict byte-exact CPU/GPU profile remains failed. |
| decision | passed | Texture-native browser playback qualified for declared Hap1 BC1 bounded-fidelity profile; visiblecanvas max1LSB RGB, exactalpha, lifecycle/timingcontrols,16.09% median job saving and8x less textureupload/storage. Strict byte-exact CPU/GPU profile remains failed. |

[New run](../../shared/runs/20260920T034332Z-recovered-video-qualification/run.json) · [Evidence index](evidence/index.json) · [Complete history](history.jsonl) · [Item contract](item.json)
