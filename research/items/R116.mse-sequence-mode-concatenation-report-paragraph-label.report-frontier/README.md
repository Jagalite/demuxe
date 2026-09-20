<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# MSE sequence-mode concatenation [report paragraph label]

Current decision: **pursue**. Sequence mode, without manual transition offsets, automatically uses-3.083333/-5.083334 and yields adjacent[0,3.999998] picture epochs from sourceDTS3/7. It intentionally removes each epoch leadingpresentationbias; it isnotidentical toexplicitsegments mapping. All96complete queriedimages and95subsequentcontinuousimages plusinitialpicture match isolatedsource oracles; no doublebias or stalegenerationpublication ishidden.

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | New executable probe and declared workload/controls registered with source/input/runtime evidence. |
| screen | passed | Sequence mode, without manual transition offsets, automatically uses-3.083333/-5.083334 and yields adjacent[0,3.999998] picture epochs from sourceDTS3/7. It intentionally removes each epoch leadingpresentationbias; it isnotidentical toexplicitsegments mapping. All96complete queriedimages and95subsequentcontinuousimages plusinitialpicture match isolatedsource oracles; no doublebias or stalegenerationpublication ishidden. |
| correctness | passed | Sequence mode, without manual transition offsets, automatically uses-3.083333/-5.083334 and yields adjacent[0,3.999998] picture epochs from sourceDTS3/7. It intentionally removes each epoch leadingpresentationbias; it isnotidentical toexplicitsegments mapping. Actual two-sourceB-frame24fps160x96AVC,48codedpacketseach, allcompositionreordered; exactindependentRGBA/ordinal mapping, crossboundary reverse/forward seeks, EOF andcleanup. A delayedactualReadableStream read fromoldgeneration isrejected beforeappend withrangesunchanged. Deliberatedoublebias produces onlyfirst2.083332s andcontrol detects missingsecondinterval. Video-only reportcapability; noselectedaudio/gaplessAAC, arbitrarycontainer orproductionqueueclaim. |
| performance | not_applicable | Literal report investigates whether requested timeline mapping works; no completecost orresource-saving hypothesis. Capabilityendpoint doesnot require manufacturing a benchmark. All outputtiming distinctions areexplicit. |
| results | passed | Actual new execution raw outcomes, controls and scoped interpretation retained. |
| decision | passed | pursue: Sequence mode, without manual transition offsets, automatically uses-3.083333/-5.083334 and yields adjacent[0,3.999998] picture epochs from sourceDTS3/7. It intentionally removes each epoch leadingpresentationbias; it isnotidentical toexplicitsegments mapping. All96complete queriedimages and95subsequentcontinuousimages plusinitialpicture match isolatedsource oracles; no doublebias or stalegenerationpublication ishidden. |

Next/reopen: Bounded timeline report stage complete. Reopen for selectedaudio andencoderpriming, maintainedsessionplan integration ornewsourceepochs; preservemode-specific source-to-presentation map andsingleapplication ofbias.

[Current contract](item.json) · [History](history.jsonl) · [Evidence](evidence/index.json)
