<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Keep display-only transformations out of CPU video filters

Full identity: `R008.keep-display-only-transformations-out-of-cpu-video-filters`.

Current decision: **stop_current_profile** (actual-route correctness qualification).

Actual Software transpose versus isolated Hybrid retained-frame rotation executed, but declared native-size explicitBT709 max3RGB fidelity failed: Software max0; Hybrid max50/59/18 atPTS1/6/10. UnrotatedHybrid repeatsmax50 atsamechromaedge, locatingexistingcrossdecoder/presentationdifference rather thanrotationmath. No whole-playerbenchmark. Earlier55.8%preparedframecomponentresult remainsvalidonlywithinitspreviousscope. Exact SPDX provenance for29 captured source snapshots is supplied in a separately registered licensing errata; the original manifest phrase source headers retained is preserved, and the scientific outcome is unchanged.

Next action: Reopen whole-player transition after matching chroma-edge reconstruction is qualified against independentFFmpeg under a predeclared fidelitycontract; then complete cancel/source/lifecycle and measure realCPU/startup/seeks/cleanup. Preserve original component result without treating it as a tier upgrade.

## Stages

| Stage | Status | Basis |
|---|---|---|
| define | passed | Bounded actual90degree CPUfilter replacement; explicitBT709 native180x320, max3RGB exactalpha declared before freshcapture. |
| prepare | passed | Isolatedruntime snapshots, original andexplicitBT709packetcopyfixture, independentFFmpeg oracles, nofilter causalcontrol preserved. |
| screen | passed | ActualSoftwareFFmpeg versusHybridWebCodecs routes observed, with movingvideo andstereoPCM; candidateexecuted. |
| correctness | failed | Native-sizeHybrid exceeds3RGBgate atchromaedges (max50/59/18); independentSoftwaremax0. NofilterHybridcontrol repeatsmax50; fullcancel/sourcegate notadvanced. |
| performance | not_applicable | Not executed because whole-playerfidelity gatefailed; no cost or tierqualificationclaim. |
| results | passed | Actual Software transpose versus isolated Hybrid retained-frame rotation executed, but declared native-size explicitBT709 max3RGB fidelity failed: Software max0; Hybrid max50/59/18 atPTS1/6/10. UnrotatedHybrid repeatsmax50 atsamechromaedge, locatingexistingcrossdecoder/presentationdifference rather thanrotationmath. No whole-playerbenchmark. Earlier55.8%preparedframecomponentresult remainsvalidonlywithinitspreviousscope. Exact SPDX provenance for29 captured source snapshots is supplied in a separately registered licensing errata; the original manifest phrase source headers retained is preserved, and the scientific outcome is unchanged. |
| decision | passed | Actual Software transpose versus isolated Hybrid retained-frame rotation executed, but declared native-size explicitBT709 max3RGB fidelity failed: Software max0; Hybrid max50/59/18 atPTS1/6/10. UnrotatedHybrid repeatsmax50 atsamechromaedge, locatingexistingcrossdecoder/presentationdifference rather thanrotationmath. No whole-playerbenchmark. Earlier55.8%preparedframecomponentresult remainsvalidonlywithinitspreviousscope. Exact SPDX provenance for29 captured source snapshots is supplied in a separately registered licensing errata; the original manifest phrase source headers retained is preserved, and the scientific outcome is unchanged. |

[New run](../../shared/runs/20260920T135047Z-whole-player-license-provenance/run.json) · [Evidence index](evidence/index.json) · [Complete history](history.jsonl) · [Item contract](item.json)
