<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Expose an edited MP4 as a virtual byte-range URL

Full identity: `R109.expose-an-edited-mp4-as-a-virtual-byte-range-url`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

RangeReader is a consumer, not a virtual source server, and the existing MP4 probe does not author sample tables. The historical virtual resource reused reference-authored headers, leaving core mapping/authoring and authority work unresolved.

Next action: Specify one video-only closed-GOP A/B/A address map, compare random cross-boundary ranges with a materialized oracle, and reject changed source validators.

## Definition and contract

Type: New native-source construction. Priority: P1. Question. Can Chrome perform ordinary native range-based playback of a packet-copy edit that exists only as an address map? What differs from earlier work. R59 built a local metadata-only selected-track Blob and R90 found no need to flatten an already playable finite fMP4. This instead exposes a new finite edited file without materializing all of its logical bytes. Mechanism. Generate valid finite MP4 headers/sample tables and a virtual offset map. A permitted same-origin service worker or local server resolves requested output ranges to headers plus original source ranges. Initial source profile. Finite, indexed, authorized clear sources; video-only closed-GOP edits first, fixed codec configuration, no multi-entry edit-list trick. Audio joins require separate priming/timeline qualification.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R109.expose-an-edited-mp4-as-a-virtual-byte-range-url.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R109.expose-an-edited-mp4-as-a-virtual-byte-range-url.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/R102-R115-research-backlog.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/R102-R115-research-backlog.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_e/audits/R109.expose-an-edited-mp4-as-a-virtual-byte-range-url.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_e/audits/R109.expose-an-edited-mp4-as-a-virtual-byte-range-url.md)
