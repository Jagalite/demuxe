<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Animated-image disposal checkpoints

Disposition: **pursue**. correctness: **passed**, performance: **passed**.

Real48-frame16x16 GIF89a withglobal/localpalettes, transparency, interlace, disposal1/2/3,20msduration. Restrictedvalid clear-per-literalLZW parser/compositor checkpoints postprior-disposal state every8frames, retaining6*1024Bcanvas payload. All48permutedrandomseek full premultipliedRGBA hashes match independentauthoredoracle, FFmpeg realGIFdecode andChromeImageDecoder; transparentRGB canonicalizedzero for canvasrepresentation, nohiddenRGBclaim. Native timestamps exact. Wrongcheckpointbeforepriorrestore-to-previous yieldsdifferentfullframe; truncatedGIF rejects; checkpointownerretirement clearsmaps/frames and rejectsreads; actualpendingnativeframe sourceepochdiscard/closes, freshcheckpointowner exact,481VideoFramesopened/closed. Ninecoldwholejobs includeinputfetch/parse/LZWdecode/checkpointpreparation/full48randomseekreplay/hash/cleanup. Candidate264compositions including48prepare vsforward1176; retainedcheckpointpayload6144B plusworking/prior-disposal state, no nativeinternalmemory/RSSclaim. Cheapestmeanbaselineforward9.667ms; nativepersistentImageDecoder42.722ms; candidate5.222ms. Savingagainstcheapest45.98% CI[20.259128167367834, 59.81630306995092], passinglower95>=10%. Scopeexplicitpalette/transparency/interlace/disposal fixture withboundedclear-per-literalLZW, notgeneralGIFdictionarydecoder/integration; preparationandcheckpointstoragepaidandreported.

Next: ActualGIF postdisposalcheckpoint component passes exactrandomseek and fullcost gates for boundedrestrictedprofile with6144Bcheckpointpayload. GeneralLZW andproductionanimatedowner integration remainseparate; retain wrongpre-disposalcheckpoint regression.

[Current record](item.json) · [History](history.jsonl) · [Run analysis](evidence/20260920T001739Z-real-gif-checkpoints/analysis.md)

## Imported D01–D73 screening supplement

Existing decisions and stage gates above remain unchanged. These are external component findings, not a new maintained-player execution. All controls, failures and destination limits remain in the linked reports.

- **D67 — Native image decoding with a source-derived animation seek plan**: merge_existing. [Original report](../../shared/runs/20260921T023214Z-screened-ideas-d01-d73/snapshots/batches/batch15_D65-D67/demuxe_batch15/REPORT.md); [indexed contract and follow-up](evidence/20260921T023214Z-screened-ideas-d01-d73/screenings.json).

[Campaign reconciliation](../../campaigns/screened-ideas-d01-d73.md). Current-owner retesting is required before promoting this supplement.


## Screened-owner follow-up (20260921T030620Z-screened-owner-completion)

**D67 — deferred_profile_followup**: Defer new WebP preview adapter until binary-alpha admission is trustworthy and it beats the maintained persistent/checkpoint baseline. Fractional-alpha failure remains.

[Shared report](../../shared/runs/20260921T030620Z-screened-owner-completion/REPORT.md) · [Current item state](item.json) · [Append-only history](history.jsonl).
