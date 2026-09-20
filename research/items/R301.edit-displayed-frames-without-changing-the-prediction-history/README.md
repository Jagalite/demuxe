<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Edit displayed frames without changing the prediction history

Full identity: `R301.edit-displayed-frames-without-changing-the-prediction-history`.

Current decision: **pursue** (actual_host_and_browser_capability).

Actual AV1 syntax author hides the original reference-building inter picture and inserts a visible independent intra-only edited picture with refresh_frame_flags0. The later original inter packet retains its entropy bytes and reconstructs exactly. All3 full output pictures/PTS match independent host and Chrome across2 fresh owners. Refreshing a live slot with the edited picture instead fails the required negative; cold delta rejects and every output/decoder closes. Prepared no-order-hint/no-frame-ID/no-grain same-profile capability only; no generalized editor, arbitrary timeline replacement or cost claim.

Next action: Retain opt-in prepared-profile guards; broader editor integration needs authenticated syntax contracts, arbitrary change/cancel handling and its own complete cost measurement.

## Stages

| Stage | Status | Basis |
|---|---|---|
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | Authored legal hidden reference and visible no-refresh intra-only syntax with entropy tiles preserved. |
| screen | passed | Actual later prediction continues unchanged after different displayed picture. |
| correctness | passed | Host/Chrome all output planes and timestamps exact; wrong refresh fails, cold delta rejects,2 fresh owners all close. |
| performance | not_applicable | Bounded syntax capability contract; no performance or physical-resource benefit claimed. |
| results | passed | Actual AV1 syntax author hides the original reference-building inter picture and inserts a visible independent intra-only edited picture with refresh_frame_flags0. The later original inter packet retains its entropy bytes and reconstructs exactly. All3 full output pictures/PTS match independent host and Chrome across2 fresh owners. Refreshing a live slot with the edited picture instead fails the required negative; cold delta rejects and every output/decoder closes. Prepared no-order-hint/no-frame-ID/no-grain same-profile capability only; no generalized editor, arbitrary timeline replacement or cost claim. |
| decision | passed | Actual AV1 syntax author hides the original reference-building inter picture and inserts a visible independent intra-only edited picture with refresh_frame_flags0. The later original inter packet retains its entropy bytes and reconstructs exactly. All3 full output pictures/PTS match independent host and Chrome across2 fresh owners. Refreshing a live slot with the edited picture instead fails the required negative; cold delta rejects and every output/decoder closes. Prepared no-order-hint/no-frame-ID/no-grain same-profile capability only; no generalized editor, arbitrary timeline replacement or cost claim. |

[New run](../../shared/runs/20260919T233313Z-av1-display-edit/run.json) · [Evidence index](evidence/index.json) · [Complete history](history.jsonl) · [Item contract](item.json)
