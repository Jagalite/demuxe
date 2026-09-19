<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# exact waveform summaries from first-order FLAC

Full identity: `R217.exact-waveform-summaries-from-first-order-flac`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

FLAC decoder currently reconstructs fixed-order PCM and adaptation consumes AVFrames. Source-order-1 residual bin summaries could avoid that only for a new waveform-summary consumer; no such request/bridge exists in current playback. It does not eliminate entropy decoding.

Next action: Specify one waveform-bin output over an order-1 mono source and compare residual traversal with decoded-PCM summaries including a bin crossing frame boundary.

## Definition and contract

The 2-second mono fixture was actually encoded as fixed predictor order 1. FLAC's analysis output supplied the real warm-up and Rice residual values for 21 frames / 96,000 samples. The candidate traversed residuals directly and accumulated waveform summaries into 777-sample bins without materializing PCM blocks. All 124 bins matched decoded PCM exactly for count, minimum, maximum, sum and integer energy, including bins spanning FLAC frame boundaries. The relative-prefix summary identity also passed every tested composition, and the energy formula matched decoded PCM for every frame. Reference PCM occupied 192,000 bytes; the final 124-bin summary is about 4,960 bytes in the tested representation.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R217.exact-waveform-summaries-from-first-order-flac.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R217.exact-waveform-summaries-from-first-order-flac.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R214-R222-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R214-R222-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_i/audits/R217.exact-waveform-summaries-from-first-order-flac.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_i/audits/R217.exact-waveform-summaries-from-first-order-flac.md)
