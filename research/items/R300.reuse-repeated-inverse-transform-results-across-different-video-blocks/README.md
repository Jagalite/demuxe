<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Reuse repeated inverse-transform results across different video blocks

Full identity: `R300.reuse-repeated-inverse-transform-results-across-different-video-blocks`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

A concrete transform-plus-prediction/clipping boundary exists, with DC fast paths already present. Historical dct_coeff emitted no real trace; model cache success cannot establish nontrivial reuse. Source is available now but an instrumented coefficient trace is still new setup.

Next action: Instrument bounded counts/hashes of real nonzero non-DC 4x4 blocks before implementing cache; compare graphics and natural-video traces.

## Definition and contract

Type: Exact software-decoder computation cache. First owner: Instrumented decoder, then bounded kernel prototype. Related: R151, R235, R292; caches transform calculations rather than entire frames, reference interpolation, or codebook programs. Hypothesis. Nontrivial coefficient blocks may recur across different pictures. Cache the exact signed reconstruction residual produced by the inverse transform, then combine it with each block's own prediction normally. Source basis. FFmpeg's H.264 inverse-transform implementation performs fixed integer arithmetic and then adds the resulting values to destination prediction samples with clipping. This provides a precise stage at which the reusable result must be separated from picture-specific input. [S9]

Output contract: Exact integer planes or an explicitly defined numerical/altered-output contract; compare the final requested region and later references where relevant.

Primary metric: Complete decode/process/present cost, transfers, command work or peak live storage for identical requested output.

Adverse control: Change stride, crop, phase, alpha, edge neighborhood or resource generation; exercise a case where the proposed shortcut is ineligible.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R300.reuse-repeated-inverse-transform-results-across-different-video-blocks.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R300.reuse-repeated-inverse-transform-results-across-different-video-blocks.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R295_R300_Proposals.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R295_R300_Proposals.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_i/audits/R300.reuse-repeated-inverse-transform-results-across-different-video-blocks.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_i/audits/R300.reuse-repeated-inverse-transform-results-across-different-video-blocks.md)
