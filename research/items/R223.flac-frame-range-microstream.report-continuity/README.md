<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# FLAC frame-range microstream

Full identity: `R223.flac-frame-range-microstream.report-continuity`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

Current playback copies/muxes FLAC packets but does not create standalone range microfiles. The cited suffix kept stale STREAMINFO totals, so its exact PCM is not a truthful standalone metadata contract.

Next action: Extract complete frames from one FLAC suffix, fix total samples/checksum policy and compare exact suffix samples plus reported duration.

## Definition and contract

The 8-second stereo FLAC contains 84 demuxed FLAC frames. The selected restart begins at frame 42 / sample 193536. The microstream was built by keeping the original 8286 metadata/header bytes and appending only complete coded frames from that point onward. It decodes to exactly the same 1,523,712 PCM bytes as the corresponding original suffix (SHA-256 0515cc1f8b3d5f2e12ee7b8a65f3ec94414dfa7f32ec51885ef72bcde1d20ff5). Source size is 236,881 bytes; microstream is 121,751 bytes (51.4%). This is a strong byte-range/restart primitive for whole FLAC-frame boundaries. Production use still needs truthful duration/STREAMINFO handling instead of relying on stale original totals in a synthetic microfile.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R223.flac-frame-range-microstream.report-continuity.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R223.flac-frame-range-microstream.report-continuity.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R223-R231-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R223-R231-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_e/audits/R223.flac-frame-range-microstream.report-continuity.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_e/audits/R223.flac-frame-range-microstream.report-continuity.md)
