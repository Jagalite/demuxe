<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Change FLAC predictor order directly in the residual domain

Full identity: `R299.change-flac-predictor-order-directly-in-the-residual-domain`. Reused R-numbers are separate mechanisms.

Current imported decision: **STOP_PROFILE** (full-completion).

Historical order-1 to order-2 transform is exact but increases fixture bytes 1.7% and provides no complete preparation/decode gain. Current adaptation uses the optimized FLAC encoder; replacing it with residual conversion lacks a demonstrated value on this profile.

Next action: Reopen for sources with a measured useful predictor tradeoff; compare leave-unchanged and restricted optimized decode/reencode including all entropy/CRC work.

## Definition and contract

Type: Exact compressed-to-compressed audio preparation. First owner: Bitstream construction and independent PCM oracles. Related: R234; that card preserves residuals while simplifying equivalent syntax, whereas this card changes the predictor and residual representation. Hypothesis. Convert between eligible fixed-predictor orders by transforming decoded residual integers instead of reconstructing a complete PCM block and running a general-purpose encoder. Source basis. FLAC fixed predictors are specified for orders zero through four and carry order-dependent warm-up samples. LibFLAC already implements the corresponding finite-difference expressions. The mathematics is established; the proposed additional mechanism is its use in a compressed-input adapter. [S7, S8]

Output contract: Independent known truth plus a specific expected observation, not self-reported counters from the candidate.

Primary metric: Decision power, reproducibility or diagnostic cost without changing the measured player outcome.

Adverse control: A different failure, stale source/hash or malformed record must not count as the intended finding.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R299.change-flac-predictor-order-directly-in-the-residual-domain.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R299.change-flac-predictor-order-directly-in-the-residual-domain.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R295_R300_Proposals.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R295_R300_Proposals.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_i/audits/R299.change-flac-predictor-order-directly-in-the-residual-domain.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_i/audits/R299.change-flac-predictor-order-directly-in-the-residual-domain.md)
