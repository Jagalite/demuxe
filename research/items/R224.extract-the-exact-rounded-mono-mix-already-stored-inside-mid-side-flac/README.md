<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Extract the exact rounded mono mix already stored inside mid-side FLAC

Current disposition: **blocked** — **setup** prerequisite. Historical review; no new media execution.

The maintained FLAC path preserves selected integer samples and layouts through decode/encode; it does not expose mid subframes or a rounded-mono request. Mid extraction needs a bit parser and a precisely defined floor/rounding contract, especially for negative odd sums and coding-mode transitions.

Prepare: **blocked**. Correctness: **blocked**. Performance: **blocked**.

Next: Parse one all-mid-side FLAC fixture, extract only mid residuals into valid mono frames, and compare against the explicitly rounded integer average; reject a switched left/side frame.

[Current record](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json) · [Review](../../shared/runs/20260919T202334Z-ranks251-392-reconciliation/analysis.md)
