<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# the same no-index fMP4 when all bytes are local

Full identity: `R142.the-same-no-index-fmp4-when-all-bytes-are-local.report-continuity`. Reused R-numbers are separate mechanisms.

Prior imported decision: **ALREADY_IMPLEMENTED** (full-completion).

Local File playback already goes through an object URL and direct-first policy. There is no rule rejecting local media solely for lacking mfra; the locality-dependent direct attempt exists without a new adapter.

Next action: Do not add an index solely for already-local bytes; use one no-index local fixture as a regression when changing direct admission.

## Definition and contract

Loaded as a Blob, the same file exposed a seekable 0–6 s interval. Seeking to 4.2 s and playing produced frame callbacks beginning at 4.233333 s and advanced normally. Implication. Lack of an explicit random-access trailer can be acceptable for a fully local/in-memory object because there is no network byte-fetch penalty. Route choice should therefore depend on byte locality, not just container syntax.

Output contract: Source/version identity, requested exact sample/frame, dependency coverage and byte-range accounting.

Primary metric: Total bytes and time to correct startup/target, including cold index/identity acquisition; bounded retained bytes.

Adverse control: Change the source/version or corrupt an offset/proof and cancel one consumer. No stale or unverified bytes may be published.

## Current stage reconciliation

**already_implemented** — retained source decision, no new experiment. [Run](../../shared/runs/20260919T200619Z-source-stage-reconciliation/run.json).

## Stages

| Stage | Status | Basis |
|---|---|---|
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | not_applicable | This investigation ended at a source-only already_implemented decision. No candidate correctness or performance qualification is claimed; reopen under the item-specific condition. |
| screen | passed | Historical bounded screening disposition recorded. This is completion of screening, not candidate correctness. |
| correctness | not_applicable | This investigation ended at a source-only already_implemented decision. No candidate correctness or performance qualification is claimed; reopen under the item-specific condition. |
| performance | not_applicable | This investigation ended at a source-only already_implemented decision. No candidate correctness or performance qualification is claimed; reopen under the item-specific condition. |
| results | passed | Existing results indexed with current byte identities; historical mismatches are separately retained in the migration record. |
| decision | passed | Prior scoped decision reconciled into the current checklist: already_implemented |

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R142.the-same-no-index-fmp4-when-all-bytes-are-local.report-continuity.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R142.the-same-no-index-fmp4-when-all-bytes-are-local.report-continuity.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R132-R145-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R132-R145-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_e/audits/R142.the-same-no-index-fmp4-when-all-bytes-are-local.report-continuity.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_e/audits/R142.the-same-no-index-fmp4-when-all-bytes-are-local.report-continuity.md)
