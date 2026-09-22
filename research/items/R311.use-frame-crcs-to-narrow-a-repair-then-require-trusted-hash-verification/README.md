<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Use frame CRCs to narrow a repair, then require trusted-hash verification

Full identity: `R311.use-frame-crcs-to-narrow-a-repair-then-require-trusted-hash-verification`.

Current decision: **pursue** (actual_compressed_repair_and_native_decode).

Actual1033-byte FLAC frame under explicit single-bit corruption model: CRC16 syndrome map nominates locations, then only separately trusted SHA256 identity admits a temporary repaired view. All12 damaged cases repair to original full bytes; two-bit, CRC-valid/hash-invalid, missing-identity and wrong-identity controls reject. Repaired fullFLAC yields all2048 host PCM samples and native Chrome audio samples exactly. Seven paired12-repair jobs, including fresh syndrome-table construction, cost median0.19645x direct SHA256 candidate enumeration (range0.0881–0.3621). Pursue bounded offline repair; CRC never becomes admission authority.

Next action: Retain explicit single-bit/known-extent model and independently trusted identity; do not admit CRC-only or expand to arbitrary repair without a new bounded cost/correctness contract.

## Stages

| Stage | Status | Basis |
|---|---|---|
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | ActualFLAC frame/extent and separately trusted expectedSHA256; real corrupted temporary views. |
| screen | passed | CRC syndrome table nominates sparse candidate bits, no weakened final identity check. |
| correctness | passed | 12cases exact bytes; all2048host/native samples exact;2bit/CRCvalid-wronghash/missingidentity/wrongidentity reject before native admission. |
| performance | passed | Fresh table+12repair job median80.35% faster than direct SHA256 enumeration, all7pairs faster; bounded1033Bframe profile. |
| results | passed | Actual1033-byte FLAC frame under explicit single-bit corruption model: CRC16 syndrome map nominates locations, then only separately trusted SHA256 identity admits a temporary repaired view. All12 damaged cases repair to original full bytes; two-bit, CRC-valid/hash-invalid, missing-identity and wrong-identity controls reject. Repaired fullFLAC yields all2048 host PCM samples and native Chrome audio samples exactly. Seven paired12-repair jobs, including fresh syndrome-table construction, cost median0.19645x direct SHA256 candidate enumeration (range0.0881–0.3621). Pursue bounded offline repair; CRC never becomes admission authority. |
| decision | passed | Actual1033-byte FLAC frame under explicit single-bit corruption model: CRC16 syndrome map nominates locations, then only separately trusted SHA256 identity admits a temporary repaired view. All12 damaged cases repair to original full bytes; two-bit, CRC-valid/hash-invalid, missing-identity and wrong-identity controls reject. Repaired fullFLAC yields all2048 host PCM samples and native Chrome audio samples exactly. Seven paired12-repair jobs, including fresh syndrome-table construction, cost median0.19645x direct SHA256 candidate enumeration (range0.0881–0.3621). Pursue bounded offline repair; CRC never becomes admission authority. |

[New run](../../shared/runs/20260920T000413Z-crc-repair/run.json) · [Evidence index](evidence/index.json) · [Complete history](history.jsonl) · [Item contract](item.json)

## Imported D01–D73 screening supplement

Existing decisions and stage gates above remain unchanged. These are external component findings, not a new maintained-player execution. All controls, failures and destination limits remain in the linked reports.

- **D18 — A decoding success is not an integrity verdict**: merge_existing. [Original report](../../shared/runs/20260921T023214Z-screened-ideas-d01-d73/snapshots/batches/batch03_D14-D20/demuxe_batch3/REPORT.md); [indexed contract and follow-up](evidence/20260921T023214Z-screened-ideas-d01-d73/screenings.json).

[Campaign reconciliation](../../campaigns/screened-ideas-d01-d73.md). Current-owner retesting is required before promoting this supplement.


## Screened-owner follow-up (20260921T030620Z-screened-owner-completion)

**D18 — deferred_profile_followup**: Retain trusted-integrity separation. Decoding success is not a CRC/MD5/authentication check; the imported bounded integrity controls do not create a new playback optimization.

[Shared report](../../shared/runs/20260921T030620Z-screened-owner-completion/REPORT.md) · [Current item state](item.json) · [Append-only history](history.jsonl).
