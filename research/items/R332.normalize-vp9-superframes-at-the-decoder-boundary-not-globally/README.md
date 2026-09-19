<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Normalize VP9 superframes at the decoder boundary, not globally

Full identity: `R332.normalize-vp9-superframes-at-the-decoder-boundary-not-globally`. Reused R-numbers are separate mechanisms.

Current imported decision: **CLOSED_CURRENT_PROFILE** (top100).

Reconciled completed prior evidence: Actual maintained worker already decodes the aggregate construction exactly, including hidden altrefs; splitting adds six submissions with no repaired output. Preserve aggregate path on this qualified synthetic decoder profile. No full-player or universal performance claim.

Next action: Trace actual input representation, requested tracks/features, current accepted plan and the decoder boundary. Check whether this adapter or destination is already used.

## Definition and contract

Proposal key: 705f6f20c6e66b736ec8ce6ccb8a57171d5c7c212e815ff0109356e70580b0a7 Mechanism: Preserve the elementary VP9 frame bytes and decode order while adapting aggregate packet boundaries to a specifically qualified destination. Preserve invisible reference frames and independently map displayed-picture timestamps. Initial scope: Unencrypted VP9 profile 0, stable configuration, one spatial layer, valid superframe indexes, a genuine cold-start keyframe, and a fixture containing invisible alternate-reference pictures. Acceptance contract: Coded component-frame identity, displayed-picture identity and ordering, visible timestamps/durations, continuing reference behavior, correct seeks, and EOF. No invented display duration for an invisible picture.

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
| decision | passed | Historical decision imported verbatim: CLOSED_CURRENT_PROFILE. No integration or qualification inferred. |

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R332.normalize-vp9-superframes-at-the-decoder-boundary-not-globally.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R332.normalize-vp9-superframes-at-the-decoder-boundary-not-globally.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/prerequisites/result.json](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/prerequisites/result.json)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R332_R337_Proposals.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R332_R337_Proposals.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/root/audits/R332.normalize-vp9-superframes-at-the-decoder-boundary-not-globally.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/root/audits/R332.normalize-vp9-superframes-at-the-decoder-boundary-not-globally.md)
- [results/full-completion/r332/result.json](../../../results/full-completion/r332/result.json)
