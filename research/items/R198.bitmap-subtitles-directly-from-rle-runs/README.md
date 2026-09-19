<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# bitmap subtitles directly from RLE runs

Full identity: `R198.bitmap-subtitles-directly-from-rle-runs`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

Native subtitle overlay accepts libass bitmap tiles, not PGS RLE spans. Historical exact integer span composition uses a packet model and does not provide demux/PGS lifetime ownership.

Next action: Build only a bounded run parser/compositor oracle for real selected PGS events before GPU integration; palette-only/clear/seek state and oversized run must be decisive controls.

## Definition and contract

A bounded PGS-style run parser retained spans as row/start/length/palette-index records. The direct run compositor and conventional materialized-index-bitmap compositor share the same exact integer source-over RGBA rule. Exact equality passes for the base subtitle, overlapping objects/palette/crop, palette updates, clear events and seek-state restoration, including transparent and partially transparent palette entries. This proves the run representation and direct rasterization component. The proposed GPU execution remains blocked by missing GPU APIs, and the fixture is a controlled PGS-style packet model rather than a full demux integration.

Output contract: Independent rendering or browser-owned reference appropriate to the same contract, including hidden state, timing, ordering and clear events.

Primary metric: Required caption capability or total render/extraction cost and retained cue/atlas memory.

Adverse control: Seek into an active cue, change fonts/layout/source, or omit a required style/control. No silent simplification or stale overlay.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R198.bitmap-subtitles-directly-from-rle-runs.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R198.bitmap-subtitles-directly-from-rle-runs.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R193-R202-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R193-R202-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_d/audits/R198.bitmap-subtitles-directly-from-rle-runs.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_d/audits/R198.bitmap-subtitles-directly-from-rle-runs.md)
