<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# sparse correction for cached linear audio filtering

Full identity: `R265.sparse-correction-for-cached-linear-audio-filtering`. Reused R-numbers are separate mechanisms.

Current imported decision: **STOP_PROFILE** (full-completion).

The reported mechanism accelerates sparse edits to cached LTI FIR output. Current audited playback adaptation streams frames through FIFO, not an editable audio document with cached filter output. Streaming decode cannot claim the sparse-edit saving.

Next action: Reopen for an explicit offline editing consumer with immutable filter coefficients and retained source/output cache; compare one edit plus full filter tail against full recomputation.

## Definition and contract

A 1,200,000-sample integer signal was filtered with a 129-tap FIR. A 6,000-sample edit produced Δx; only hΔx was recomputed and added to the cached output. Result. The patched output is exactly equal to a full recomputation. The correction support is 6,128 samples, including the FIR tail; omitting that tail fails the oracle. Median patch time was 1.061 ms versus 90.474 ms full, or 85.3× in this sparse-edit corpus. Boundary. This identity is for linear time-invariant filtering. Nonlinear/stateful effects, adaptive filters, compressors, limiters, reverbs with external state, format changes, and resampling need separate dependency/state analysis.

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
| decision | passed | Historical decision imported verbatim: STOP_PROFILE. No integration or qualification inferred. |

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R265.sparse-correction-for-cached-linear-audio-filtering.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R265.sparse-correction-for-cached-linear-audio-filtering.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R261-R267-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R261-R267-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_c/audits/R265.sparse-correction-for-cached-linear-audio-filtering.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_c/audits/R265.sparse-correction-for-cached-linear-audio-filtering.md)
