<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# guarded narrow arithmetic

Full identity: `R202.guarded-narrow-arithmetic`. Reused R-numbers are separate mechanisms.

Current imported decision: **PURSUE** (full-completion).

Actual pinned8-bit IDCT bias/shifts/storage/clipping match int16 intermediate candidate for65536 threshold-corner blocks plus20000 random blocks under UBSan;2673,-2673,-32768 rejected. Arithmetic feasibility established; actual coefficient admission rates and SIMD cost still needed.

Next action: Find where bytes/timestamps actually change, are copied, or are withheld. Compare against current persistent mux/parser behavior.

## Definition and contract

The H.264-style integer 4×4 inverse-transform model derives a cheap conservative intermediate bound from the maximum absolute dequantized input. For int16 intermediates the largest admitted threshold is 2672; 2672 is admitted and 2673 rejected. Across 120,000 randomized blocks, the guard admitted 57,948. Every admitted block matched the wide-integer reference exactly and zero admitted blocks overflowed. The guard intentionally rejects 38,366 actually-safe blocks, favoring correctness over maximal admission. This validates the admission strategy; it is not yet a SIMD speed benchmark or production decoder kernel.

Output contract: Independent parsing of sample payload, configuration, PTS/DTS/duration and required output; valid container plus continuing playback when this is the tested claim.

Primary metric: Complete preparation/startup/refill work, bytes and ownership; output parser acceptance alone is not the metric.

Adverse control: Wrong size/offset/configuration or a non-random-access cut must fail specifically; cancellation cannot publish another generation.

## Stages

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | pending | Historical evidence retained; stage-specific acceptance has not been reconciled into this checklist. |
| screen | passed | Historical bounded screening disposition recorded. This is completion of screening, not candidate correctness. |
| correctness | pending | Historical evidence retained; stage-specific acceptance has not been reconciled into this checklist. |
| performance | pending | Historical evidence retained; stage-specific acceptance has not been reconciled into this checklist. |
| results | passed | Existing results indexed with current byte identities; historical mismatches are separately retained in the migration record. |
| decision | passed | Historical decision imported verbatim: PURSUE. No integration or qualification inferred. |

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R202.guarded-narrow-arithmetic.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R202.guarded-narrow-arithmetic.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R193-R202-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R193-R202-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_g/audits/R202.guarded-narrow-arithmetic.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_g/audits/R202.guarded-narrow-arithmetic.md)
- [results/full-completion/r202/result.json](../../../results/full-completion/r202/result.json)
