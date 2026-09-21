<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# incremental mdat sample release

## Production integration — 2026-09-21

**conditional_adapter_not_default**. Actual Wasm write-callback sample release is implemented and tested, including incomplete-sample and stale-generation protection. Existing FFmpeg internally buffers its fragments; no earlier-input benefit or win over separate delivery was established, so progressive mode is not default.

[Maintained implementation](../../../docs/PRODUCTION-PIPELINE.md) · [Current qualification and tradeoffs](../../shared/runs/20260921T203100Z-production-pipeline/analysis.md). Release not published.

## Retained earlier research evidence


Current decision: **pursue**. Actualpartial-mdat endpoint now has complete48changing-picture fidelity and source-cancel guards. Every48picture matches whole-input baseline in24freshstreams; firstsample-minusonebyte emitsnone untiltail. Elevenpaired streams withidentical450ms tailavailability give449.84ms median firstcorrectframe improvement whileallfulloutputs/EOF pass.

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | New executable probe and declared workload/controls registered with source/input/runtime evidence. |
| screen | passed | Actualpartial-mdat endpoint now has complete48changing-picture fidelity and source-cancel guards. Every48picture matches whole-input baseline in24freshstreams; firstsample-minusonebyte emitsnone untiltail. Elevenpaired streams withidentical450ms tailavailability give449.84ms median firstcorrectframe improvement whileallfulloutputs/EOF pass. |
| correctness | passed | Exact source report parserquestion: completecoded samples delivered fromexistingmdat before enclosingpayloadcomplete.48distinct fullRGBA referenceframe hashes fromindependentwhole-input MSE; all48 continuouslypresented frames exact ininitialpartial,incompletecontrol and22timedstreams. Partialhead12samples presents11before450ms tail; incompletefirstsample0beforetail. Cancelledgeneration stale tailappend returnsfalse beforeSourceBuffer mutation. Allmediaelements/URLs released. Preparedencodedinput, not newstreamingmux emission, selectedaudio or arbitraryfragment layouts. |
| performance | passed | Predeclared11alternating fresh-owner pairs, samebytesavailable headt0/tailt450ms. Candidateappendshead, baselineawaitswholemdat. Every48framefullhash/EOF checked; sourceopen/append/play/finaltail/cleanup included and firstcorrectframe/completeEOF separatelyreported. Median startupimprovement449.84ms, bootstrap95[444.71,455.48]ms, threshold200ms passed. Controllednetworkavailability model, no physicalnetwork/CPU/memory claim; sharedbrowser/sourceacquisition common. Mechanismonly helpswhen producer releasescomplete samplesbeforetail; currentmux interface not changed. |
| results | passed | Actual new execution raw outcomes, controls and scoped interpretation retained. |
| decision | passed | pursue: Actualpartial-mdat endpoint now has complete48changing-picture fidelity and source-cancel guards. Every48picture matches whole-input baseline in24freshstreams; firstsample-minusonebyte emitsnone untiltail. Elevenpaired streams withidentical450ms tailavailability give449.84ms median firstcorrectframe improvement whileallfulloutputs/EOF pass. |

Next/reopen: Pursue streamingproducer integration only with actualincremental write/ownership boundary and equivalentwork benchmark; retain whole-output fidelity and cancelled-tail guard. Currentcomponent answersparserquestion, not automaticplayerrouteadmission.

[Current contract](item.json) · [History](history.jsonl) · [Evidence](evidence/index.json)
