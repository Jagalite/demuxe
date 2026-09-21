<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Seek through APNG by resolving the last writer of each region

Disposition: **stop_current_profile**. correctness: **passed**, performance: **failed**.

Implemented actual bounded APNG CRC/sequence/geometry validated SOURCE/NONE operation index, standalone PNG datastream reconstruction and per-pixel lastwriter unresolved-region planner. Genuine24frame64x64 animation excludes magenta defaultIDAT; overlapping64x8 strips include fullytransparent SOURCE clears. Browser nativeImageDecoder and candidate/forward standalone-image composition exactlymatch everyRGBAchannel at5requested targets includinginitialtransparentcanvas andfinalframe. Independent authored CPUoracle verified against FFmpeg equivalentnormalAPNG withtransparentfirstframe; FFmpeg rejects default-image-excluded variant, retained initialfailure, browsernative independently accepts original. Candidatefinalrequest decodes8wholeframeimages versus24forwardoperations; never claims subimage selective decoder reconstruction. BadCRC/OVER/PREVIOUSreject, stalebitmapclosedbeforepublication/freshsurvivorexact,392opened392closed. Ninealternating coldwhole requests include fetch/index/PNGauthoring/decode/canvas/hash/close. Cheapestbaseline nativeImageDecoder mean3.144ms; equalexplicit-onecanvas/onebitmap forward baseline10.478ms; candidate6.422ms. Candidate savingagainstcheapest-104.24% CI[-123.01587412904871, -87.38738655531215], failing predeclaredlower95>=10%gate. Native decoder internalretentionopaque; no claim of equalnativeinternalmemory orpeakRSS savings. Candidatewins againstslowforward standalonecomposition butdoesnotbeat available nativebaseline. Sourcebytesfullyread; no networkseekclaim. StrictRGBA8/noancillarymetadata profile, unsupportedsemanticsrejected.

Next: Stop currenttiny APNGlastwriter implementation: exact and8vs24 standaloneimages butnative APNGdecoder is cheaper. Reopen for representative sparse largeranimations and explicit retention budget where measurednative baseline is insufficient; retain fullselectedimage decode and index costs.

[Current record](item.json) · [History](history.jsonl) · [Run analysis](evidence/20260919T235353Z-apng-normal-oracle/analysis.md)

## Imported D01–D73 screening supplement

Existing decisions and stage gates above remain unchanged. These are external component findings, not a new maintained-player execution. All controls, failures and destination limits remain in the linked reports.

- **D25 — Cold APNG seeks using native PNG subframe views and disposal-aware plans**: merge_existing. [Original report](../../shared/runs/20260921T023214Z-screened-ideas-d01-d73/snapshots/batches/batch04_D21-D25/demuxe_batch4/REPORT.md); [indexed contract and follow-up](evidence/20260921T023214Z-screened-ideas-d01-d73/screenings.json).

[Campaign reconciliation](../../campaigns/screened-ideas-d01-d73.md). Current-owner retesting is required before promoting this supplement.
