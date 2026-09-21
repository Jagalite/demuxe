<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Screen float-preserving destinations before writing adapters

Full identity: `R010.screen-float-preserving-destinations-before-writing-adapters`.

Current decision: **pursue** (actual-progressive-native-browser-full-pcm-and-lifecycle).

UnmodifiedChrome152nativeIEEEfloat32 WAV accepts genuineprogressiveHTTP: playbackstartsafter229376of2304044bytes (9.95percent), all288000stereoframes exact against authoredFloat32PCM, peak1.749997 survives aboveunity, noextraend samples. Native4s/back0.5sseeks match exactexpectedframe, unsupportedWAVformatrejects, freshongoingHTTPcancelclosesbeforecomplete. Sixsecondboundedfiniteknownlengthrange source; this resolves directprogressivefloataudio destination. Itdoesnotestablish floatMSE, multiplexedA/V, infiniteunknownlength orconstantmemoryarbitrarilylongstreams. PriorMSEsampleentries remainunsupported.

Next action: Scopedfloatdestinationresearch complete. Treat synchronizedA/V, unknownlength/live delivery and productionownership as separatelydefined followons.

## Stages

| Stage | Status | Basis |
|---|---|---|
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | Authored6sIEEEfloat32stereowave, boundedprogressiveHTTP range server, independent expectedPCM, negativeformat andactualcancel controls. |
| screen | passed | Actualprogressive directfloataudio accepted inunmodifiedbrowser; MSEpriornegative keptseparate. |
| correctness | passed | UnmodifiedChrome152nativeIEEEfloat32 WAV accepts genuineprogressiveHTTP: playbackstartsafter229376of2304044bytes (9.95percent), all288000stereoframes exact against authoredFloat32PCM, peak1.749997 survives aboveunity, noextraend samples. Native4s/back0.5sseeks match exactexpectedframe, unsupportedWAVformatrejects, freshongoingHTTPcancelclosesbeforecomplete. Sixsecondboundedfiniteknownlengthrange source; this resolves directprogressivefloataudio destination. Itdoesnotestablish floatMSE, multiplexedA/V, infiniteunknownlength orconstantmemoryarbitrarilylongstreams. PriorMSEsampleentries remainunsupported. |
| performance | not_applicable | Sourcecontract is destinationfeasibility/fidelity; noCPU,startuporenergy advantageasserted. Progressive-beforecompletion is measuredcapability, not comparative performance. |
| results | passed | UnmodifiedChrome152nativeIEEEfloat32 WAV accepts genuineprogressiveHTTP: playbackstartsafter229376of2304044bytes (9.95percent), all288000stereoframes exact against authoredFloat32PCM, peak1.749997 survives aboveunity, noextraend samples. Native4s/back0.5sseeks match exactexpectedframe, unsupportedWAVformatrejects, freshongoingHTTPcancelclosesbeforecomplete. Sixsecondboundedfiniteknownlengthrange source; this resolves directprogressivefloataudio destination. Itdoesnotestablish floatMSE, multiplexedA/V, infiniteunknownlength orconstantmemoryarbitrarilylongstreams. PriorMSEsampleentries remainunsupported. |
| decision | passed | UnmodifiedChrome152nativeIEEEfloat32 WAV accepts genuineprogressiveHTTP: playbackstartsafter229376of2304044bytes (9.95percent), all288000stereoframes exact against authoredFloat32PCM, peak1.749997 survives aboveunity, noextraend samples. Native4s/back0.5sseeks match exactexpectedframe, unsupportedWAVformatrejects, freshongoingHTTPcancelclosesbeforecomplete. Sixsecondboundedfiniteknownlengthrange source; this resolves directprogressivefloataudio destination. Itdoesnotestablish floatMSE, multiplexedA/V, infiniteunknownlength orconstantmemoryarbitrarilylongstreams. PriorMSEsampleentries remainunsupported. |

[New run](../../shared/runs/20260919T214914Z-float-destination-qualification/run.json) · [Evidence index](evidence/index.json) · [Complete history](history.jsonl) · [Item contract](item.json)

## Imported D01–D73 screening supplement

Existing decisions and stage gates above remain unchanged. These are external component findings, not a new maintained-player execution. All controls, failures and destination limits remain in the linked reports.

- **D68 — Preserve PCM values while changing only the incompatible representation**: merge_existing. [Original report](../../shared/runs/20260921T023214Z-screened-ideas-d01-d73/snapshots/batches/batch16_D68-D70/demuxe_batch16/REPORT.md); [indexed contract and follow-up](evidence/20260921T023214Z-screened-ideas-d01-d73/screenings.json).

[Campaign reconciliation](../../campaigns/screened-ideas-d01-d73.md). Current-owner retesting is required before promoting this supplement.
