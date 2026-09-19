<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Turn Paeth prediction into composable byte-state maps

Full identity: `R346.turn-paeth-prediction-into-composable-byte-state-maps`. Reused R-numbers are separate mechanisms.

Current imported decision: **STOP_PROFILE** (full-completion).

The existing Paeth owner computes one predictor per byte. Historical dense 256-state maps are exact but 252.4x slower and require 4096 logical map bytes for a 1024-byte row. No reason to replace current CPU reconstruction with this candidate.

Next action: Reopen only with a compact exact map or real parallel schedule whose complete work beats serial/SIMD; retain exhaustive short-chunk state checks.

## Definition and contract

Libpng provides the reference Paeth tie-breaking and byte reconstruction implementation. Preserve its exact predictor arithmetic and modulo-256 output, not a saturated or approximate variant. [S7] For fixed above byte b_i, above-left byte c_i, and filtered byte r_i: A chunk transition T is the composition of its f_i functions and can be represented by 256 output values, one for each possible input state. For consecutive chunks A and B: Function composition is associative, including when the maps contain wraparound and discontinuities. The dense mapping is exact; it does not depend on monotonicity or floating-point approximations. Use predictor ties, byte wraparound, extreme above-row values, awkward chunk lengths, and an incorrect previous row as controls. Then compare complete PNG output. An exact compact representation of maps can be investigated only after the dense reference is established; never merge nearly equal mappings.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R346.turn-paeth-prediction-into-composable-byte-state-maps.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R346.turn-paeth-prediction-into-composable-byte-state-maps.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R343_R347_Proposals.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R343_R347_Proposals.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_i/audits/R346.turn-paeth-prediction-into-composable-byte-state-maps.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_i/audits/R346.turn-paeth-prediction-into-composable-byte-state-maps.md)
