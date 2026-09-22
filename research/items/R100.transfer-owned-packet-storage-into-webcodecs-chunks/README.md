<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Transfer owned packet storage into WebCodecs chunks

Full identity: `R100.transfer-owned-packet-storage-into-webcodecs-chunks`.

Current decision: **inconclusive** (actual-complete-cost-comparison).

CompleteownedVP9 input allocation/chunk/decode/fullhostpixelcompare/close over8keyframes perowner,11pairs each160x96 and1280x720. Transferdetaches everyinput andallpictures/PTS exact; no decoderfallbackclaim. Smallmedian2.94percent95[-2.94,12.83],large-3.18percent95[-7.40,1.39] bothmisslower95>5percent. Noestablishedcompletecostadvantage, although APIownership correctnesspasses. MaintainedordinaryVP9sharedmailbox haszeroownedbytes, so measuredprofileonlyappliesalreadyownedinputs.

Next action: Scopedresearch costdecision complete; broaden only for a materially differentowner/workload withnewdeclaredgate.

## Stages

| Stage | Status | Basis |
|---|---|---|
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | Existing fixture/tool/runtime results and archived output/control identities reconciled; no new setup claimed. |
| screen | passed | Historical bounded screening disposition recorded. This is completion of screening, not candidate correctness. |
| correctness | passed | Whole-owned packet transfer detaches input, chunk bytes and independent decodedI420 match; shared heap/oversized-subview guards reject. Scope ownership boundary, not global worker copy elimination. |
| performance | failed | CompleteownedVP9 input allocation/chunk/decode/fullhostpixelcompare/close over8keyframes perowner,11pairs each160x96 and1280x720. Transferdetaches everyinput andallpictures/PTS exact; no decoderfallbackclaim. Smallmedian2.94percent95[-2.94,12.83],large-3.18percent95[-7.40,1.39] bothmisslower95>5percent. Noestablishedcompletecostadvantage, although APIownership correctnesspasses. MaintainedordinaryVP9sharedmailbox haszeroownedbytes, so measuredprofileonlyappliesalreadyownedinputs. |
| results | passed | CompleteownedVP9 input allocation/chunk/decode/fullhostpixelcompare/close over8keyframes perowner,11pairs each160x96 and1280x720. Transferdetaches everyinput andallpictures/PTS exact; no decoderfallbackclaim. Smallmedian2.94percent95[-2.94,12.83],large-3.18percent95[-7.40,1.39] bothmisslower95>5percent. Noestablishedcompletecostadvantage, although APIownership correctnesspasses. MaintainedordinaryVP9sharedmailbox haszeroownedbytes, so measuredprofileonlyappliesalreadyownedinputs. |
| decision | passed | CompleteownedVP9 input allocation/chunk/decode/fullhostpixelcompare/close over8keyframes perowner,11pairs each160x96 and1280x720. Transferdetaches everyinput andallpictures/PTS exact; no decoderfallbackclaim. Smallmedian2.94percent95[-2.94,12.83],large-3.18percent95[-7.40,1.39] bothmisslower95>5percent. Noestablishedcompletecostadvantage, although APIownership correctnesspasses. MaintainedordinaryVP9sharedmailbox haszeroownedbytes, so measuredprofileonlyappliesalreadyownedinputs. |

[New run](../../shared/runs/20260919T214500Z-owned-and-patch-qualification/run.json) · [Evidence index](evidence/index.json) · [Complete history](history.jsonl) · [Item contract](item.json)

## Ecosystem follow-up EB05

Evaluated at `20260922T131542Z-ecosystem-evaluation`: **followup_required**. [Assessment](evidence/20260922T131542Z-ecosystem-evaluation/evaluation.json) · [Shared report](../../shared/runs/20260922T131542Z-ecosystem-evaluation/REPORT.md).

Finite plans describe execution owners; the browser worker bounds outstanding inputs/frames and closes stale outputs once. They do not constitute a general representation/family contract across alternative decoder and presenter adapters. Existing tests exercise mocked decoder ownership, not native/polyfill interoperability.

Next gate / reopening condition: For one concrete new adapter, declare accepted chunk/frame family, format, memory domain, maximum outstanding objects and terminal release. Reject incompatible families and run exhaustion/cancel/source-replacement plus output comparisons before any conversion-cost claim.

This scoped supplement does not broaden earlier correctness or performance qualification.
