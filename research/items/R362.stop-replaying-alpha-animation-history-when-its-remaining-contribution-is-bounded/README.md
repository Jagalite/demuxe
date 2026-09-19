<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Stop replaying alpha-animation history when its remaining contribution is bounded

Full identity: `R362.stop-replaying-alpha-animation-history-when-its-remaining-contribution-is-bounded`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

No APNG retained composition/index owner or opt-in approximation contract exists. Current output promises full frame; bounded transmittance cannot silently justify approximate playback, and historical microbenchmark excludes decode/index work.

Next action: Define explicit preview tolerance/surface and bounded APNG history planner; test every pixel bound, uncovered pixel, transparent colored sample and underflow, restoring exact state before exact continuation.

## Definition and contract

For a normalized premultiplied channel, OVER has the form C_out = c + (1-alpha) C_in. This follows the standard source-over formula. [S9] C_target(p) = A(p) + T(p) U(p)     T(p) = product_j(1 - alpha_j(p)) A is the suffix's accumulated contribution and U is the unprocessed older canvas. Uncovered pixels in a rectangular frame use alpha zero for this expression. When normalized premultiplied U and its alpha lie in [0,1], replacing the unknown older canvas with transparent black changes each premultiplied component and alpha by at most T in exact arithmetic. For a normalized opaque background, the final composite error is also bounded by T; that separate bound uses U_color <= U_alpha, not arbitrary unrelated color/alpha ranges.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R362.stop-replaying-alpha-animation-history-when-its-remaining-contribution-is-bounded.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R362.stop-replaying-alpha-animation-history-when-its-remaining-contribution-is-bounded.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R358_R362_Proposals.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R358_R362_Proposals.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R358-R362-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R358-R362-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_g/audits/R362.stop-replaying-alpha-animation-history-when-its-remaining-contribution-is-bounded.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_g/audits/R362.stop-replaying-alpha-animation-history-when-its-remaining-contribution-is-bounded.md)
