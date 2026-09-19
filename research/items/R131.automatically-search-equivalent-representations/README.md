<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Automatically search equivalent representations

Full identity: `R131.automatically-search-equivalent-representations`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

Maintained pipeline has guarded fixed transforms, not a vetted recipe-search engine with relation oracles and budgets. Automated equivalent representation search is a separate offline system, not automatic route admission.

Next action: Define a two-recipe offline search only with explicit preconditions and payload/timing/seek oracle; intentionally non-equivalent recipe must be rejected and no result enters automatic routing.

## Definition and contract

Offline bounded search over vetted representation transformations with declared preconditions and preserved semantics. Validate frame, audio, timeline, seek and metadata relations; recipes remain outside automatic production routing until admitted.

Output contract: Correct source/time/target and agreed fidelity. Approximate results cannot populate exact caches or qualify normal playback.

Primary metric: Time to the requested exact or explicitly approximate preview, total prerequisite work and retained state.

Adverse control: Move backward, request a non-RAP dependency, change source or cancel a pending request; stale previews must never become current.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R131.automatically-search-equivalent-representations.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R131.automatically-search-equivalent-representations.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/conversation/PROPOSAL_SCOPE_EXTRACTS.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/conversation/PROPOSAL_SCOPE_EXTRACTS.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_d/audits/R131.automatically-search-equivalent-representations.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_d/audits/R131.automatically-search-equivalent-representations.md)
