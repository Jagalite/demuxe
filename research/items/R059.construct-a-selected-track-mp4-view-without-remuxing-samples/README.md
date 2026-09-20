<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Construct a selected-track MP4 view without remuxing samples

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
