<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Parallelize phase-vocoder accumulation without resetting phase at job boundaries

Full identity: `R351.parallelize-phase-vocoder-accumulation-without-resetting-phase-at-job-boundaries`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

Playback rate delegates to mpv speed; no selected simple phase-vocoder algorithm or exposed phase/OLA state exists. Replacing a production stretcher with a teaching algorithm changes semantics.

Next action: Specify one fixed FFT/hop/stretch/padding recipe before irregular-chunk prefix oracle; test pi-wrap ties, tiny magnitudes and impulse at chunk boundary, charging complete transforms/OLA.

## Definition and contract

Investigate a parallel implementation of one precisely specified phase-vocoder algorithm. Librosa's pinned reference computes increments from adjacent input spectra and then accumulates output phase. It also explicitly warns that its simple reference does not handle transients. [S9] For output analysis step m and frequency bin k, determine increment d[m,k] from the same input columns, expected phase advance, and wrap/tie rules as the chosen reference. Then: The exclusive prefix sum gives each job the correct phase rather than restarting that job at an arbitrary local phase. Magnitude interpolation remains input-local. Subsequent inverse transforms and overlap-add need their own correct boundary handling.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R351.parallelize-phase-vocoder-accumulation-without-resetting-phase-at-job-boundaries.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R351.parallelize-phase-vocoder-accumulation-without-resetting-phase-at-job-boundaries.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R348_R352_Proposals.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R348_R352_Proposals.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_g/audits/R351.parallelize-phase-vocoder-accumulation-without-resetting-phase-at-job-boundaries.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_g/audits/R351.parallelize-phase-vocoder-accumulation-without-resetting-phase-at-job-boundaries.md)
