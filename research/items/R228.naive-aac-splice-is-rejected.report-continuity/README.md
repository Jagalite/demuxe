<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# naive AAC splice is rejected

Full identity: `R228.naive-aac-splice-is-rejected.report-continuity`. Reused R-numbers are separate mechanisms.

Prior imported decision: **STOP_PROFILE** (full-completion).

The supplied counterexample preserves lengths/sample counts yet changes decoded AAC B, decisively invalidating naive concatenation. Current queue opens each source separately rather than claiming same-header raw splice continuity.

Next action: If seamless AAC composition is needed, compare explicit reset/priming treatment against independently decoded segments with full sample equality.

## Definition and contract

Two separately encoded 3-second stereo AAC-LC ADTS streams were concatenated byte-for-byte. File length is exactly the sum of the inputs, and the concatenated decoder produces the expected total number of samples, but the second segment is not equal to decoding B as its own stream. Maximum float difference is 0.090085; 144,640 sample frames differ above 1e-7. This rejects the naive “compatible headers means raw AAC segments are spliceable” route. Transform overlap and other decoder state must be accounted for, or the player must create an explicit discontinuity/reset instead of pretending the coded streams are continuous.

Output contract: Exact PCM/encoded output where claimed; otherwise declared numeric tolerance against a stronger independent reference, including delay, tails and state.

Primary metric: Complete specified audio operation, output sample count/phase and practical CPU/memory or repeated-query cost.

Adverse control: Extrema, invalid precision, changed predictor/phase/history or a nonlinear stage must invalidate assumptions. No covert resampling/downmix/quality change.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R228.naive-aac-splice-is-rejected.report-continuity.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R228.naive-aac-splice-is-rejected.report-continuity.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R223-R231-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R223-R231-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_e/audits/R228.naive-aac-splice-is-rejected.report-continuity.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_e/audits/R228.naive-aac-splice-is-rejected.report-continuity.md)
