<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Fuse qualified video effects into one GPU presentation pass

Full identity: `R023.fuse-qualified-video-effects-into-one-gpu-presentation-pass`.

Current decision: **stop_current_profile** (actual whole-player correctness and paired performance).

Actual within-Hybrid fused WebGPU presenter passes bounded picture/audio/lifecycle correctness, but five paired whole-player trials show8.52%higher median steadyChromeCPU andonly1/5lower pairs versus cheapestCanvas2Dfilter+rotation+cachedsubtitles. Required10%medianreduction/everypair gatefails. Prior76.35%preparedRGBAcomponent result remains historicalagainstitsdifferentCPUbaseline; no productionadmission changed.

Next action: Do not integrate this native-size SDR fused presenter for CPU savings. Reopen for a materially different representative resolution/effect workload with the cheapest correct Canvas baseline and a newly predeclared whole-player benefit gate; broader decoder/scaler/HDR fidelity and production integration remain separate.

## Stages

| Stage | Status | Basis |
|---|---|---|
| define | passed | ExplicitlyBT709 native-size90degree/invert/subtitle effects withinHybrid; cheapestCanvas2D baseline; max3RGB and10%median/everypair CPU gates declared before execution. |
| prepare | passed | Isolated retained-worker runtime, pinned base assets, identical compressed stream hashes, independent integerdisplay oracle and preserved commands/source snapshots. |
| screen | passed | Both actualPlayer arms executed WebCodecs/mpv audio/subtitle owners and correct Canvas/fusedGPU markers; no fallback. |
| correctness | passed | Full pictures atPTS1/6/10 max1RGB acrosscandidate/baseline/oracle, partialsubtitlealpha/wrongcontrols, movingstereo440/880Hz, seek/sourceidentity/EOF/cancel/cleanup pass withinboundedprofile. |
| performance | failed | Fivecomplete stable-process steadyCPU pairs: candidate median+8.52%,1/5lower. Primarygate>=10%medianreduction andallpairslower fails. Onepre-steady startupobserverfailure retained; onlysecondaryaccounting corrected. |
| results | passed | Actual within-Hybrid fused WebGPU presenter passes bounded picture/audio/lifecycle correctness, but five paired whole-player trials show8.52%higher median steadyChromeCPU andonly1/5lower pairs versus cheapestCanvas2Dfilter+rotation+cachedsubtitles. Required10%medianreduction/everypair gatefails. Prior76.35%preparedRGBAcomponent result remains historicalagainstitsdifferentCPUbaseline; no productionadmission changed. |
| decision | passed | Actual within-Hybrid fused WebGPU presenter passes bounded picture/audio/lifecycle correctness, but five paired whole-player trials show8.52%higher median steadyChromeCPU andonly1/5lower pairs versus cheapestCanvas2Dfilter+rotation+cachedsubtitles. Required10%medianreduction/everypair gatefails. Prior76.35%preparedRGBAcomponent result remains historicalagainstitsdifferentCPUbaseline; no productionadmission changed. |

[New run](evidence/20260920T134029Z-whole-player-fused-effects/run.json) · [Evidence index](evidence/index.json) · [Complete history](history.jsonl) · [Item contract](item.json)
