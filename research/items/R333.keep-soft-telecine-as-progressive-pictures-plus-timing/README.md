<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Keep soft telecine as progressive pictures plus timing

Full identity: `R333.keep-soft-telecine-as-progressive-pictures-plus-timing`. Reused R-numbers are separate mechanisms.

Prior imported decision: **STOP_PROFILE** (full-completion).

Related report found one progressive reconstruction plus repeat timing, not duplicated field pictures; current player does not explicitly enable deinterlacing and forwards complete decoded images. No removable telecine stage is identified for this default progressive profile. This is not whole-browser cadence qualification.

Next action: Reopen only on a trace showing duplicate reconstructions/uploads or actual deinterlace work for an admitted progressive-repeat source; then compare cadence/audio with genuinely interlaced control and no timestamp double-counting.

## Definition and contract

Proposal key: d5222d842b8d3e164997f8ba2022461693c6c13f82401dcea71fdb48ab67a80e Mechanism: For a validated progressive-picture source with repetition metadata, preserve one reconstructed picture and schedule its presentation holds instead of synthesizing fields and applying unnecessary deinterlacing. Initial scope: A controlled MPEG-2 source with frame pictures, independently established progressive samples, truthful repeat/field metadata, a fixed progressive-display contract, and an explicit authority rule for timestamps versus repeat-derived duration. Acceptance contract: Identical source picture samples and the same specified progressive presentation schedule, audio relationship, timed side data, seeking, and total duration. No implicit film-speed conversion or hard-telecine recovery.

Output contract: Configuration and ordered codec payloads where copy is intended; requested frames/audio/timeline/features at the declared output boundary.

Primary metric: Correct additional admitted source/destination capability; otherwise full startup and CPU/resource cost.

Adverse control: Alter one admission-critical configuration, remove a required dependency, or preserve video while making selected audio unsupported. Candidate must reject or use a declared fallback.

## Current stage reconciliation

**stop_current_profile** — retained source decision, no new experiment. [Run](../../shared/runs/20260919T200619Z-source-stage-reconciliation/run.json).

## Stages

| Stage | Status | Basis |
|---|---|---|
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | not_applicable | This investigation ended at a source-only stop_current_profile decision. No candidate correctness or performance qualification is claimed; reopen under the item-specific condition. |
| screen | passed | Historical bounded screening disposition recorded. This is completion of screening, not candidate correctness. |
| correctness | not_applicable | This investigation ended at a source-only stop_current_profile decision. No candidate correctness or performance qualification is claimed; reopen under the item-specific condition. |
| performance | not_applicable | This investigation ended at a source-only stop_current_profile decision. No candidate correctness or performance qualification is claimed; reopen under the item-specific condition. |
| results | passed | Existing results indexed with current byte identities; historical mismatches are separately retained in the migration record. |
| decision | passed | Prior scoped decision reconciled into the current checklist: stop_current_profile |

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R333.keep-soft-telecine-as-progressive-pictures-plus-timing.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R333.keep-soft-telecine-as-progressive-pictures-plus-timing.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R332_R337_Proposals.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R332_R337_Proposals.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R332-R337-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R332-R337-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_d/audits/R333.keep-soft-telecine-as-progressive-pictures-plus-timing.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_d/audits/R333.keep-soft-telecine-as-progressive-pictures-plus-timing.md)
