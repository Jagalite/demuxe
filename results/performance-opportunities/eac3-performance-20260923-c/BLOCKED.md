<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# CPU campaign blocked by harness drift

All nine planned HEVC/E-AC-3 rounds were blocked before measurement. The CPU runner required exact correctness/harness identity. Between the accepted six-lane audio correctness run and this attempt, `tests/head-to-head/expand.py` and `tests/head-to-head/planned.json` changed in the shared workspace, changing `harnessSHA256` while the prepared asset hash and browser identity stayed the same. The runner correctly declined to reuse the earlier correctness proof. No E-AC-3 CPU numbers exist in this directory. Preserve this attempt; rerun correctness and CPU under one frozen harness snapshot.
