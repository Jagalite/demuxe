<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# native frame relay without JS pixel readback

Full identity: `R145.native-frame-relay-without-js-pixel-readback.report-continuity`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

Current Hybrid transfers decoded VideoFrames directly to a single canvas consumer, already avoiding pixel copies in noCopy mode. The exact report proposes native media-track capture/generator routing, an absent destination contract.

Next action: Name a required second media-track destination and verify one capture/processor/generator relay with frame IDs; a dropped/delayed final frame must fail requested output completeness.

## Definition and contract

The source video used native <video> decoding. captureStream() supplied a video track; MediaStreamTrackProcessor exposed VideoFrame objects; a pass-through TransformStream forwarded the frames unchanged to MediaStreamTrackGenerator; a second <video> rendered the generated track. Over ~2.2 s, 67 frames entered the transform and 66 were presented by the second video. Both tracks remained live, the destination had readyState=4, and neither media element reported an error. There was no canvas draw, VideoFrame.copyTo(), pixel array, encoder, or compressed re-mux in the relay path. This proves an application-visible native-frame routing primitive; it does not prove zero-copy inside the browser/GPU implementation.

Output contract: Actual output identity and timeline, surviving consumers, committed generations and cleanup; candidate execution must be visible.

Primary metric: User-visible operation latency, duplicated work or peak/steady live resource ownership; not object counts alone.

Adverse control: Cancel or replace a source at the changed boundary and delay a stale callback/consumer; reject late publication and premature reuse.

## Stages

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | pending | Historical evidence retained; stage-specific acceptance has not been reconciled into this checklist. |
| screen | passed | Historical bounded screening disposition recorded. This is completion of screening, not candidate correctness. |
| correctness | pending | Historical evidence retained; stage-specific acceptance has not been reconciled into this checklist. |
| performance | pending | Historical evidence retained; stage-specific acceptance has not been reconciled into this checklist. |
| results | passed | Existing results indexed with current byte identities; historical mismatches are separately retained in the migration record. |
| decision | passed | Historical decision imported verbatim: DEFER_SETUP. No integration or qualification inferred. |

Pending preparation/correctness/performance means the historical evidence has not
been converted into a stage acceptance record; it does not erase historical passes
or require rerunning them. Read the evidence before updating these fields.

## Working files

- [Item state and original definition](item.json): authoritative current metadata; update this README when changing it.
- [Decision history](history.jsonl): imported records and their exact ledger locations; append future decisions.
- [Evidence index](evidence/index.json): paths, hashes, and historical hash declarations.
- [Research process](../../PROCESS.md): run layout, gates, fixture and license requirements.

Create `tests/` and `fixtures/` only when this item needs its own code or data.
Shared historical harnesses remain in `tests/` at repository root; commands and
fixture references are in the linked evidence. No unverified harness-to-item
association was invented during migration.

## Archived evidence and definitions

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R145.native-frame-relay-without-js-pixel-readback.report-continuity.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R145.native-frame-relay-without-js-pixel-readback.report-continuity.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R132-R145-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R132-R145-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_d/audits/R145.native-frame-relay-without-js-pixel-readback.report-continuity.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_d/audits/R145.native-frame-relay-without-js-pixel-readback.report-continuity.md)
