<!-- SPDX-License-Identifier: CC-BY-4.0 -->

Actualpartial-mdat endpoint now has complete48changing-picture fidelity and source-cancel guards. Every48picture matches whole-input baseline in24freshstreams; firstsample-minusonebyte emitsnone untiltail. Elevenpaired streams withidentical450ms tailavailability give449.84ms median firstcorrectframe improvement whileallfulloutputs/EOF pass.

Correctness: Exact source report parserquestion: completecoded samples delivered fromexistingmdat before enclosingpayloadcomplete.48distinct fullRGBA referenceframe hashes fromindependentwhole-input MSE; all48 continuouslypresented frames exact ininitialpartial,incompletecontrol and22timedstreams. Partialhead12samples presents11before450ms tail; incompletefirstsample0beforetail. Cancelledgeneration stale tailappend returnsfalse beforeSourceBuffer mutation. Allmediaelements/URLs released. Preparedencodedinput, not newstreamingmux emission, selectedaudio or arbitraryfragment layouts.

Performance: Predeclared11alternating fresh-owner pairs, samebytesavailable headt0/tailt450ms. Candidateappendshead, baselineawaitswholemdat. Every48framefullhash/EOF checked; sourceopen/append/play/finaltail/cleanup included and firstcorrectframe/completeEOF separatelyreported. Median startupimprovement449.84ms, bootstrap95[444.71,455.48]ms, threshold200ms passed. Controllednetworkavailability model, no physicalnetwork/CPU/memory claim; sharedbrowser/sourceacquisition common. Mechanismonly helpswhen producer releasescomplete samplesbeforetail; currentmux interface not changed.

Next/reopen: Pursue streamingproducer integration only with actualincremental write/ownership boundary and equivalentwork benchmark; retain whole-output fidelity and cancelled-tail guard. Currentcomponent answersparserquestion, not automaticplayerrouteadmission.

Bounded research result, not production or release admission.
