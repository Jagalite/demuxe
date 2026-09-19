<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Skip redundant packed-PCM staging

Full identity: `R074.skip-redundant-packed-pcm-staging`. Reused R-numbers are separate mechanisms.

Current imported decision: **STOP_PROFILE** (top100).

Reconciled completed prior evidence: Reported exact packed-lossless Wasm prototype; seven complete-operation pairs were -0.80% saving (95% interval -2.97% to +1.23%) against a predeclared 5% gate. Observer-free deployment not established. Actual local raw records and prior manifest identity were inspected in this v4 import.

Next action: Read the supplied local follow-up and verify the named raw record once if accessible. Carry forward its scoped disposition; do not rerun this profile just to populate this ledger. Reopen for a different demonstrated workload, memory outcome or materially changed implementation; do not repeat the same seven-pair CPU screen.

## Definition and contract

Question. Can admitted packed lossless integer audio be written directly into the existing FIFO, avoiding a temporary allocation and per-sample copy? The reviewed adaptation_frames allocates a converted AVFrame and copies sample/channel data before FIFO writing, including when data is already packed. S24 stored in S32 also requires validation that the low eight bits are zero. Planar interleaving and explicit Opus float conversion remain necessary in their respective paths. [D2] The native C prototype uses the real system libavutil FIFO API, but substitutes a malloc staging buffer for production AVFrame allocation. The packed candidate skips staging; S24 validates the entire input before publishing samples. Planar cases call the same baseline function as controls. FIFO write/read is retained, so this is not a zero-copy ownership claim. [F3]

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R074.skip-redundant-packed-pcm-staging.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R074.skip-redundant-packed-pcm-staging.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/imports/identity-check.json](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/imports/identity-check.json)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/imports/runs__caption-boundary-integrated__result.json](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/imports/runs__caption-boundary-integrated__result.json)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/imports/runs__follow-up__opportunity-summary.json](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/imports/runs__follow-up__opportunity-summary.json)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/imports/runs__module-authority-02__result.json](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/imports/runs__module-authority-02__result.json)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/imports/runs__module-maintained-pairs-01__summary.json](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/imports/runs__module-maintained-pairs-01__summary.json)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/imports/runs__module-separated-01__result.json](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/imports/runs__module-separated-01__result.json)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/imports/runs__r74-packed-cost-01__result.json](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/imports/runs__r74-packed-cost-01__result.json)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/imports/runs__r74-packed-cost-01__summary.json](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/imports/runs__r74-packed-cost-01__summary.json)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R70-R75-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R70-R75-report.md)
- [results/local-screening/README.md](../../../results/local-screening/README.md)
- [results/local-screening/follow-up.md](../../../results/local-screening/follow-up.md)
- [results/local-screening/full-queue-audit.md](../../../results/local-screening/full-queue-audit.md)
