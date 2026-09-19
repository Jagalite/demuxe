<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Decode only the alpha plane of a transparent image when color is already cached

Full identity: `R325.decode-only-the-alpha-plane-of-a-transparent-image-when-color-is-already-cached`. Reused R-numbers are separate mechanisms.

Current imported decision: **STOP_PROFILE** (full-completion).

The player presents video plus subtitle overlay, not repeated WebP color+alpha asset variants. The report exact independent ALPH reuse is meaningful for a separate image cache but no current repeated color decode owner was identified here.

Next action: Reopen for an actual WebP mask/composition consumer and compare uncompressed ALPH variants against raw decoder RGBA, not premultiplied canvas RGB.

## Definition and contract

For a format/profile with independently stored transparency, preserve cached color and decode only changed alpha for a requested mask/composition view. Verify exact RGBA and reject entropy-coupled formats.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R325.decode-only-the-alpha-plane-of-a-transparent-image-when-color-is-already-cached.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R325.decode-only-the-alpha-plane-of-a-transparent-image-when-color-is-already-cached.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/conversation/PROPOSAL_SCOPE_EXTRACTS.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/conversation/PROPOSAL_SCOPE_EXTRACTS.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_f/audits/R325.decode-only-the-alpha-plane-of-a-transparent-image-when-color-is-already-cached.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_f/audits/R325.decode-only-the-alpha-plane-of-a-transparent-image-when-color-is-already-cached.md)
