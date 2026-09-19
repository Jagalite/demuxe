<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Apply an explicit audio-sync offset by remapping one track

Full identity: `R062.apply-an-explicit-audio-sync-offset-by-remapping-one-track`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

Native copied tracks share an established timeline bias; no public one-track delay mapping or replacement transaction exists. Setting timestampOffset cannot retime accepted audio.

Next action: Define static positive/negative delay boundary semantics first; test one split-MSE impulse/flash fixture with nonzero origin and reject unrepresentable leading/tail samples rather than silently padding.

## Definition and contract

New timeline-feature path · P1 · Risk: High · PROPOSED / NOT TESTED First environment: Sandbox split-MSE pilot; static offset first, paused update second. Related cards: R15, R35, R52. Proposed mechanism. When the user requests an audio-delay adjustment, retime copied audio in its own SourceBuffer rather than decoding and filtering the entire presentation. Keep video timestamps and the playback owner unchanged. This changes intended timing, not the encoded samples. What is new. R52 preserved an existing source rate and earlier tests preserved source offsets. This card adds an explicitly requested timing effect and its reversible update contract. Source basis. MSE provides timestampOffset and append-window controls for subsequent coded frames; changing the property does not retime audio already buffered. The successful prior split-buffer work supplies a starting harness, not proof of this effect. [S1, L3]

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R062.apply-an-explicit-audio-sync-offset-by-remapping-one-track.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R062.apply-an-explicit-audio-sync-offset-by-remapping-one-track.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R58_R69_Research_Backlog.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R58_R69_Research_Backlog.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R58-R69-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R58-R69-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_d/audits/R062.apply-an-explicit-audio-sync-offset-by-remapping-one-track.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_d/audits/R062.apply-an-explicit-audio-sync-offset-by-remapping-one-track.md)
