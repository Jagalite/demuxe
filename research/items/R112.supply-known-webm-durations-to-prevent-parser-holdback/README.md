<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Supply known WebM durations to prevent parser holdback

Full identity: `R112.supply-known-webm-durations-to-prevent-parser-holdback`. Reused R-numbers are separate mechanisms.

Current imported decision: **ALREADY_IMPLEMENTED** (full-completion).

Maintained VP9/Opus output already contains video DefaultDuration. Its first block is audio and gives no early frame with or without video duration metadata; do not infer an A/V timing benefit from video-only VP8. Retain truthful duration signaling; no missing metadata fix is needed in this output profile.

Next action: Locate one real repeated read/index/validation boundary and its trusted source identity. Separate logical requests from transferred or physical-disk bytes.

## Definition and contract

Type: Chrome-specific mux/timing experiment. Priority: P1. Question. Can truthful duration metadata release an already received sample sooner? What differs from earlier work. R54 varied when a muxer emitted clusters, principally for Opus. This holds delivery and cluster boundaries fixed and changes whether the receiver must wait to learn a frame duration. Mechanism. Provide a valid BlockDuration or applicable track DefaultDuration when the source actually knows it, instead of making the receiver derive timing from a subsequent packet or cluster end. Initial source profile. Video or another codec whose duration is not already extracted by the parser; known duration at emission time. Use Opus as an expected no-benefit control where its duration is already known.

Output contract: Source/version identity, requested exact sample/frame, dependency coverage and byte-range accounting.

Primary metric: Total bytes and time to correct startup/target, including cold index/identity acquisition; bounded retained bytes.

Adverse control: Change the source/version or corrupt an offset/proof and cancel one consumer. No stale or unverified bytes may be published.

## Stages

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | pending | Historical evidence retained; stage-specific acceptance has not been reconciled into this checklist. |
| screen | passed | Historical bounded screening disposition recorded. This is completion of screening, not candidate correctness. |
| correctness | pending | Historical evidence retained; stage-specific acceptance has not been reconciled into this checklist. |
| performance | pending | Historical evidence retained; stage-specific acceptance has not been reconciled into this checklist. |
| results | passed | Existing results indexed with current byte identities; historical mismatches are separately retained in the migration record. |
| decision | passed | Historical decision imported verbatim: ALREADY_IMPLEMENTED. No integration or qualification inferred. |

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R112.supply-known-webm-durations-to-prevent-parser-holdback.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R112.supply-known-webm-durations-to-prevent-parser-holdback.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/R102-R115-research-backlog.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/R102-R115-research-backlog.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R102-R115-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R102-R115-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_d/audits/R112.supply-known-webm-durations-to-prevent-parser-holdback.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_d/audits/R112.supply-known-webm-durations-to-prevent-parser-holdback.md)
- [results/full-completion/webm-boundaries/metadata.json](../../../results/full-completion/webm-boundaries/metadata.json)
- [results/full-completion/webm-boundaries/result.json](../../../results/full-completion/webm-boundaries/result.json)
