<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Out-of-order GOP decode and reverse presentation

Disposition: **pursue**. correctness: **passed**, performance: **not_applicable**.

Implemented bounded independent-region decode/cache/reverse presentation for four12-frame closed H264 GOPs in one64x48source. ActualIDR NAL checks validate everyentry; non-RAP start13 rejects. Decodeorder3→1→2→0 retains exactly48 frames under221184visible-plane-byte cap; reverse delivery47→0 copies/hashes every fullI420 frame against independent fullhostdecode and draws tocanvas without further decode/seek. AllPTS/IDs are exact andframesclose. A separate boundedtwo-decoder schedule also retains all48; it does not erase historical four-native-capture stress losses. Actual sourceepoch replacement duringdecode discards12 oldframes, preserves12 exactnewsource-epoch outputs, and closesall24. Removing finalrequestedID47 makes completenessfail. This exact report key proposes a new bounded reverse-preview capability, not a concurrentdecode speedup; performance is not applicable and diagnosticwalltimes are not a benchmark. Tiny64x48, noB/openGOP, headlessdrawAPI rather than physicalscanout, nofullpreviewservice orproductionadmission claim.

Next: Scoped bounded reverse-preview capability verified. Reopen separately for larger byte budgets, B/openGOP dependencies, media-element capture, physical display or production scheduling; retain historical missingframe stressnegative.

[Current record](item.json) · [History](history.jsonl) · [Run analysis](evidence/20260919T222505Z-bounded-regions/analysis.md)

## Imported D01–D73 screening supplement

Existing decisions and stage gates above remain unchanged. These are external component findings, not a new maintained-player execution. All controls, failures and destination limits remain in the linked reports.

- **D71 — Compressed-only reverse views of independently decodable video**: merge_existing. [Original report](../../shared/runs/20260921T023214Z-screened-ideas-d01-d73/snapshots/batches/batch17_D71-D73/demuxe_batch17/REPORT.md); [indexed contract and follow-up](evidence/20260921T023214Z-screened-ideas-d01-d73/screenings.json).

[Campaign reconciliation](../../campaigns/screened-ideas-d01-d73.md). Current-owner retesting is required before promoting this supplement.


## Screened-owner follow-up (20260921T030620Z-screened-owner-completion)

**D71 — deferred_profile_followup**: Defer reverse/permutation authoring until an existing all-independent-source consumer needs it. Predictive video is rejected; preprocessing it to all-IDR is not free.

[Shared report](../../shared/runs/20260921T030620Z-screened-owner-completion/REPORT.md) · [Current item state](item.json) · [Append-only history](history.jsonl).
