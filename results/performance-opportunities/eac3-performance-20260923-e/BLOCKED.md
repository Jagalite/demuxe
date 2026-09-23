<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Second CPU campaign blocked by harness drift

All nine planned HEVC/E-AC-3 rounds were blocked before measurement. The refreshed correctness run used the same assets and browser, but `tests/head-to-head/adapters.mjs` changed in the shared workspace before the CPU runner started. The changed harness hash correctly prevented reuse of the earlier correctness proof. No CPU result exists in this directory. A copy of the accepted correctness harness was placed at `tests/performance-opportunities-eac3-frozen/` for a subsequent isolated rerun; concurrent edits to the ordinary harness are preserved.
