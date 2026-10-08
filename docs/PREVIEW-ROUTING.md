# Preview routing

The built-in generated preview follows the accepted playback engine. Native direct uses a separate browser video element; Native remux uses an independent remux session with the selected runtime; Shaka prefers authored image tracks and otherwise uses a separate clear-VOD Shaka session pinned to the selected representation. Hybrid and Software use their accepted pthread, JSPI or Asyncify runtime.

Each preview session owns its source transport, seek position and decoder. It borrows verified provider assets, never the playback session or playback buffers. One child is reused for nearby requests and released after five idle seconds. Replacement waits for the previous child to finish teardown. Source/engine/video-track/quality changes clear the cache and retire the child. Cancellation, disabling previews, buffering, document suspension, provider replacement and destruction also release it. Cached images survive playback pressure.

```js
const player = new Player(container, {
  preview: { duringPlayback: 'auto' }
});
```

`auto` admits Native and Hybrid previews during playback. Software requires known source dimensions of at most 1280×720. `allow` permits larger or unknown Software sources; `defer` postpones all built-in generated previews until paused. Buffering and suspension still cancel work under every policy. Authored images and cached frames remain available. These policies govern built-in providers; hosts remain responsible for custom providers' `allowDuringPlayback` declarations.

Remote previews copy headers, credentials, origin restrictions and representation constraints. Range readers receive low priority and a separate 256 KiB cache. Browser and Shaka buffering budgets are hints, not hard memory bounds. Previews do not call playback's authorization refresh callback: expired credentials fail locally. Renewing a source through the player supplies the next preview session with the new credentials. CORS must permit canvas readback. Live and encrypted streams do not acquire a generated Shaka session.

Frame times remain approximate media-time estimates unless an authored provider supplies interval metadata. A matching engine does not imply exact PTS, identical playback filters, subtitles, or tone mapping. Decoder and buffering limits still apply; selecting the same engine does not enlarge its coded-data budget. Preview failures never trigger playback route recovery.

Custom `PreviewProvider.release()` is optional. The controller calls it when resources should be retired; the provider must remain reusable afterward. Return a promise to include teardown in `drain()` and `destroy()`.

Verification scripts and receipts are described in `experiments/preview-route-alignment/`. Synthetic colored time regions verify actual pixels independently of reported timestamps. Measurements distinguish initialization, seek/decode, image conversion, cache lookup and total latency; they do not establish universal browser or high-resolution performance guarantees.

[Firefox/WebKit qualification](../experiments/preview-route-alignment/CROSS-BROWSER-RESULTS.md) records supported runtime execution, lifecycle checks, and remaining browser/source limits.
