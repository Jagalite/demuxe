<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Exact local-offset storage for high-bit-depth reference tiles

Full identity: `R211.exact-local-offset-storage-for-high-bit-depth-reference-tiles`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

Current fast presenter is 8-bit 420P; compact 10-bit reference tiles would require changed software decoder storage and reconstruction access. Report poststorage exactness does not establish codec-internal support or eliminate required plane materialization.

Next action: Audit one high-bit-depth retained reference owner and compare compact/uncompact tile access including checkerboard fallback before integration.

## Definition and contract

A 10-bit 640×360 plane was divided into 16×16 tiles. If a tile's range was ≤255, it was stored as one 16-bit local minimum plus exact 8-bit offsets; wider tiles fell back to native 16-bit values. 97.4% of tiles qualified in the controlled smooth source and total payload fell 48.3%. Recovery was exact, as was a downstream integer filter. A 0/1023 checkerboard forced wide fallback for every control tile.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R211.exact-local-offset-storage-for-high-bit-depth-reference-tiles.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R211.exact-local-offset-storage-for-high-bit-depth-reference-tiles.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R203-R213-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R203-R213-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_f/audits/R211.exact-local-offset-storage-for-high-bit-depth-reference-tiles.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_f/audits/R211.exact-local-offset-storage-for-high-bit-depth-reference-tiles.md)
