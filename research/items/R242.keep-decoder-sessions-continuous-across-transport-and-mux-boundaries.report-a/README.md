<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Keep decoder sessions continuous across transport and mux boundaries

Full identity: `R242.keep-decoder-sessions-continuous-across-transport-and-mux-boundaries.report-a`. Reused R-numbers are separate mechanisms.

Prior imported decision: **ALREADY_IMPLEMENTED** (top100).

Reconciled completed prior evidence: The recovered report was blocked by an opaque insecure origin. The present secure environment has VideoDecoder. More decisively, current decoder bridge calls operation 3 only for a null-packet drain, and workers flush only for that operation; ordinary packet batches keep the decoder session. No unconditional transport-batch flush opportunity is present in these owners.

Next action: Trace the precise owner, generation, reset/flush/commit or allocation being changed. Reproduce the present behavior before removing any guard.

## Definition and contract

The required VideoDecoder object was unavailable on the permitted opaque/insecure origin. The normative specification does distinguish flushing from batch completion and requires a key chunk after a decoder flush, but that documentation is not runtime evidence for this binary.[S2] Verdict: BLOCKED. No continuous-versus-flushed WebCodecs experiment was run. Native FFmpeg drains and MSE operations were not counted as substitutes. The Demuxe production source was not audited in this run, so there is no claim that current production batching is wrong.

Output contract: Actual output identity and timeline, surviving consumers, committed generations and cleanup; candidate execution must be visible.

Primary metric: User-visible operation latency, duplicated work or peak/steady live resource ownership; not object counts alone.

Adverse control: Cancel or replace a source at the changed boundary and delay a stale callback/consumer; reject late publication and premature reuse.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R242.keep-decoder-sessions-continuous-across-transport-and-mux-boundaries.report-a.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R242.keep-decoder-sessions-continuous-across-transport-and-mux-boundaries.report-a.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/prerequisites/result.json](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/prerequisites/result.json)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R239-R246-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R239-R246-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/root/audits/R242.keep-decoder-sessions-continuous-across-transport-and-mux-boundaries.report-a.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/root/audits/R242.keep-decoder-sessions-continuous-across-transport-and-mux-boundaries.report-a.md)
- [results/local-screening/README.md](../../../results/local-screening/README.md)
- [results/local-screening/follow-up.md](../../../results/local-screening/follow-up.md)
- [results/local-screening/full-queue-audit.md](../../../results/local-screening/full-queue-audit.md)
