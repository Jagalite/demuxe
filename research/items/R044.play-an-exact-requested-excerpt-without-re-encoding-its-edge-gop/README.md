<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Play an exact requested excerpt without re-encoding its edge GOP

Current decision: **stop_current_profile**. Hostindexed excerpt remains fullpicture/PCM exact, but actualpublicMSE end-control recipe is incorrect. Removingcodedmedia after7.65 tosetduration discards requiredlateB-frame dependencies: EOF image differs fromuntrimmedsource requestedlastframe, freezing7.541666. Bothfullsource andboundedowner fail identically; brokenpreroll starts4.125. Stop this presentationrecipe beforeperformance.

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | New executable probe and declared workload/controls registered with source/input/runtime evidence. |
| screen | passed | Hostindexed excerpt remains fullpicture/PCM exact, but actualpublicMSE end-control recipe is incorrect. Removingcodedmedia after7.65 tosetduration discards requiredlateB-frame dependencies: EOF image differs fromuntrimmedsource requestedlastframe, freezing7.541666. Bothfullsource andboundedowner fail identically; brokenpreroll starts4.125. Stop this presentationrecipe beforeperformance. |
| correctness | failed | Originalhostwindow for[3.35,7.65) retains original B-frameAVC/FLAC bytes and206400PCM samples exact. NewactualnativeMSE A/V owner hidespreroll, seeks3.35, removesafter7.65 then caps duration. Bothbaseline/candidate endat7.65 butfinalfullRGBAhash94eb... differs untrimmedsource7.645reference24d0..., lastpresentedtime7.541666 ratherthanrequired7.625. AudioWorkletactive span207232samples(+832), separatelyreportednotacousticclock. appendWindowStart3.35 adverse losesRAP andfirstpicture4.125. Allowners/AudioContexts close. Publicboundary correctnessfailed; laterpause/replay/cancel/perfgatesnotforced. |
| performance | not_applicable | Requestedpublic outputdoesnotmatchrequiredlastpicture andPCM interval; no valid equivalent-outputperformancebenchmark permitted. Hostboundedinput savings remainunmeasured, notdisproven bypresentationcontrollerfailure. |
| results | passed | Actual new execution raw outcomes, controls and scoped interpretation retained. |
| decision | passed | stop_current_profile: Hostindexed excerpt remains fullpicture/PCM exact, but actualpublicMSE end-control recipe is incorrect. Removingcodedmedia after7.65 tosetduration discards requiredlateB-frame dependencies: EOF image differs fromuntrimmedsource requestedlastframe, freezing7.541666. Bothfullsource andboundedowner fail identically; brokenpreroll starts4.125. Stop this presentationrecipe beforeperformance. |

Next/reopen: Reopenwith presentation-onlyend suppression preservingcodeddependencies and explicitsample-accurateaudio outputwindow; do not use codedframe removal totruncate B-frame output. Thenvalidatepause/replay/cancel andfullendpoint fidelity beforecost. Keep hostextractor positive andbrowserrecipe negative distinct.

[Current contract](item.json) · [History](history.jsonl) · [Evidence](evidence/index.json)
