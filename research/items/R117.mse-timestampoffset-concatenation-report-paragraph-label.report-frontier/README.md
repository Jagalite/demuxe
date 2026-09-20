<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# MSE timestampOffset concatenation [report paragraph label]

Current decision: **pursue**. Explicit segment offsets-3/-5 map sourceDTSepochs3/7 into outputDTS0/2 while retaining83.333ms composition lead, yielding[.083333,4.083332]. All96complete queriedimages and95subsequentcontinuousimages plusinitialpicture match isolatedsource oracles; no doublebias or stalegenerationpublication ishidden.

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | New executable probe and declared workload/controls registered with source/input/runtime evidence. |
| screen | passed | Explicit segment offsets-3/-5 map sourceDTSepochs3/7 into outputDTS0/2 while retaining83.333ms composition lead, yielding[.083333,4.083332]. All96complete queriedimages and95subsequentcontinuousimages plusinitialpicture match isolatedsource oracles; no doublebias or stalegenerationpublication ishidden. |
| correctness | passed | Explicit segment offsets-3/-5 map sourceDTSepochs3/7 into outputDTS0/2 while retaining83.333ms composition lead, yielding[.083333,4.083332]. Actual two-sourceB-frame24fps160x96AVC,48codedpacketseach, allcompositionreordered; exactindependentRGBA/ordinal mapping, crossboundary reverse/forward seeks, EOF andcleanup. A delayedactualReadableStream read fromoldgeneration isrejected beforeappend withrangesunchanged. Deliberatedoublebias produces onlyfirst2.083332s andcontrol detects missingsecondinterval. Video-only reportcapability; noselectedaudio/gaplessAAC, arbitrarycontainer orproductionqueueclaim. |
| performance | not_applicable | Literal report investigates whether requested timeline mapping works; no completecost orresource-saving hypothesis. Capabilityendpoint doesnot require manufacturing a benchmark. All outputtiming distinctions areexplicit. |
| results | passed | Actual new execution raw outcomes, controls and scoped interpretation retained. |
| decision | passed | pursue: Explicit segment offsets-3/-5 map sourceDTSepochs3/7 into outputDTS0/2 while retaining83.333ms composition lead, yielding[.083333,4.083332]. All96complete queriedimages and95subsequentcontinuousimages plusinitialpicture match isolatedsource oracles; no doublebias or stalegenerationpublication ishidden. |

Next/reopen: Bounded timeline report stage complete. Reopen for selectedaudio andencoderpriming, maintainedsessionplan integration ornewsourceepochs; preservemode-specific source-to-presentation map andsingleapplication ofbias.

[Current contract](item.json) · [History](history.jsonl) · [Evidence](evidence/index.json)
