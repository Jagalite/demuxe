<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# cue-less WebM native seek

Full identity: `R140.cue-less-webm-native-seek.report-continuity`. Reused R-numbers are separate mechanisms.

Current imported decision: **STOP_CURRENT_VALUE** (top100).

Native cue-less seek to25s produces same exact displayed frame as indexed30s control, but transfers393216 of395474 source bytes from cold metadata acquisition. Indexed control also reads essentially whole396119-byte fixture. No scan-free remote seek benefit demonstrated; larger/source-indexed profile needed to reopen.

Next action: Locate one real repeated read/index/validation boundary and its trusted source identity. Separate logical requests from transferred or physical-disk bytes.

## Definition and contract

The fixture is WebM produced in live mode with no Cues and no finite duration advertised initially. A synthetic HTTPS media response honored browser Range headers but capped each response at 64 KiB. This exercises the media loader's byte-range behavior without making claims about TLS, real-network latency, caches, or proxies. Chrome initially reported duration=Infinity. Setting currentTime=6 generated seeking/seeked; after playback, the first video frame callback was exactly 6.000 s and frames continued normally. The cost is the important result: Chrome issued sequential Range requests from byte 0 through the end. The run served 1,334,098 B of a 1,334,098 B file (100.0%). Once the scan reached the end, duration became ~7.967 s.

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
| decision | passed | Historical decision imported verbatim: STOP_CURRENT_VALUE. No integration or qualification inferred. |

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R140.cue-less-webm-native-seek.report-continuity.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R140.cue-less-webm-native-seek.report-continuity.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R132-R145-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R132-R145-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_c/audits/R140.cue-less-webm-native-seek.report-continuity.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_c/audits/R140.cue-less-webm-native-seek.report-continuity.md)
- [results/top100/cueless/fixture.json](../../../results/top100/cueless/fixture.json)
- [results/top100/cueless/result.json](../../../results/top100/cueless/result.json)
