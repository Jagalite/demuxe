<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# compact exact packet index

Full identity: `R226.compact-exact-packet-index.report-continuity`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

Current owner retains only bounded RAP times and live segment metadata, not a full six-scalar packet index. The reported 79.5% saving compares padded fields, not current MP4 tables; a persistent source-bound index owner is prerequisite.

Next action: Define the actual required seek fields and compare a bounded varint sidecar against existing container index plus sparse RAP records, including signed CTS and malformed deltas.

## Definition and contract

A 20-second 29.97-fps H.264/MP4 with B-frames yields 600 packets. The prototype stores packet byte gaps, sizes, DTS deltas, signed PTS−DTS offsets, durations, and a key flag using unsigned/zig-zag varints. Decoding that sidecar reconstructs every original scalar exactly, including the six observed CTS offsets [0, 1001, 2002, 3003, 4004, 5005] and duration 1001. The compact form is 5,913 bytes versus 28,800 bytes for six padded 64-bit fields per packet — 79.5% smaller. This is a representation result, not yet a browser seek benchmark or a comparison to MP4's own optimized sample tables.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R226.compact-exact-packet-index.report-continuity.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R226.compact-exact-packet-index.report-continuity.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R223-R231-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R223-R231-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_e/audits/R226.compact-exact-packet-index.report-continuity.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_e/audits/R226.compact-exact-packet-index.report-continuity.md)
