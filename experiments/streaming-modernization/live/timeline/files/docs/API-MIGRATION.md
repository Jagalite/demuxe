# API migration

All existing playback methods remain; no fourth mode or raw command passthrough
is introduced. Keep `volume(75)` and `rate(1.5)` as-is, or use `setVolume(.75)` and
`setPlaybackRate(1.5)`. Use `setMuted(true)` instead of storing a second volume.

Replace UI reads of time-pos/duration/track-list with `player.state` and
`player.subscribe(state => render(state))`. Unknown duration/ranges are null.
Use state.mediaInfo for geometry and state.capabilities.features for availability;
legacy boolean flags are retained. Use stable `state.audioTracks` and
`state.subtitleTracks` IDs with selectAudioTrack/selectSubtitleTrack. Legacy
selectTrack continues to accept backend IDs.

Replace destroy-and-recreate on Close with await player.close(). Keep destroy for
final teardown. Pass an AbortSignal to open rather than destroying the working
session to cancel a replacement. Catch PlayerError; the error event now carries
structured error detail instead of an untyped backend string. mpv, modechange and
selectionchange remain advanced interfaces.

The optional component is a separate `demuxe/player` import. Custom controls use
exactly the same Player API. Runtime static directories continue to work; the
assetBase and copy-assets interfaces are described in RUNTIME-ASSETS.md. These
interfaces are undergoing milestone validation; see PUBLIC-API-VALIDATION.md for
implemented versus qualified behavior and remaining release gates.

```js
// Before
player.addEventListener('mpv', ({detail}) => {
  if (detail.name === 'time-pos') updatePosition(detail.data);
});
// After
const unsubscribe = player.subscribe(state => updatePosition(state.currentTime));
```

`modechange.detail.mode` in a loading/failed event is the candidate, not necessarily
the accepted session. Prefer state.activeMode for viewer labels. It is null when
idle. player.mode retains its historical idle route value. Rendering status uses
observed progress; playbackIntent is distinct. Do not wait for playing to resolve
an open: sources intentionally open paused. `seeked` accompanies a settled seek,
not command submission.

The migrated playground source uses the optional component. Earlier recorded
playground screenshots/tests describe its predecessor and are preserved as
history. The public Pages deployment remains unchanged until publication is
separately authorized. This work has not published a new npm package or closed
the independent clean-engine-build release gate.

## First public Demuxe beta

Use `<demuxe-player>`, `DemuxePlayerElement`, `--demuxe-*` CSS variables,
`demuxe copy-assets`, and `/assets/demuxe/`. No legacy element alias is registered.
The three public mode values remain `native`, `hybrid`, and `software`.
See [the branding audit](BRANDING-MIGRATION.md) for retained historical identifiers.


## Streaming quality policy

Existing sources without `streaming.qualityPolicy` keep their direct/remux or
fixed-selection behavior. `streaming.representation` and the legacy top-level
`streaming.maxBandwidth` remain fixed compatibility selection, not ABR. They
cannot be combined with the new quality policy.

Move an adaptation ceiling to
`streaming: {qualityPolicy: {mode: 'auto', maxBandwidth: 4_000_000}}`.
For explicit fixed quality, open with `{qualityPolicy: {mode: 'manual'}}`, read
`player.state.quality.qualities`, then call `player.setQuality()` with a current
source ID. Discard IDs when the source changes. Use `presentedId` for the quality
actually visible; `requestedId` can remain pending while paused or preparing.

The explicit policy selects the integrated mpv-backed pipeline. Native remains
efficient and unchanged for sources without it. There is one accepted manifest
and presentation owner per source; compatibility adapters and the integrated
coordinator never schedule the same accepted session together. See
[the admission and live-window contract](PUBLIC-API.md#streaming-quality-and-live-windows)
before migrating manifests outside the qualified layout.
