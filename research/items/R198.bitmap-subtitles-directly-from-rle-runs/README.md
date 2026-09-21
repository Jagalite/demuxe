<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# bitmap subtitles directly from RLE runs

Disposition: **stop_current_profile**. correctness: **failed**, performance: **not_applicable**.

Implemented real binaryPGS display/palette-only-update/clear packets with complete64x16 short colored/transparent RLE runs, rather than only a packet model. Bounded parser validates segment/object/row bounds and retains32 spans; oversized/truncated runs reject, independent FFmpeg subtitle timestamps confirm0.5/0.75/1.5second events. However exact fullRGBA compositing fails before GPU qualification: the proposed RGB integer-over rule yields128 at semitransparent white while actual FFmpeg overlay gives129, affecting768 channels in both active palette states. Clear is exact. One attempted limited-Y-domain correction hypothesized127; it instead increased mismatch to2 and is explicitly falsified, not an explanation accepted as proof. Preserve both failed outputs/plans and stop this strict compositor variant. No GPU runtime or performance claim follows an unresolved output-domain mismatch. The realPGS parser/setup is available; blocker is now experimental fidelity, not missingGPUAPI or absentproductionadapter. Multiple/fragmentedobjects and generalchroma are outside this bounded fixture.

Next: Reopen with independently resolved palette/compositing color-domain semantics reproducing exact FFmpeg reference, then implement/test GPUspan versus indexedbitmap outputs and timing. Do not silently absorb the1-code error into tolerance or treat the failed limited-Y explanation as verified.

[Current record](item.json) · [History](history.jsonl) · [Run analysis](evidence/20260919T221504Z-limited-y-oracle/analysis.md)

## Imported D01–D73 screening supplement

Existing decisions and stage gates above remain unchanged. These are external component findings, not a new maintained-player execution. All controls, failures and destination limits remain in the linked reports.

- **D24 — Give RLE subtitle bitmaps to a native PNG decoder without a raster intermediate**: merge_existing. [Original report](../../shared/runs/20260921T023214Z-screened-ideas-d01-d73/snapshots/batches/batch04_D21-D25/demuxe_batch4/REPORT.md); [indexed contract and follow-up](evidence/20260921T023214Z-screened-ideas-d01-d73/screenings.json).
- **D62 — Retain PGS object data, not stale rendered subtitles**: merge_existing. [Original report](../../shared/runs/20260921T023214Z-screened-ideas-d01-d73/snapshots/batches/batch14_D62-D64/demuxe_batch14/REPORT.md); [indexed contract and follow-up](evidence/20260921T023214Z-screened-ideas-d01-d73/screenings.json).

[Campaign reconciliation](../../campaigns/screened-ideas-d01-d73.md). Current-owner retesting is required before promoting this supplement.
