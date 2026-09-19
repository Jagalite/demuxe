<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Reuse GPU command sequences across changing video frames

Current disposition: **stop_current_profile**, source review. No candidate experiment or general algorithm rejection.

The current custom presenter is WebGL2, with one video triangle and optional subtitle-overlay triangle. It has neither a WebGPU render-pass owner nor reusable owned-slot bind groups. WebGPU render bundles cannot be applied to this API owner; creating a new renderer or adding video copies solely for command caching is outside this opportunity.

Define, screen, results and decision passed. Prepare, correctness and performance are not applicable after this scoped opportunity stop.

Reopen: Reopen if a WebGPU renderer is independently introduced and command encoding of its existing batched layout is measured material. Test changing frame/parameter contents and atlas-generation invalidation before any bundle timing comparison.

[Current record](item.json) · [History](history.jsonl) · [Review](../../shared/runs/20260919T201245Z-presentation-owner-review/analysis.md)
