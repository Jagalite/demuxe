# Runtime requirements and non-isolated remux disposition

**Status: Dropped / intentionally removed.** JSPI and Asyncify are research-only findings, not supported production runtimes. Demuxe does not ship or select the former JSPI remux engine and does not replace it with Asyncify.

JSPI/non-isolated remux was evaluated and intentionally removed from the production architecture. Its primary benefit was deployment compatibility without cross-origin isolation, while it introduced an additional Wasm runtime, invocation model, packaging path, qualification surface, and long-term maintenance burden. Maintenance complexity outweighs present production value; it did not materially advance Demuxe’s primary objective of maximizing native/near-native playback performance. The pthread runtime remains the maintained advanced Wasm runtime. Browser-native functionality remains usable without isolation. Revisit only if concrete deployment demand appears later.

Native Direct, browser text tracks, browser-compatible gain processing, and Shaka/native streaming remain available without isolation where their normal source and browser requirements are satisfied. Demuxe initialization does not require isolation. Routing excludes only components that need it and can fall back among eligible browser-native routes.

The maintained pthread Wasm paths—including remux/inspection, audio adaptation, Hybrid, Software, and the current Wasm subtitle components—require `crossOriginIsolated === true`. A typical configuration is:

```http
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

Another configuration producing cross-origin isolation may also be used. These requirements apply to the advanced components, not to the entire player. Without isolation, these routes fail qualification with an isolation-required reason before engine loading; optional Wasm preparation reports unavailable without downloading engines.

Existing findings and evidence remain in [R006](../research/items/R006.offer-a-non-pthread-remux-path-without-isolation/README.md) and [R176](../research/items/R176.jspi-backed-synchronous-wasm-i-o/README.md). Historical results are not current support claims. The decision may be revisited if concrete deployment demand appears later; no additional investigation is planned.

Dedicated JSPI/Asyncify build, benchmark, and experiment harnesses have been removed. Historical logs and media outputs remain where referenced by prior research or shared parser tests; their old source-path references do not identify runnable maintained tooling.
