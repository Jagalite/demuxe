<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Presentation owner opportunity review

This is a current source review, not a new browser execution or a negative pixel test. Existing WebGPU and libass component experiments do not manufacture the missing owner or prove a current workload benefit.

## R237.propagate-the-visible-region-backward-through-the-effects-pipeline

No effect graph or filter-footprint owner exists in the current custom presenter. The shader crops final texture sampling; CPU staging copies and uploads all three source planes first. Backward ROI propagation cannot remove effect intermediate work in this current owner because no such intermediates exist. A fixed blur demonstration would establish a different, newly invented graph.

Reopen: Reopen when an actual fixed-filter graph processes material off-viewport intermediate pixels. Then compare full graph versus halo-expanded ROI and omit the halo as a wrong-output control, with unknown/temporal effects falling back to full frame.

Sources: web/yuv-presenter.js

## R330.encode-repeated-subtitle-glyph-arrangements-as-reusable-scene-objects

Current libass renderer already owns glyph caches and reports unchanged output; the native bridge exports final ASS_Image bitmap tiles, not fully shaped scene objects. Browser reuse at this boundary cannot avoid internal shaping or layout. No measured repeated-layout workload justifies introducing a new shaping API; existing bitmap reuse is a separate mechanism.

Reopen: Reopen after instrumentation of one real libass track establishes repeated expensive shaping/layout beyond existing caches. Preserve font fallback, line wrap and style/timing invalidation before exposing reusable scene objects.

Sources: native/subtitles/ass.c, web/native-ass-worker.js, src/internal/native-ass.ts

## R364.reuse-gpu-command-sequences-across-changing-video-frames

The current custom presenter is WebGL2, with one video triangle and optional subtitle-overlay triangle. It has neither a WebGPU render-pass owner nor reusable owned-slot bind groups. WebGPU render bundles cannot be applied to this API owner; creating a new renderer or adding video copies solely for command caching is outside this opportunity.

Reopen: Reopen if a WebGPU renderer is independently introduced and command encoding of its existing batched layout is measured material. Test changing frame/parameter contents and atlas-generation invalidation before any bundle timing comparison.

Sources: web/yuv-presenter.js, web/software-full-engine-worker.js

