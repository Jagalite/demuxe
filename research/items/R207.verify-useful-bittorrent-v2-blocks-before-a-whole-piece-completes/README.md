<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Verify useful BitTorrent-v2 blocks before a whole piece completes

Full identity: `R207.verify-useful-bittorrent-v2-blocks-before-a-whole-piece-completes`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

Current source authority uses validated HTTP ranges or local File identity, with no BitTorrent peer/hash-request or trusted BEP52 root input. Six verified leaves are a useful primitive but need an authenticated leaf-to-media byte provider.

Next action: Define one read-only provider exposing only verified 16KiB leaves for an existing fMP4 prefix; reject wrong root, proof position and changed source before append.

## Definition and contract

The 579,704-byte fMP4 was hashed as BEP52-style 16-KiB leaves. The first complete init+media fragment ended at byte 91,196, requiring 6 leaves / 98,304 bytes, or 37.5% of a 256-KiB logical piece. Each required leaf was verified against the file's SHA-256 Merkle pieces root; wrong proof, wrong position, and altered-file controls were rejected. Only the verified prefix was exposed to MSE. Chromium buffered about one second and presented 13 frames before the remainder of that logical piece was available. This demonstrates earlier useful verification for a clear random-access media prefix; a full peer-protocol/hash-request implementation remains outside the pilot.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R207.verify-useful-bittorrent-v2-blocks-before-a-whole-piece-completes.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R207.verify-useful-bittorrent-v2-blocks-before-a-whole-piece-completes.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R203-R213-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R203-R213-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_e/audits/R207.verify-useful-bittorrent-v2-blocks-before-a-whole-piece-completes.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_e/audits/R207.verify-useful-bittorrent-v2-blocks-before-a-whole-piece-completes.md)
