<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Vectorize across independent streams rather than time

Full identity: `R212.vectorize-across-independent-streams-rather-than-time`. Reused R-numbers are separate mechanisms.

Prior imported decision: **STOP_PROFILE** (full-completion).

Current player produces one selected audio stream, not eight independent IMA state machines. Cross-stream SIMD requires simultaneous independent demand absent from this playback profile; adding dummy streams would create an artificial gain.

Next action: Reopen when actual multi-stream workload exists; compare bounded lane batching to optimized scalar streams and reject latency added solely to fill lanes. AVX2 host speed is not Wasm128 speed.

## Definition and contract

A native AVX2 benchmark decoded eight independent IMA-ADPCM state machines in SIMD lanes. All 12,000,000 output samples matched the scalar implementation exactly. Best measured time was 21.76 ms scalar versus 10.49 ms AVX2, a 2.07× speedup. This is strong evidence for cross-stream SIMD on this recurrence, not a claim about a complete browser/FFmpeg audio pipeline.

Output contract: Actual output identity and timeline, surviving consumers, committed generations and cleanup; candidate execution must be visible.

Primary metric: User-visible operation latency, duplicated work or peak/steady live resource ownership; not object counts alone.

Adverse control: Cancel or replace a source at the changed boundary and delay a stale callback/consumer; reject late publication and premature reuse.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R212.vectorize-across-independent-streams-rather-than-time.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R212.vectorize-across-independent-streams-rather-than-time.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R203-R213-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R203-R213-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_g/audits/R212.vectorize-across-independent-streams-rather-than-time.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_g/audits/R212.vectorize-across-independent-streams-rather-than-time.md)
