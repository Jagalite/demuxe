<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Encode repeated subtitle glyph arrangements as reusable scene objects

Current disposition: **stop_current_profile**, source review. No candidate experiment or general algorithm rejection.

Current libass renderer already owns glyph caches and reports unchanged output; the native bridge exports final ASS_Image bitmap tiles, not fully shaped scene objects. Browser reuse at this boundary cannot avoid internal shaping or layout. No measured repeated-layout workload justifies introducing a new shaping API; existing bitmap reuse is a separate mechanism.

Define, screen, results and decision passed. Prepare, correctness and performance are not applicable after this scoped opportunity stop.

Reopen: Reopen after instrumentation of one real libass track establishes repeated expensive shaping/layout beyond existing caches. Preserve font fallback, line wrap and style/timing invalidation before exposing reusable scene objects.

[Current record](item.json) · [History](history.jsonl) · [Review](../../shared/runs/20260919T201245Z-presentation-owner-review/analysis.md)
