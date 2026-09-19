<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Fetch WavPack correction data only when exact output is required

Full identity: `R209.fetch-wavpack-correction-data-only-when-exact-output-is-required`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

Current single-source packet decoder does not own a separate WavPack correction stream or exact/lossy mode transition. Dual-source authorization and block-aligned correction mapping are prerequisites.

Next action: Define bounded source-paired correction map and one block-boundary mode switch; verify suffix PCM exactness and reject absent/stale correction without claiming lossless output.

## Definition and contract

Using installed libwavpack 5.8.1, an 8-second stereo source was encoded in hybrid mode into a 282,458-byte lossy .wv base and 123,890-byte .wvc correction file. Base-only output is close but intentionally not exact (S16 RMSE 0.983). Base + correction is sample-exact. At the 192,000-frame / 4-second block boundary, the earlier correction blocks were removed entirely. A file containing only the correction blocks at and after that boundary still decoded the suffix sample-for-sample exactly, deferring 61,782 correction bytes. Exact mode therefore has a real block-boundary admission rule; it must never silently claim lossless output when correction data is absent.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R209.fetch-wavpack-correction-data-only-when-exact-output-is-required.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R209.fetch-wavpack-correction-data-only-when-exact-output-is-required.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R203-R213-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R203-R213-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_g/audits/R209.fetch-wavpack-correction-data-only-when-exact-output-is-required.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_g/audits/R209.fetch-wavpack-correction-data-only-when-exact-output-is-required.md)
