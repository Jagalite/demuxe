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

## Imported D01–D73 screening supplement

Existing decisions and stage gates above remain unchanged. These are external component findings, not a new maintained-player execution. All controls, failures and destination limits remain in the linked reports.

- **D20 — Eliminate disagreement in color interpretation, not coded pictures**: merge_existing. [Original report](../../shared/runs/20260921T023214Z-screened-ideas-d01-d73/snapshots/batches/batch03_D14-D20/demuxe_batch3/REPORT.md); [indexed contract and follow-up](evidence/20260921T023214Z-screened-ideas-d01-d73/screenings.json).
- **D22 — Translate known static orientation into the browser's presentation metadata**: merge_existing. [Original report](../../shared/runs/20260921T023214Z-screened-ideas-d01-d73/snapshots/batches/batch04_D21-D25/demuxe_batch4/REPORT.md); [indexed contract and follow-up](evidence/20260921T023214Z-screened-ideas-d01-d73/screenings.json).
- **D29 — Metadata-only cropping: valid coded output, wrong browser presentation**: stop/negative. [Original report](../../shared/runs/20260921T023214Z-screened-ideas-d01-d73/snapshots/batches/batch05_D26-D30/demuxe_batch5/REPORT.md); [indexed contract and follow-up](evidence/20260921T023214Z-screened-ideas-d01-d73/screenings.json).
- **D46 — Treat codec/container color conflicts as an authority problem**: merge_existing. [Original report](../../shared/runs/20260921T023214Z-screened-ideas-d01-d73/snapshots/batches/batch09_D44-D47/demuxe_batch9/REPORT.md); [indexed contract and follow-up](evidence/20260921T023214Z-screened-ideas-d01-d73/screenings.json).
- **D49 — Crop the native presentation, not the encoded image**: merge_existing. [Original report](../../shared/runs/20260921T023214Z-screened-ideas-d01-d73/snapshots/batches/batch10_D48-D51/demuxe_batch10/REPORT.md); [indexed contract and follow-up](evidence/20260921T023214Z-screened-ideas-d01-d73/screenings.json).
- **D73 — Resolve geometry at the boundary that actually presents it**: merge_existing. [Original report](../../shared/runs/20260921T023214Z-screened-ideas-d01-d73/snapshots/batches/batch17_D71-D73/demuxe_batch17/REPORT.md); [indexed contract and follow-up](evidence/20260921T023214Z-screened-ideas-d01-d73/screenings.json).

[Campaign reconciliation](../../campaigns/screened-ideas-d01-d73.md). Current-owner retesting is required before promoting this supplement.
