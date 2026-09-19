<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# one request for distant byte ranges

Full identity: `R216.one-request-for-distant-byte-ranges`. Reused R-numbers are separate mechanisms.

Current imported decision: **PURSUE** (top100).

Actual HTTP multipart range response matches two independent single-range reads; truncated multipart rejects. One request replaces two for capable test origin, with575 response bytes for384 payload bytes. Production origin capability remains prerequisite.

Next action: Locate one real repeated read/index/validation boundary and its trusted source identity. Separate logical requests from transferred or physical-disk bytes.

## Definition and contract

Three independently decodable 0.6-second H.264/AAC MP4 clips were embedded far apart in a 375,274-byte resource. Their useful bytes total 31,212 bytes. - Three ordinary range requests: 31,212 response-body bytes, 3 requests. - One contiguous request spanning all regions: 260,586 bytes, including 229,374 bytes of gaps. - One multipart/byteranges request: 31,577 bytes in the host test, only 365 bytes of multipart overhead, 1 request. The independent multipart parser recovered the three requested byte regions exactly, and each extracted MP4 contained both H.264 video and AAC audio and decoded successfully. Chromium itself also issued the multi-range fetch and received HTTP 206 multipart/byteranges (~31.5 KB). A separate slow-response test aborted with AbortError; the server observed the disconnect after only 49,152 of 7,505,480 bytes had been sent.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R216.one-request-for-distant-byte-ranges.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R216.one-request-for-distant-byte-ranges.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R214-R222-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R214-R222-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_c/audits/R216.one-request-for-distant-byte-ranges.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_c/audits/R216.one-request-for-distant-byte-ranges.md)
- [results/top100/ownership/result.json](../../../results/top100/ownership/result.json)
