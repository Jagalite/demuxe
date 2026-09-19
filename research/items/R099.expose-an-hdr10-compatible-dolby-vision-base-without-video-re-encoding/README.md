<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Expose an HDR10-compatible Dolby Vision base without video re-encoding

Full identity: `R099.expose-an-hdr10-compatible-dolby-vision-base-without-video-re-encoding`. Reused R-numbers are separate mechanisms.

Current imported decision: **HOLD_FIXTURE_SOURCE** (top100).

No trusted Dolby Vision profile8.1 source and independent HDR10-compatible reference found among48 unique local supplied/campaign media fixtures. Ordinary HEVC fixtures cannot establish Dolby base extraction fidelity. This is a media-source gap, not missing report identity or experimental rejection.

Next action: Trace actual input representation, requested tracks/features, current accepted plan and the decoder boundary. Check whether this adapter or destination is already used.

## Definition and contract

Question. Can a browser play a supported compatible base when full Dolby Vision signaling blocks or complicates the route? What differs from earlier work. Video counterpart to compatible-core exploration, not software tone mapping or full Dolby Vision preservation. Input scope. Verified clear Dolby Vision profile 8.1 first; retained base must actually be HDR10-compatible. Mechanism to test. Preserve the coded base picture data, selectively remove Dolby-specific signaling when appropriate, and author a truthful HDR10 destination description and required metadata. Smallest experiment. 1. Verify a profile 8.1 fixture and establish a trusted HDR10-base reference. 2. Apply a version-checked metadata/bitstream transformation and preserve base picture hashes. 3. Test native Chrome HEVC/HDR behavior on a capable display; reject profile 5 as a compatibility negative control.

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
| decision | passed | Historical decision imported verbatim: HOLD_FIXTURE_SOURCE. No integration or qualification inferred. |

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R099.expose-an-hdr10-compatible-dolby-vision-base-without-video-re-encoding.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R099.expose-an-hdr10-compatible-dolby-vision-base-without-video-re-encoding.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/prerequisites/result.json](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/prerequisites/result.json)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/R88-R101-research-backlog.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/R88-R101-research-backlog.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_a/audits/R099.expose-an-hdr10-compatible-dolby-vision-base-without-video-re-encoding.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_a/audits/R099.expose-an-hdr10-compatible-dolby-vision-base-without-video-re-encoding.md)
- [results/top100/prerequisites/media-inventory.json](../../../results/top100/prerequisites/media-inventory.json)
