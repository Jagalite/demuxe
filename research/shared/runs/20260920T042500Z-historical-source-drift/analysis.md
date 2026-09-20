<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Historical source drift reconciliation

The captured verification sweep reported **14 hash/size failure rows**, covering **7 artifact references in 6 historical manifests**, for **3 production source files**. These are recoverable committed-source drift, not missing or corrupted historical byte evidence.

All expected SHA-256 identities and byte counts match exact Git blobs at historical commit `c5a82ca0346d1e27be8f8007d4a68585ababcb75`. Byte-for-byte snapshots are retained under `snapshots/src/`; `mapping.json` maps each unchanged old manifest/path/expected hash to its precise commit, Git blob and snapshot. The matching commit proves availability of the historical bytes; it is not claimed as the original experiment execution revision.

At audit time all three live files exactly match committed HEAD `5694e2e48d3bcae572614f8a1fa19233d1620e37`; no uncommitted source edit is being excused. Production commits `7baf76570e2c5708ab0f8107c86803fa864efada` and `5694e2e48d3bcae572614f8a1fa19233d1620e37` account for the later source versions. Per-path change history, current hashes and sizes are recorded in the mapping.

The original verifier output is preserved unchanged and still says `passed: false` for live-path verification. This audit does not rewrite old manifests, repair their hashes in place, modify production files, rerun media tests or transfer old qualification to current production code. It supplies exact immutable historical-source identities for narrow reconciliation. All manifest hashes and live source bytes were checked unchanged after the audit.

A separate historical metadata discrepancy is retained explicitly: four old manifest references label `src/internal/playback-plans.ts` GPL-3.0-or-later, while the exact expected historical bytes carry an **Apache-2.0 SPDX header**. The new snapshot preserves that original header and Apache license; those old metadata entries remain unchanged. The two player source snapshots retain GPL-3.0-or-later headers. Both license texts are included.

