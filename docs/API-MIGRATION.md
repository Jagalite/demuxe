<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# API migration

## Player-owned preview facade

`player.preview` now exposes `PlayerPreview`, not the full `PreviewController`.
Frame requests, refinement callbacks, prefetch, provider registration/replacement,
cache clearing, and `enabled` assignment keep their signatures. Diagnostics are
immutable snapshots. The facade and its methods cannot be replaced by assignment.

Calls to `player.preview.setSourceIdentity`, `setDuration`, `setSuspended`, `drain`,
or `destroy` must be removed: those operations belong to Player. Use
`await player.close()` for reusable teardown and `await player.destroy()` for final
teardown. Use request signals for cancellation and `clear()` to cancel preview
work and evict cached images. If your application intentionally owns an independent
lane, construct the still-exported `PreviewController` and manage its lifecycle.
Code explicitly annotating `player.preview` as `PreviewController` should use the
exported `PlayerPreview` type instead.

## Normalized playback API

The current baseline is demo-source 8bb451b, not the older main implementation.
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

## Roadmap API additions

The five recommended phases now have public APIs; see [contracts and limitations](API-EXTENSIONS.md) and [option defaults](API-OPTIONS.md). File/Blob opening supports transactional `startTime`; `inspectMedia` works independently. Metadata/chapters, timing/style controls, attachment handles, streaming quality/live state, stable statistics/explanations, loops/ranges, snapshots/stepping, and `player.presentation` are additive.

Keep the returned attachment object when calling the new `attachSubtitle`, `attachTextTrack`, or `attachFont` methods. Existing `addSubtitle`, `addTextTrack`, and `addFont` callers retain `Promise<void>`. Fonts keep their existing player lifetime. Existing seeks remain queued; use `{policy:'latest'}` to request supersession. Existing construction defaults and the three public playback modes are unchanged.

`modechange` and `selectionchange` now infer their actual detail types through `PlayerEventMap`. They describe candidates/attempts; use immutable state for the accepted source. Unobserved statistics and presented-quality facts stay null. Custom callback playback uses bounded staging (32 MiB); it does not imply lazy large-file streaming.

See [integration contracts and compatibility profiles](API-INTEGRATION.md) for public structural interfaces, explicit binding ownership, stable presentation hosting, and external UI limits.
