<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Copy only the part of a decoded VideoFrame an analysis task actually needs

Full identity: `R319.copy-only-the-part-of-a-decoded-videoframe-an-analysis-task-actually-needs`. Reused R-numbers are separate mechanisms.

Prior imported decision: **STOP_PROFILE** (full-completion).

The exact proposal requires an analysis task needing only a rectangle. Current caller consumes whole pictures and optimized path transfers retained frames; no unnecessary analysis full-copy boundary was found.

Next action: Reopen when a concrete bounded analysis consumer is added; test real decoded I420/NV12 rectangle alignment, crop and color against same-decoder full-copy reference.

## Definition and contract

Use an admitted copyTo rectangle on real decoder output, preserving subsampling alignment, crop and color semantics. Compare full-copy-then-crop and GPU alternatives; reconstruction cost itself is unchanged.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R319.copy-only-the-part-of-a-decoded-videoframe-an-analysis-task-actually-needs.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R319.copy-only-the-part-of-a-decoded-videoframe-an-analysis-task-actually-needs.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/conversation/PROPOSAL_SCOPE_EXTRACTS.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/conversation/PROPOSAL_SCOPE_EXTRACTS.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_d/audits/R319.copy-only-the-part-of-a-decoded-videoframe-an-analysis-task-actually-needs.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_d/audits/R319.copy-only-the-part-of-a-decoded-videoframe-an-analysis-task-actually-needs.md)
