<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Split FLAC frames in time while reusing their prediction work

Current disposition: **blocked** — **setup** prerequisite. Historical review; no new media execution.

The encoder generates complete frames and packet-copy mux preserves packet boundaries. Splitting a FLAC frame in time needs reconstructed boundary warmups plus residual partition/framing rewrite, none exposed by the maintained packet interface.

Prepare: **blocked**. Correctness: **blocked**. Performance: **blocked**.

Next: For one restricted predictor/frame, derive split warmups and reframe two outputs; compare concatenated PCM exactly and reject invalid split/residual partition cases.

[Current record](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json) · [Review](../../shared/runs/20260919T202334Z-ranks251-392-reconciliation/analysis.md)
