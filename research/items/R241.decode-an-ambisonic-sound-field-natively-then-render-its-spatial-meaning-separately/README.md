<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Decode an Ambisonic sound field natively, then render its spatial meaning separately

Full identity: `R241.decode-an-ambisonic-sound-field-natively-then-render-its-spatial-meaning-separately`. Reused R-numbers are separate mechanisms.

Current imported decision: **PURSUE** (top100).

Genuine mapping-family-2 four-channel Opus decoded with correct channel tones and near-exact host PCM. Explicit ACN/SN3D W,Y,Z,X directional matrix matches scalar oracle; wrong ordering fails. No physical spatial qualification.

Next action: Trace actual input representation, requested tracks/features, current accepted plan and the decoder boundary. Check whether this adapter or destination is already used.

## Definition and contract

Decode a restricted Opus Ambisonic component set through qualified browser decoders and apply the specified ordering, normalization and spatial renderer. Distinguish decoded components, rendered stereo and actual spatial hardware.

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
| decision | passed | Historical decision imported verbatim: PURSUE. No integration or qualification inferred. |

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R241.decode-an-ambisonic-sound-field-natively-then-render-its-spatial-meaning-separately.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R241.decode-an-ambisonic-sound-field-natively-then-render-its-spatial-meaning-separately.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/conversation/PROPOSAL_SCOPE_EXTRACTS.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/conversation/PROPOSAL_SCOPE_EXTRACTS.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_a/audits/R241.decode-an-ambisonic-sound-field-natively-then-render-its-spatial-meaning-separately.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_a/audits/R241.decode-an-ambisonic-sound-field-natively-then-render-its-spatial-meaning-separately.md)
- [results/top100/audio/native-result.json](../../../results/top100/audio/native-result.json)
- [results/top100/audio/seams-result.json](../../../results/top100/audio/seams-result.json)
