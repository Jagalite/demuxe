<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Use frame CRCs to narrow a repair, then require trusted-hash verification

Full identity: `R311.use-frame-crcs-to-narrow-a-repair-then-require-trusted-hash-verification`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

Current readers validate range identity and retry transport but have no independently trusted compressed-frame hashes or FLAC frame-length index. Related report CRC32 localization/collision filtering is not the proposed FLAC single-bit syndrome implementation.

Next action: Provide a tiny frame extent plus separately trusted SHA256, then enumerate bounded single-bit candidates on a temporary copy and reject CRC-valid hash-invalid, missing-identity and two-bit controls.

## Definition and contract

Class: Bounded recovery from sparse corruption; no weakened integrity admission. Output contract: Only bytes matching an independently trusted expected identity can be admitted as repaired. Related: R181 identifies contaminated output; this investigates repairing compressed bytes before decoding. FLAC specifies a frame CRC with a fixed polynomial and zero initialization [S7]. For a known frame length and an explicitly single-bit candidate model, precompute how each possible bit flip changes the observed CRC mismatch. The mismatch can then nominate candidate error locations much more efficiently than repeated full-frame CRC scans. CRC agreement is only a candidate filter. After applying a candidate to a temporary view, verify the exact frame or containing verified chunk against an independently trusted SHA-256 value or equivalent authenticated identity. Web Crypto provides the digest primitive, not trust in the expected digest [S8].

Output contract: Independent known truth plus a specific expected observation, not self-reported counters from the candidate.

Primary metric: Decision power, reproducibility or diagnostic cost without changing the measured player outcome.

Adverse control: A different failure, stale source/hash or malformed record must not count as the intended finding.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R311.use-frame-crcs-to-narrow-a-repair-then-require-trusted-hash-verification.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R311.use-frame-crcs-to-narrow-a-repair-then-require-trusted-hash-verification.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R307_R312_Proposals.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R307_R312_Proposals.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_h/audits/R311.use-frame-crcs-to-narrow-a-repair-then-require-trusted-hash-verification.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_h/audits/R311.use-frame-crcs-to-narrow-a-repair-then-require-trusted-hash-verification.md)
