# Older Safari decoder duration mitigation

Hybrid remains enabled. Safari user agents through 26.5.2 use a narrow WebCodecs adaptation in `web/external-video-decoder.js`: the encoded chunk passed to the native decoder omits its optional duration. This avoids writes to the native duration table implicated in the observed crash. Other browsers and newer Safari retain their original chunks.

Durations stay in Demuxe's decoder-generation metadata, bounded to 256 pending entries. Output is matched by timestamp, including duplicate timestamp order. A one-microsecond rounding difference is accepted only when there is a unique nearby match. A WeakMap associates recovered duration with the original browser frame; the retained and copyback adapters read it through `externalFrameDuration`. The frame itself, including its timestamp and transfer identity, is unchanged. Submission failure rolls back metadata; flush clears unmatched entries; reset/reconfiguration retires the old generation. Capacity exhaustion reports an error instead of growing without limit.

The policy comment links [WebKit's upstream fix](https://github.com/WebKit/WebKit/commit/50232798d951) and notes that later WebKit versions contain the fix. The first fixed shipping Safari release has not been verified. The version boundary is conservative and is not a codec-support table or proof that newer Safari releases are universally safe.

## Evidence

- 50 focused policy, decoder ownership, retained decoder and preview-session tests passed, including duration reconstruction, original-frame identity, duplicate/reordered timestamps, microsecond quantization, metadata bounds, backpressure and stale flush isolation.
- WebKit 26.0: eight actual Hybrid playback/thumbnail cases passed (local/remote pthread and Asyncify, twice each). Independent image, timestamp, primary-isolation and served-asset verification passed. Receipt: `2026-10-08T15-02-13-971Z`.
- WebKit 27.2: four equivalent cases passed. Receipt: `2026-10-08T15-03-20-670Z`.
- Firefox 157.0: four equivalent cases passed. Receipt: `2026-10-08T15-02-16-773Z`.
- Dedicated WebKit 26 worker probe: 4,000 duration-bearing frames retained their expected durations and 4,000 duration-free frames also completed. Instrumentation observed **zero duration fields passed to the underlying VideoDecoder** and zero remaining pending metadata after flush. Receipt and independent assertions: `2026-10-08T15-02-03-239Z/mitigation-verified.json`.
- TypeScript and runtime JavaScript syntax checks passed.

An earlier frame-cloning implementation failed old-WebKit pthread presentation and was replaced with separate metadata. Those failed receipts remain in `2026-10-08T14-58-01-370Z`. The final code does not disable Hybrid or clone output frames.

These results verify the mitigation's mechanism and exercised paths; they do not prove an intermittent native crash is impossible. Installed Safari 26.5.2 and physical iOS devices have not been tested in this follow-up. Browsers that hide or change their Safari identity may not receive the workaround. The upstream browser fix remains the definitive fix.
