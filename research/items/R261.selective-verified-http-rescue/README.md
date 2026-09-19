<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# selective verified HTTP rescue

Full identity: `R261.selective-verified-http-rescue`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

Current authorized RangeReader validates ETag/size and caches ranges but has no trusted per-chunk manifest/local-corruption repair source. Hash rescue requires explicit trust and substitution ownership, not generic retry.

Next action: Define trusted manifest identity and one two-bad-chunk rescue component; exact whole-file hash and tampered response rejection required, keeping credentials/ETag changes separate.

## Definition and contract

A 6 s H.264/AAC MP4 was split into 64 KiB verification units. Two units were deliberately corrupted locally. A loopback HTTP server supported byte ranges; the rescue client compared each local chunk to a SHA-256 manifest and requested only mismatches. Result. The client requested exactly chunks [8, 16], transferring 131,072 bytes versus 1,599,101 bytes for a full fetch. The repaired file matched the source SHA-256 cdca628c17b65f13ec3f4fb8cf150509044fbcbdc1ac8b1bbfb612a8ae93b94a exactly. A tampered rescue response was rejected by hash. The repaired file decoded with FFmpeg and played in Chromium; the corrupt control produced decode errors. Boundary. This is loopback HTTP. It does not qualify WAN behavior, CORS, credentials, cache validators, authorization changes, or manifest distribution/trust.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R261.selective-verified-http-rescue.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R261.selective-verified-http-rescue.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R261-R267-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R261-R267-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_d/audits/R261.selective-verified-http-rescue.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_d/audits/R261.selective-verified-http-rescue.md)
