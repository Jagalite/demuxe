<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Build audio seek checkpoints from codec state plus filter state together

Current disposition: **blocked** — **setup** prerequisite. Historical review; no new media execution.

Seek commands let mpv rebuild decoder/filter state; no portable versioned logical state serializer spans decoder, resampler, mixer and filters. Raw decoder snapshot in historical prototype is not maintained ABI.

Prepare: **blocked**. Correctness: **blocked**. Performance: **blocked**.

Next: Define a versioned state schema for one fixed Opus/resampler/IIR pipeline; test nonzero resampler phase checkpoint and reject zeroed phase/filter state or runtime mismatch.

[Current record](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json) · [Review](../../shared/runs/20260919T202334Z-ranks251-392-reconciliation/analysis.md)
