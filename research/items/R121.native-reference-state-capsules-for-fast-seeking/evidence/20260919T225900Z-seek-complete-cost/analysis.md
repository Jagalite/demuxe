<!-- SPDX-License-Identifier: CC-BY-4.0 -->

Actual160x96CAVLC ref1 noB POC2 I_PCM reference seed and22copied entropy payloads reconstruct every host/native wantedpicture exactly; frame_num fields repaired, otherRBSPbits unchanged. Wrong/missing seed controls fail, hiddenpreroll andseek/EOF/stalecallback cleanup pass. Auxiliaryseed23164B vsoriginalprefix2923B and11cold preparation+nativefirsttarget pairs median114.42%slower than ordinaryRAP preroll fail pursuitgate. Stop cold near-RAP profile; no arbitrary/reference-portability claim.

Correctness: Complete source syntax trace/hash restricts CAVLCprogressive8bit420ref1weightp0POC2noBsingle-slice/noMMCO/listrewrite. Hand-authored60I_PCMmacroblocks reproduceP1exact,22P suffixes modifyonly fixed frame_num fields. HostfullYUV andnativefullRGBA seed/suffix exact; wrong/missing seed fail. Unshiftedvariant remains host-exact and isnot misreported asfailed. Native hidden-preroll query/play/seek/EOF/generation/cleanup pass; all22timedtargethashes exact.

Performance: Predeclared11alternating coldsource jobs include freshwhole-source certificate,P1decode,I_PCMauthoring,suffixpatch,mux,actualnativefirsttarget andownercleanup vsordinaryRAPprefix. Median saving-114.4218%, allpairsnegative range[-189.3234,-12.8822]%, fails+5%gate; bootstrap recorded. Seed23164B vs2923B originalprefix. Scope excludesamortizedcachedcapsules/longGOPs anddoesnot inferphysicaldecoder/RSSenergy.

Next/reopen: Keep ordinaryRAP preroll for this near-boundarycoldprofile. Reopen only with measured repeatedly-used deep-GOPworkload and proper seednonpresentation, source-bound logicalstate guards andfullreference semantics; charge capsulebytes/preparation ratherthan claiming I_PCMalone makesseeks cheaper.

Bounded research result, not production or release admission.
