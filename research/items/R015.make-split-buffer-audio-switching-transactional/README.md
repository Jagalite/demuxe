<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Make split-buffer audio switching transactional

Full identity: `R015.make-split-buffer-audio-switching-transactional`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

Track selection restarts entire remux with rollback; split buffers currently support unequal tails only, not prepare/commit/retire audio switching. Transaction and source generations need design before same-object reuse.

Next action: Specify one paused same-codec audio transaction retaining video; compare digital markers and covering frame, then cancel before commit and verify old track remains authoritative.

## Definition and contract

Timeline · Follow-on architecture experiment · P1 · Risk: High First environment: Browser-only; adaptation integration later. Dependencies: None; verify prerequisites locally. Status: Untested hypothesis. Proposed mechanism. Keep one MediaSource/video element and a retained video SourceBuffer while replacing only the selected audio stream. Use prepare/validate/commit/retire around a defined switch time rather than treating successful appends as a seamless switch. Source basis. MSE supplies changeType, timestamp offsets and append windows. It permits, but does not guarantee, a particular multiple-SourceBuffer combination or continuous codec switch. [M1] First agent experiment. Exercise same-codec switching first, then AAC/FLAC/Opus transitions only where accepted. Test pause, seek-before-commit, encoder preroll and failed preparation. Compare video identity and digital audio markers around the boundary.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R015.make-split-buffer-audio-switching-transactional.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R015.make-split-buffer-audio-switching-transactional.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_Routing_Optimization_Ideas.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_Routing_Optimization_Ideas.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/RESULTS.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/RESULTS.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_d/audits/R015.make-split-buffer-audio-switching-transactional.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_d/audits/R015.make-split-buffer-audio-switching-transactional.md)
