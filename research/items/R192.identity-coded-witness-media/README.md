<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# identity-coded witness media

Full identity: `R192.identity-coded-witness-media`.

Current scoped decision: **pursue**.

Real maintained output distinguishes the selected-video view (13 frames, zero audio RMS) from the requested A/V positives. Exact host packet/PCM comparisons supplement browser frame and audio-presence witnesses. This is diagnostic correctness, not a performance optimization.

Next action: Promote selected-track output witnesses into maintained regressions with explicit reference contracts; physical output and exact post-seek audio capture remain separate.

## Current stages

| Stage | Status |
|---|---|
| define | passed |
| prepare | passed |
| screen | passed |
| correctness | passed |
| performance | not_applicable |
| results | passed |
| decision | passed |

[Shared report](../../shared/runs/20260921T030620Z-screened-owner-completion/REPORT.md) · [Authoritative item contract/state](item.json) · [Evidence index](evidence/index.json) · [Complete history](history.jsonl).

Production integration and release qualification are separate. Current stages apply to the scope above; earlier findings retain their original scope.

## Screened-owner follow-up (20260921T030620Z-screened-owner-completion)

**D13 — executed_existing_owner_or_control**: Use track-output witnesses: the video-only D02 presentation has 13 frames and zero RMS, while the qualified A/V/audio routes have nonzero output and independent complete decode checks.

[Shared report](../../shared/runs/20260921T030620Z-screened-owner-completion/REPORT.md) · [Current item state](item.json) · [Append-only history](history.jsonl).

Latest scoped decision: **pursue**. Real maintained output distinguishes the selected-video view (13 frames, zero audio RMS) from the requested A/V positives. Exact host packet/PCM comparisons supplement browser frame and audio-presence witnesses. This is diagnostic correctness, not a performance optimization.

Next action: Promote selected-track output witnesses into maintained regressions with explicit reference contracts; physical output and exact post-seek audio capture remain separate.

| Stage | Current status |
|---|---|
| define | passed |
| prepare | passed |
| screen | passed |
| correctness | passed |
| performance | not_applicable |
| results | passed |
| decision | passed |

Production integration and release qualification are separate. Earlier sections describe retained historical profiles.


## Retained earlier profile notes (historical)

Full identity: `R192.identity-coded-witness-media`.

Earlier decision: **pursue** (actual-route screen).

Identity-coded owned AVC/AAC witness passes independent host and actual Chromium barcode/channel-frequency checks. Video-order swap, stereo-channel swap and500ms audio shift remain decodable but all three are rejected by both oracles. First paused-canvas diagnostic repeatedly returned initial picture; corrected oracle waits actual presented-frame callback, preserving failure. Correct file all96host frame identities, five browser forward/back targets and eight tone epochs pass; diagnostic capability only, no physical latency claim.

Earlier next action: Research profile complete; reuse witness to falsify wrong media/timeline output.

## Stages

| Stage | Status | Basis |
|---|---|---|
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | Identity-coded owned AVC/AAC witness passes independent host and actual Chromium barcode/channel-frequency checks. Video-order swap, stereo-channel swap and500ms audio shift remain decodable but all three are rejected by both oracles. First paused-canvas diagnostic repeatedly returned initial picture; corrected oracle waits actual presented-frame callback, preserving failure. Correct file all96host frame identities, five browser forward/back targets and eight tone epochs pass; diagnostic capability only, no physical latency claim. |
| screen | passed | Identity-coded owned AVC/AAC witness passes independent host and actual Chromium barcode/channel-frequency checks. Video-order swap, stereo-channel swap and500ms audio shift remain decodable but all three are rejected by both oracles. First paused-canvas diagnostic repeatedly returned initial picture; corrected oracle waits actual presented-frame callback, preserving failure. Correct file all96host frame identities, five browser forward/back targets and eight tone epochs pass; diagnostic capability only, no physical latency claim. |
| correctness | passed | Identity-coded owned AVC/AAC witness passes independent host and actual Chromium barcode/channel-frequency checks. Video-order swap, stereo-channel swap and500ms audio shift remain decodable but all three are rejected by both oracles. First paused-canvas diagnostic repeatedly returned initial picture; corrected oracle waits actual presented-frame callback, preserving failure. Correct file all96host frame identities, five browser forward/back targets and eight tone epochs pass; diagnostic capability only, no physical latency claim. |
| performance | not_applicable | Identity-coded owned AVC/AAC witness passes independent host and actual Chromium barcode/channel-frequency checks. Video-order swap, stereo-channel swap and500ms audio shift remain decodable but all three are rejected by both oracles. First paused-canvas diagnostic repeatedly returned initial picture; corrected oracle waits actual presented-frame callback, preserving failure. Correct file all96host frame identities, five browser forward/back targets and eight tone epochs pass; diagnostic capability only, no physical latency claim. |
| results | passed | Identity-coded owned AVC/AAC witness passes independent host and actual Chromium barcode/channel-frequency checks. Video-order swap, stereo-channel swap and500ms audio shift remain decodable but all three are rejected by both oracles. First paused-canvas diagnostic repeatedly returned initial picture; corrected oracle waits actual presented-frame callback, preserving failure. Correct file all96host frame identities, five browser forward/back targets and eight tone epochs pass; diagnostic capability only, no physical latency claim. |
| decision | passed | Identity-coded owned AVC/AAC witness passes independent host and actual Chromium barcode/channel-frequency checks. Video-order swap, stereo-channel swap and500ms audio shift remain decodable but all three are rejected by both oracles. First paused-canvas diagnostic repeatedly returned initial picture; corrected oracle waits actual presented-frame callback, preserving failure. Correct file all96host frame identities, five browser forward/back targets and eight tone epochs pass; diagnostic capability only, no physical latency claim. |

[New run](../../shared/runs/20260919T224235Z-witness-qualification/run.json) · [Evidence index](evidence/index.json) · [Complete history](history.jsonl) · [Item contract](item.json)

## Imported D01–D73 screening supplement

Existing decisions and stage gates above remain unchanged. These are external component findings, not a new maintained-player execution. All controls, failures and destination limits remain in the linked reports.

- **D13 — A route needs track-output and timing witnesses, not only video and EOF**: merge_existing. [Original report](../../shared/runs/20260921T023214Z-screened-ideas-d01-d73/snapshots/batches/batch02_D08-D13/demuxe_batch2/REPORT.md); [indexed contract and follow-up](evidence/20260921T023214Z-screened-ideas-d01-d73/screenings.json).

[Campaign reconciliation](../../campaigns/screened-ideas-d01-d73.md). Current-owner retesting is required before promoting this supplement.
