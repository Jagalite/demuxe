<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Seek inside authenticated encrypted media without decrypting the whole file

Full identity: `R293.seek-inside-authenticated-encrypted-media-without-decrypting-the-whole-file`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

Current reader validates authorized ranges/ETag but provides no segmented Streaming AEAD adapter. Historical Tink/WebCrypto/network absence is not a verified current blocker; a pinned reviewed construction and key/context owner still need setup. Do not substitute a homemade format.

Next action: Identify one pinned Tink reference and test one official segmented vector plus a straddling range before wrapping existing reader.

## Definition and contract

Mechanism. Implement a logical plaintext range reader over a deliberately prepared, independently authenticated segmented source. Use an existing reviewed construction such as Tink AES-GCM-HKDF Streaming, not a new cryptographic scheme. An authorized caller supplies the key and associated-data context. The adapter retrieves and authenticates complete necessary ciphertext segments, then exposes only the requested plaintext ranges to the existing demux/remux path. First experiment. Encrypt a synthetic MP4 through a pinned reference implementation. Validate browser or Wasm adapter output against official/reference vectors and exact plaintext bytes for startup, distant seeks, straddling ranges, and final short segments. Benchmark against sequential processing of the same encrypted object and a plaintext range-reader baseline.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R293.seek-inside-authenticated-encrypted-media-without-decrypting-the-whole-file.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R293.seek-inside-authenticated-encrypted-media-without-decrypting-the-whole-file.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R289_R294_Proposals.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R289_R294_Proposals.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_i/audits/R293.seek-inside-authenticated-encrypted-media-without-decrypting-the-whole-file.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_i/audits/R293.seek-inside-authenticated-encrypted-media-without-decrypting-the-whole-file.md)
