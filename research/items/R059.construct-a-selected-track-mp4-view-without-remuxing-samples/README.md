<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Construct a selected-track MP4 view without remuxing samples

## Production integration — 2026-09-21

**production_integrated_conditional**. Qualified immutable local AVC plus two-AAC MP4 views select tracks without changing selected samples. Browser file destination, exact decoded output, marked audio, seeks, cancellation/replacement and EOF are qualified; remote/unqualified sources retain remux.

[Maintained implementation](../../../docs/PRODUCTION-PIPELINE.md) · [Current qualification and tradeoffs](../../shared/runs/20260921T203100Z-production-pipeline/analysis.md). Release not published.

## Retained earlier research evidence


Full identity: `R059.construct-a-selected-track-mp4-view-without-remuxing-samples`.

Current decision: **pursue** (actual-matched-host-complete-cost-comparison).

Selectedtrackmetadata view preservesfulloriginalselectedvideo/PCM inall18jobs. Ninepaired completehostjobs includeinputread, metadataedit orordinaryFFmpegselectedtrackcopy, outputwrite/read asneeded, full decodeandtransfer. Saving30.76percent95[28.41,32.65] passes5percentgate. View retainsunselectedmdat bytes andisnotredactedexport. Priorfront/tailmoov,sourceidentity/browserseek/EOF controls retained. Initialunmatched fMP4trim andtailmoov-on-pipe baseline failures preserved, notcandidate failures.

Next action: Scopedcostdecision complete. Reopenfor materiallydifferent actualownership/transportworkload; no repeatedsamples toforcegate.

## Stages

| Stage | Status | Basis |
|---|---|---|
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | Historical fixture/runtime setup and actual outputs reconciled; latest declared artifact hashes match. No new setup or execution. |
| screen | passed | Historical outcome retained and individually reconciled. Front/tail moov views preserve selected packets, mdat and size; edit only 5368 metadata bytes. Default 440 Hz control and selected 880 Hz reference/view outputs distinguish track selection before/after seek to EOF; two structural negatives and cleanup recorded. Unselected bytes remain; not redacted export. |
| correctness | passed | Front/tail moov views preserve selected packets, mdat and size; edit only 5368 metadata bytes. Default 440 Hz control and selected 880 Hz reference/view outputs distinguish track selection before/after seek to EOF; two structural negatives and cleanup recorded. Unselected bytes remain; not redacted export. |
| performance | passed | Selectedtrackmetadata view preservesfulloriginalselectedvideo/PCM inall18jobs. Ninepaired completehostjobs includeinputread, metadataedit orordinaryFFmpegselectedtrackcopy, outputwrite/read asneeded, full decodeandtransfer. Saving30.76percent95[28.41,32.65] passes5percentgate. View retainsunselectedmdat bytes andisnotredactedexport. Priorfront/tailmoov,sourceidentity/browserseek/EOF controls retained. Initialunmatched fMP4trim andtailmoov-on-pipe baseline failures preserved, notcandidate failures. |
| results | passed | Selectedtrackmetadata view preservesfulloriginalselectedvideo/PCM inall18jobs. Ninepaired completehostjobs includeinputread, metadataedit orordinaryFFmpegselectedtrackcopy, outputwrite/read asneeded, full decodeandtransfer. Saving30.76percent95[28.41,32.65] passes5percentgate. View retainsunselectedmdat bytes andisnotredactedexport. Priorfront/tailmoov,sourceidentity/browserseek/EOF controls retained. Initialunmatched fMP4trim andtailmoov-on-pipe baseline failures preserved, notcandidate failures. |
| decision | passed | Selectedtrackmetadata view preservesfulloriginalselectedvideo/PCM inall18jobs. Ninepaired completehostjobs includeinputread, metadataedit orordinaryFFmpegselectedtrackcopy, outputwrite/read asneeded, full decodeandtransfer. Saving30.76percent95[28.41,32.65] passes5percentgate. View retainsunselectedmdat bytes andisnotredactedexport. Priorfront/tailmoov,sourceidentity/browserseek/EOF controls retained. Initialunmatched fMP4trim andtailmoov-on-pipe baseline failures preserved, notcandidate failures. |

[New run](../../shared/runs/20260919T214700Z-metadata-qualification/run.json) · [Evidence index](evidence/index.json) · [Complete history](history.jsonl) · [Item contract](item.json)

## Imported D01–D73 screening supplement

Existing decisions and stage gates above remain unchanged. These are external component findings, not a new maintained-player execution. All controls, failures and destination limits remain in the linked reports.

- **D02 — Same-size selected-track fMP4 projection**: merge_existing. [Original report](../../shared/runs/20260921T023214Z-screened-ideas-d01-d73/snapshots/batches/batch01_D01-D07/demuxe_native_screen/REPORT.md); [indexed contract and follow-up](evidence/20260921T023214Z-screened-ideas-d01-d73/screenings.json).

[Campaign reconciliation](../../campaigns/screened-ideas-d01-d73.md). Current-owner retesting is required before promoting this supplement.


## Screened-owner follow-up (20260921T030620Z-screened-owner-completion)

**D02 — executed_existing_owner_or_control**: Current selected-video projection plays, but has zero audio output. It is not a full A/V replacement; keep explicit video-only export/selection work separate.

[Shared report](../../shared/runs/20260921T030620Z-screened-owner-completion/REPORT.md) · [Current item state](item.json) · [Append-only history](history.jsonl).
