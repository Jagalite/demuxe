<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# restricted IMA ADPCM through two clipped scans

Full identity: `R190.restricted-ima-adpcm-through-two-clipped-scans`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

Pinned IMA expansion is scalar recurrence with exact clipping; no associative scan representation/kernel or scratch owner exists. The historical Python two-scan implementation was slower and is algebra evidence only.

Next action: Design one work-efficient compiled two-scan kernel only after accounting scratch/synchronization; compare all samples plus index0/88 and predictor-extreme controls before any timing.

## Definition and contract

The tested variant is IMA ADPCM WAV. Its state dependencies are split into two associative clipped transitions: 1. step-index state i' = clip(i + adjust(code), 0, 88); 2. after the resulting per-code signed differences are known, predictor state p' = clip(p + delta, -32768, 32767). Using FFmpeg's exact integer rule delta = ((2mag+1)step)>>3, the two-scan construction is sample-exact to both a conventional sequential implementation and FFmpeg for: - mono: 8,164 samples; - stereo: 8,136 frames × 2 channels; - 25 synthetic controls covering predictor extremes and starting indices 0/1/44/87/88. The portable Hillis-Steele-style Python oracle took 59.1 ms for 8,192 nibbles versus 2.38 ms sequentially. Therefore the algebra is parallelizable and exact; a work-efficient CPU/GPU implementation must still demonstrate a complete-pass speedup after extra scans, synchronization, storage and readback.

Output contract: Exact PCM/encoded output where claimed; otherwise declared numeric tolerance against a stronger independent reference, including delay, tails and state.

Primary metric: Complete specified audio operation, output sample count/phase and practical CPU/memory or repeated-query cost.

Adverse control: Extrema, invalid precision, changed predictor/phase/history or a nonlinear stage must invalidate assumptions. No covert resampling/downmix/quality change.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R190.restricted-ima-adpcm-through-two-clipped-scans.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R190.restricted-ima-adpcm-through-two-clipped-scans.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R183-R192-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R183-R192-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_g/audits/R190.restricted-ima-adpcm-through-two-clipped-scans.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_g/audits/R190.restricted-ima-adpcm-through-two-clipped-scans.md)
