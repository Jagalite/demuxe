<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Use frame CRCs to narrow a repair, then require trusted-hash verification

Current disposition: **blocked** — **setup** prerequisite. Historical review; no new media execution.

Current readers validate range identity and retry transport but have no independently trusted compressed-frame hashes or FLAC frame-length index. Related report CRC32 localization/collision filtering is not the proposed FLAC single-bit syndrome implementation.

Prepare: **blocked**. Correctness: **blocked**. Performance: **blocked**.

Next: Provide a tiny frame extent plus separately trusted SHA256, then enumerate bounded single-bit candidates on a temporary copy and reject CRC-valid hash-invalid, missing-identity and two-bit controls.

[Current record](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json) · [Review](../../shared/runs/20260919T202334Z-ranks251-392-reconciliation/analysis.md)
