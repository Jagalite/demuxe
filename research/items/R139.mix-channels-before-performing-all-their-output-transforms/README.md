<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Mix channels before performing all their output transforms

Full identity: `R139.mix-channels-before-performing-all-their-output-transforms`. Reused R-numbers are separate mechanisms.

Prior imported decision: **STOP_PROFILE** (full-completion).

The selected Native adaptation explicitly preserves channel layout and does not admit an output downmix. Spectral mixing before synthesis requires that requested matrix plus compatible codec window/state; no such operation is available to optimize in this route.

Next action: Reopen for one existing downmix decoder path and audit its AC3 optimized ordering before proposing a new transform change.

## Definition and contract

For an explicitly requested downmix, audit whether compatible codec windows permit mixing spectral coefficients before synthesis. Verify per-channel processing, overlap and numeric behavior; existing AC-3 optimizations are the baseline.

Output contract: Independent known truth plus a specific expected observation, not self-reported counters from the candidate.

Primary metric: Decision power, reproducibility or diagnostic cost without changing the measured player outcome.

Adverse control: A different failure, stale source/hash or malformed record must not count as the intended finding.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R139.mix-channels-before-performing-all-their-output-transforms.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R139.mix-channels-before-performing-all-their-output-transforms.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/conversation/PROPOSAL_SCOPE_EXTRACTS.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/conversation/PROPOSAL_SCOPE_EXTRACTS.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_f/audits/R139.mix-channels-before-performing-all-their-output-transforms.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_f/audits/R139.mix-channels-before-performing-all-their-output-transforms.md)
