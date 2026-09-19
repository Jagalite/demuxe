<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Integrate video exposure over real frame durations instead of frame counts

Full identity: `R352.integrate-video-exposure-over-real-frame-durations-instead-of-frame-counts`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

Existing presentation selects/draws original frames; it does not request temporal box exposure. Implementing duration-aware blend changes presentation unless explicitly requested and needs a bounded exposure-frame owner and linear-light contract.

Next action: Use one requested VFR two-color exposure with 10/30 ms holds to compare exact 25/75 weighting against a bounded accumulator.

## Definition and contract

Investigate an explicitly requested temporal box-exposure renderer for a variable-frame-rate timeline. FFmpeg's tmix provides an established frame-mixing baseline, but a fixed count of frames and fixed weights do not by themselves define duration-aware exposure. [S10] Model each admitted input picture F_i as held on [t_i,t_(i+1)). For output exposure [a,b): w_i = max(0, min(b,t_(i+1)) - max(a,t_i))     Y = (sum_i w_i F_i) / (b-a) For example, linear-light red held for 10 ms and blue held for 30 ms contribute 25% and 75% to a 40 ms exposure, not 50% each. The proposed optimization sweeps actual presentation events. For overlapping output exposures, subtract portions leaving the window and add portions entering it, rather than rendering many uniformly spaced temporal subframes or repeatedly visiting every contributing picture.

Output contract: Exact integer planes or an explicitly defined numerical/altered-output contract; compare the final requested region and later references where relevant.

Primary metric: Complete decode/process/present cost, transfers, command work or peak live storage for identical requested output.

Adverse control: Change stride, crop, phase, alpha, edge neighborhood or resource generation; exercise a case where the proposed shortcut is ineligible.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R352.integrate-video-exposure-over-real-frame-durations-instead-of-frame-counts.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R352.integrate-video-exposure-over-real-frame-durations-instead-of-frame-counts.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R348_R352_Proposals.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R348_R352_Proposals.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_f/audits/R352.integrate-video-exposure-over-real-frame-durations-instead-of-frame-counts.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_f/audits/R352.integrate-video-exposure-over-real-frame-durations-instead-of-frame-counts.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_h/active-owner-reconciliation.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_h/active-owner-reconciliation.md)
