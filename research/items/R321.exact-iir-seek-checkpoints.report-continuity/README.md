<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Exact IIR seek checkpoints

Full identity: `R321.exact-iir-seek-checkpoints.report-continuity`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

The native adaptation path streams unchanged PCM/FIFO; the worklet consumes a ring and does not expose an IIR filter recurrence/checkpoint state. A fixed float64 biquad proof does not supply a checkpoint ABI for arbitrary production filters.

Next action: Select one actual requested fixed-coefficient IIR implementation, expose all recurrence/precision state and compare one resumed segment against uninterrupted output; changed coefficients/order must invalidate the checkpoint.

## Definition and contract

A stable biquad was run in a fixed float64 direct-form recurrence. Storing its complete two-value state every 1024 samples allowed later segment requests to resume from the nearest checkpoint and reproduce the sequential oracle bit-for-bit for all tested positions. For the measured seeks, processed input fell from 143,790 to 4,526 samples and runtime from 73.77 to 2.28 ms. The checkpoint state occupied only 1104 bytes in this fixture. Coefficient, precision, denormal, and processing-order identity are part of the cache key.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R321.exact-iir-seek-checkpoints.report-continuity.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R321.exact-iir-seek-checkpoints.report-continuity.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R318-R323-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R318-R323-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/root2/audits/R321.exact-iir-seek-checkpoints.report-continuity.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/root2/audits/R321.exact-iir-seek-checkpoints.report-continuity.md)
