<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Silence certification: mathematical boundary only

Full identity: `R154.silence-certification-mathematical-boundary-only`. Reused R-numbers are separate mechanisms.

Current imported decision: **STOP_PROFILE** (full-completion).

The report itself disproves zero-current-coefficients implying silence when prior overlap is nonzero; no coded AAC coefficients or overlap state were certified. Current native adaptation does not admit AAC for this decode path and exposes no AAC synthesis-state certificate. Skipping synthesis from packet silence assumptions is unsupported in this profile.

Next action: Reopen only with an actual admitted AAC tool/state extractor and conservative certificate spanning previous overlap, transitions and coupling; require nonzero-overlap/zero-current coefficients to remain non-silent.

## Definition and contract

Implemented a long-sine-window IMDCT/overlap model. A conservative bound for the current output interval is (2/N) × sum(abs(coefficients)) + max(abs(previous_overlap)). Across 48 generated cases, all observed peaks lie below the bound: eight cases are certified exactly silent, eight have a small bound, and 32 remain unknown. A zero-current-coefficient/nonzero-overlap case produces nonzero samples, disproving the naïve zero-coefficients rule. Short windows, window transitions, PNS, SBR and unresolved coupling/prediction are deliberately outside the certificate profile. An actual AAC-LC tone/impulse/silence fixture was encoded and decoded as ancillary evidence, but its coded coefficients and overlap state were not extracted or certified.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R154.silence-certification-mathematical-boundary-only.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R154.silence-certification-mathematical-boundary-only.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R146-R158-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R146-R158-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/root3/audits/R154.silence-certification-mathematical-boundary-only.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/root3/audits/R154.silence-certification-mathematical-boundary-only.md)
