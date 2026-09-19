<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Disable in-loop filtering only after proving it is a no-op

Full identity: `R291.disable-in-loop-filtering-only-after-proving-it-is-a-no-op`. Reused R-numbers are separate mechanisms.

Prior imported decision: **STOP_PROFILE** (full-completion).

Pinned FFmpeg already returns when alpha/beta are zero and the historical encoder already disabled these filters. Its successful rewrite needed an artificially enabled equivalent source. A new derivative preprocessor has no demonstrated useful no-op workload in current software decode.

Next action: Reopen only with naturally occurring eligible enabled slices and measured avoidable browser cost; retain near-threshold QP rejection.

## Definition and contract

Mechanism. Prepare a valid H.264 derivative that disables deblocking for an entire admitted picture/slice region only when the original filter provably cannot alter any affected sample. Begin with conservative structural conditions on all luma/chroma edge thresholds and quantizer information; do not infer safety from visual smoothness. Keep coded prediction and residual meaning unchanged while rebuilding affected headers, alignment, escaping, lengths, and offsets. First scope. Progressive eight-bit 4:2:0, CAVLC, one slice per picture, controlled quantizers and offsets, ordinary I/P prediction. First prove all affected thresholds make filtering an identity. Do not generalize one low quantizer value to uninspected blocks or chroma edges.

Output contract: Exact integer planes or an explicitly defined numerical/altered-output contract; compare the final requested region and later references where relevant.

Primary metric: Complete decode/process/present cost, transfers, command work or peak live storage for identical requested output.

Adverse control: Change stride, crop, phase, alpha, edge neighborhood or resource generation; exercise a case where the proposed shortcut is ineligible.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R291.disable-in-loop-filtering-only-after-proving-it-is-a-no-op.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R291.disable-in-loop-filtering-only-after-proving-it-is-a-no-op.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R289_R294_Proposals.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R289_R294_Proposals.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_i/audits/R291.disable-in-loop-filtering-only-after-proving-it-is-a-no-op.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_i/audits/R291.disable-in-loop-filtering-only-after-proving-it-is-a-no-op.md)
