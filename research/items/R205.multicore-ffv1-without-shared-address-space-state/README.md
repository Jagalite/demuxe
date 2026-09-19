<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Multicore FFV1 without shared address-space state

Full identity: `R205.multicore-ffv1-without-shared-address-space-state`. Reused R-numbers are separate mechanisms.

Current imported decision: **PURSUE** (top100).

Prepared four independent FFV1 quadrant streams decoded by four separate host processes reconstruct 12 frames exactly. Swapped quadrants fail; preparation size recorded. Original-bitstream slice extraction and browser multicore route are not proven.

Next action: Trace actual input representation, requested tracks/features, current accepted plan and the decoder boundary. Check whether this adapter or destination is already used.

## Definition and contract

A prepared representation split a 640×360 lossless source into four independent 320×180 FFV1 quadrant streams. Four independent FFmpeg processes—no shared address space—decoded the streams and reconstructed all 120 visible BGR frames exactly. Median null-output wall time was 0.666 s sequential versus 0.228 s parallel, 2.92× faster. Compressed size increased 5.1%. This is deliberately PARTIAL: it proves the no-shared-memory execution model for independently encoded FFV1 regions, not extraction and independent decoding of slices from one existing FFV1 bitstream.

Output contract: Configuration and ordered codec payloads where copy is intended; requested frames/audio/timeline/features at the declared output boundary.

Primary metric: Correct additional admitted source/destination capability; otherwise full startup and CPU/resource cost.

Adverse control: Alter one admission-critical configuration, remove a required dependency, or preserve video while making selected audio unsupported. Candidate must reject or use a declared fallback.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R205.multicore-ffv1-without-shared-address-space-state.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R205.multicore-ffv1-without-shared-address-space-state.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R203-R213-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R203-R213-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_a/audits/R205.multicore-ffv1-without-shared-address-space-state.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_a/audits/R205.multicore-ffv1-without-shared-address-space-state.md)
- [results/top100/ffv1/result.json](../../../results/top100/ffv1/result.json)
