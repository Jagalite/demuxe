<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# AV1 pre-super-resolution preview

Full identity: `R269.av1-pre-super-resolution-preview`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

Current bridge receives public reconstructed VideoFrames and AVFrames, not pre-super-resolution AV1 pixels. The report explicitly could not access those pixels; adding a custom decoder tap is substantial setup, whereas lower-resolution re-encode is a different mechanism.

Next action: Locate a pinned decoder-internal pre-super-resolution surface and its ownership/lifetime contract before any preview comparison.

## Definition and contract

A controlled libaom encode used fixed super-resolution denominator 12. The decoder reports frame/coded geometry 427×360 and display geometry 640×360, confirming that a lower-resolution reconstruction exists internally before display upscaling. However, the public decoder output image is already 640×360. The exact experiment requires the pre-super-resolution pixels so that they can be compared with full decode plus downscale. The public libaom surface available here does not expose those pixels. Therefore the card is BLOCKED at the required API boundary, rather than replaced with a misleading lower-resolution re-encode proxy.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R269.av1-pre-super-resolution-preview.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R269.av1-pre-super-resolution-preview.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R268-R275-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R268-R275-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_f/audits/R269.av1-pre-super-resolution-preview.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_f/audits/R269.av1-pre-super-resolution-preview.md)
