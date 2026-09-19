<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Seek through hierarchical MP4 indexes without loading the whole index

Full identity: `R349.seek-through-hierarchical-mp4-indexes-without-loading-the-whole-index`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

The cheap MP4 probe is metadata admission, not a hierarchy-aware sample/seek reader; current source transport serves demanded ranges and FFmpeg owns demux indexes. A root/child/leaf SIDX traversal contract and immutable manifest discovery are not exposed. Parsing a supplied hierarchy would be new setup, not a smaller existing array.

Next action: Use one already-authored two-level SIDX with an authoritative root location; compare selected leaf ranges against an independent full parse and reject stale, overlapping or out-of-source references before any network latency comparison.

## Definition and contract

Investigate a lazy seek reader for an already indexed fragmented-MP4 source: root sidx -> relevant child index -> leaf media range -> qualified playback. GPAC explicitly supports hierarchical SIDX construction and distinguishes it from daisy-chain indexing. The sidx representation contains reference types, sizes, times, durations, and random-access information. [S3, S4] This is index-on-demand, not smaller per-sample arrays and not rebuilding a writer's state. The initial root range and source length/version are supplied by a validated manifest or another bounded discovery mechanism; discovering an arbitrarily located root is not assumed free. Finite, immutable, unencrypted fMP4; bounded two-level hierarchy; stable H.264/AAC configuration; leaf fragments beginning at independently verified suitable access points; simple presentation mapping. Audio/video sample data remains unchanged.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R349.seek-through-hierarchical-mp4-indexes-without-loading-the-whole-index.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R349.seek-through-hierarchical-mp4-indexes-without-loading-the-whole-index.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R348_R352_Proposals.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R348_R352_Proposals.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/root2/audits/R349.seek-through-hierarchical-mp4-indexes-without-loading-the-whole-index.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/root2/audits/R349.seek-through-hierarchical-mp4-indexes-without-loading-the-whole-index.md)
