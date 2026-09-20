<!-- SPDX-License-Identifier: CC-BY-4.0 -->

Hostindexed excerpt remains fullpicture/PCM exact, but actualpublicMSE end-control recipe is incorrect. Removingcodedmedia after7.65 tosetduration discards requiredlateB-frame dependencies: EOF image differs fromuntrimmedsource requestedlastframe, freezing7.541666. Bothfullsource andboundedowner fail identically; brokenpreroll starts4.125. Stop this presentationrecipe beforeperformance.

Correctness: Originalhostwindow for[3.35,7.65) retains original B-frameAVC/FLAC bytes and206400PCM samples exact. NewactualnativeMSE A/V owner hidespreroll, seeks3.35, removesafter7.65 then caps duration. Bothbaseline/candidate endat7.65 butfinalfullRGBAhash94eb... differs untrimmedsource7.645reference24d0..., lastpresentedtime7.541666 ratherthanrequired7.625. AudioWorkletactive span207232samples(+832), separatelyreportednotacousticclock. appendWindowStart3.35 adverse losesRAP andfirstpicture4.125. Allowners/AudioContexts close. Publicboundary correctnessfailed; laterpause/replay/cancel/perfgatesnotforced.

Performance: Requestedpublic outputdoesnotmatchrequiredlastpicture andPCM interval; no valid equivalent-outputperformancebenchmark permitted. Hostboundedinput savings remainunmeasured, notdisproven bypresentationcontrollerfailure.

Next/reopen: Reopenwith presentation-onlyend suppression preservingcodeddependencies and explicitsample-accurateaudio outputwindow; do not use codedframe removal totruncate B-frame output. Thenvalidatepause/replay/cancel andfullendpoint fidelity beforecost. Keep hostextractor positive andbrowserrecipe negative distinct.

Bounded research result, not production or release admission.
