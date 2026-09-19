<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Extract the exact rounded mono mix already stored inside mid-side FLAC

Full identity: `R224.extract-the-exact-rounded-mono-mix-already-stored-inside-mid-side-flac`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

The maintained FLAC path preserves selected integer samples and layouts through decode/encode; it does not expose mid subframes or a rounded-mono request. Mid extraction needs a bit parser and a precisely defined floor/rounding contract, especially for negative odd sums and coding-mode transitions.

Next action: Parse one all-mid-side FLAC fixture, extract only mid residuals into valid mono frames, and compare against the explicitly rounded integer average; reject a switched left/side frame.

## Definition and contract

Extract mid subframes from an all-mid-side FLAC stream as an explicitly requested rounded integer mono average. Preserve residuals and regenerate truthful framing/integrity; test negative odd sums and coding-mode changes.

Output contract: Configuration and ordered codec payloads where copy is intended; requested frames/audio/timeline/features at the declared output boundary.

Primary metric: Correct additional admitted source/destination capability; otherwise full startup and CPU/resource cost.

Adverse control: Alter one admission-critical configuration, remove a required dependency, or preserve video while making selected audio unsupported. Candidate must reject or use a declared fallback.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R224.extract-the-exact-rounded-mono-mix-already-stored-inside-mid-side-flac.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R224.extract-the-exact-rounded-mono-mix-already-stored-inside-mid-side-flac.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/conversation/PROPOSAL_SCOPE_EXTRACTS.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/conversation/PROPOSAL_SCOPE_EXTRACTS.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_h/audits/R224.extract-the-exact-rounded-mono-mix-already-stored-inside-mid-side-flac.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_h/audits/R224.extract-the-exact-rounded-mono-mix-already-stored-inside-mid-side-flac.md)
