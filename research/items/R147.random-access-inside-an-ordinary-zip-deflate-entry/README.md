<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Random access inside an ordinary ZIP DEFLATE entry

Full identity: `R147.random-access-inside-an-ordinary-zip-deflate-entry`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

Source readers expose literal file/range bytes with no archive coordinate mapping. Historical zlib snapshots are opaque process-local state and require a full initial inflate/CRC pass; browser DecompressionStream presence supplies no snapshot API.

Next action: Specify one owned inflate-state index for a bounded ZIP entry and compare random output ranges byte-for-byte, with bare compressed-cursor restart rejected.

## Definition and contract

Generated one conventional ZIP-compressed fMP4 entry. The index preserves native zlib inflate-state snapshots at 32 KiB uncompressed intervals; it does not replace the file with independently compressed chunks. A snapshot includes more than a compressed byte position [S3]. The index construction verifies the complete entry CRC and necessarily processes the whole entry once. Afterwards, all 100 random range extractions match the original MP4 byte-for-byte. Mean replayed uncompressed bytes per requested range are 20,912.28, compared with 213,260.44 for restarting at byte zero for the same requests. This is a replay-work count, not a network or complete-session speedup. An initialization range plus the fragment at source time 5 seconds was retrieved through the index, reassembled and supplied to MSE. Its sampled output matches the corresponding full-source MSE frame exactly. The direct-file-versus-MSE RGB comparison differs (mean RGBA error 5.918/255, maximum 42); it remains visible in the evidence and is not attributed to archive corruption or to a proven color-conversion cause. Byte e

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R147.random-access-inside-an-ordinary-zip-deflate-entry.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R147.random-access-inside-an-ordinary-zip-deflate-entry.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R146-R158-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R146-R158-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_e/audits/R147.random-access-inside-an-ordinary-zip-deflate-entry.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_e/audits/R147.random-access-inside-an-ordinary-zip-deflate-entry.md)
