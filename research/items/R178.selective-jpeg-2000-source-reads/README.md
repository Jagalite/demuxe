<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# selective JPEG 2000 source reads

Full identity: `R178.selective-jpeg-2000-source-reads`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

RangeReader can fetch bounded offsets, but current software output is complete decoded image and no OpenJPEG decode-area callback/index adapter exists. Historical quality/reduce constraints did not reduce bytes inside the same tile.

Next action: Define source-bound tile/packet mapping and one OpenJPEG callback adapter; compare two corner ROIs and full-image reduced-resolution control, counting unique bytes rather than decoder calls.

## Definition and contract

The fixture is a 1,024×1,024 grayscale JPEG 2000 codestream, 65,562 bytes, with 256×256 tiles and RPCL progression. A custom OpenJPEG source callback recorded every read/seek and its unique source-byte footprint while decode-area, resolution reduction, and layer limits were applied. Each streaming-source output was compared byte-for-byte against the same decode using the whole codestream as backing. The strong result is spatial/tile selectivity: a requested region need not force all codestream bytes through the source adapter. The negative/unfinished part is equally important: this fixture did not show additional source-byte reduction from resolution or quality-layer restrictions within the same tile region.

Output contract: Source/version identity, requested exact sample/frame, dependency coverage and byte-range accounting.

Primary metric: Total bytes and time to correct startup/target, including cold index/identity acquisition; bounded retained bytes.

Adverse control: Change the source/version or corrupt an offset/proof and cancel one consumer. No stale or unverified bytes may be published.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R178.selective-jpeg-2000-source-reads.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R178.selective-jpeg-2000-source-reads.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R172-R182-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R172-R182-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_g/audits/R178.selective-jpeg-2000-source-reads.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_g/audits/R178.selective-jpeg-2000-source-reads.md)
