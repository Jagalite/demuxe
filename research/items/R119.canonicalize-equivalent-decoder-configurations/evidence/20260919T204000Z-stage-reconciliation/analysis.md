<!-- SPDX-License-Identifier: CC-BY-4.0 -->

Historical evidence reviewed and hashed; no experiment rerun.

Correctness: passed. Exact duplicate SPS/PPS bytes canonicalize69→38description bytes; two48-frame browser decodes match independent pixels/timestamps; same-ID changed SPS rejects and cleanup recorded. Only byte-identical duplicates.

Performance: pending. No repeated reconfiguration cost/workload benefit measured.

Prior finding remains scoped: Exact duplicate AVC SPS/PPS entries canonicalize to one copy, preserving48 browser-decoded frames and PTS against independent host oracle; same-ID changed SPS rejects. No semantic equivalence beyond exact duplicate parameter bytes; source reset still required.

Production integration and release qualification remain separate.
