<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# no-index fragmented MP4 native remote seek

Full identity: `R141.no-index-fragmented-mp4-native-remote-seek.report-continuity`. Reused R-numbers are separate mechanisms.

Current imported decision: **STOP_PROFILE** (full-completion).

Removing only the random-access trailer after sidx removal adds no requests or bytes in this tested native seek: both fetch 6656858 bytes and the same target picture. Do not build a trailer-specific optimization from this profile; reopen a longer/costlier trace.

Next action: Locate one real repeated read/index/validation boundary and its trusted source identity. Separate logical requests from transferred or physical-disk bytes.

## Definition and contract

A 6-second fragmented MP4 was authored without the usual mfra trailer/random-access index. Under the same 64 KiB capped Range harness, Chrome learned the 6-second duration, accepted a seek to 4.2 s, and played to ~4.65 s with readyState=4 and no error. But requests were sequential from bytes=0- through bytes=524288-; capped responses therefore served the full 579,542-byte file. Verdict. Correct seeking is not the same as efficient seeking. For remote bytes, this is a negative result and strengthens the case for Demuxe's own source-bound fragment/index map rather than relying on parser scanning.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R141.no-index-fragmented-mp4-native-remote-seek.report-continuity.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R141.no-index-fragmented-mp4-native-remote-seek.report-continuity.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R132-R145-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R132-R145-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_e/audits/R141.no-index-fragmented-mp4-native-remote-seek.report-continuity.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_e/audits/R141.no-index-fragmented-mp4-native-remote-seek.report-continuity.md)
- [results/full-completion/remote-index/identity.json](../../../results/full-completion/remote-index/identity.json)
- [results/full-completion/remote-index/result.json](../../../results/full-completion/remote-index/result.json)
