<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Integration contracts, profile 1

The original roadmap implementation is commit `f68c1b1bc0e2ee0f3a6b41e890add5c54e30280d`.
Its reports remain under `results/api-roadmap/` and `results/api-preview-facade/`.
They are historical evidence, not adapter qualification. This increment preserves
all existing Player signatures and the convenient `new Player(container, options)`.
The supplied reconciliation document is planning input, not test evidence.

## Public boundaries

`demuxe/contracts` exports structural `PlaybackControl`, `PlaybackRuntime`,
`StateSource` and `PlayerAPI` types derived from actual Player declarations.
`demuxe/integration` exports `subscribeSelector`, `bindPlayer`, and
`createPlayerBinding`. No framework dependency or element registration is imported
by core. Imports are SSR safe; construction and custom element registration require
a browser. Bindings are trusted application code, not a security sandbox.

```ts
import {Player} from 'demuxe';
import {bindPlayer, subscribeSelector} from 'demuxe/integration';
const player = new Player(document.querySelector<HTMLElement>('#output')!);
const binding = bindPlayer(player, {onOperationError: detail => console.log(detail.error.code)});
const stop = subscribeSelector(binding, state => state.volume, volume => console.log(volume));
await player.open('/movie.mp4'); // Application is the only source authority.
await binding.play();
stop();
await binding.dispose(); // The borrowed Player remains usable.
await player.destroy();
```

Selectors deliver initially, compare with Object.is by default, isolate observer
exceptions, and return idempotent cleanup. Supply equality for fresh-object
selections. No polling or second state store is added. Snapshot identity is the
canonical Player identity; use it directly with framework external-store APIs.
Server snapshots and rendering policy are application choices; no React hook is
required or bundled.

Owned creation returns `{player, binding}`. Disposing an owned binding immediately
stops its callbacks, starts Player destruction synchronously, and returns the same
cleanup promise on repeat calls. Borrowed disposal only removes binding listeners.
It never closes media, cancels the shared preview lane, removes application
attachments, revokes application URLs, or resets stats. Commands already submitted
to the canonical queue retain canonical completion; disposal is not rollback.
Handle the returned cleanup promise even when a framework hook cannot await it.

The existing complete player keeps owned lifecycle and its single queue owner.
Its controls are checked against the structural public API; legacy diagnostic event
forwarding is retained for compatibility. UI policy normalization imports remain
bounded implementation utilities, not access to private playback engines.

## Presentation

`player.host` is the stable composition element, including media and subtitle
layers. It survives route replacement. `player.surface` remains transient advanced
access; adapters never use it. Style the host via CSS. Hidden/zero-size hosts do not
change source or decode policy. Removing a borrowed controls element disposes its
binding; removing the host is not a promise of qualified detached playback.

`player.presentation.setFullscreenTarget(container)` designates an ancestor
(including a shadow host) containing output and controls. `null` restores the
composition host. Change targets only while this player has no active or pending fullscreen entry.
Targets are revalidated at execution; exit retires pending entry. Another player's
fullscreen does not prevent this player from configuring its own target. State reads browser
fullscreen state. The built-in player uses its complete element as the target.
Cross-document moves, independent render hosts, advanced PiP integrations and
larger decode buffers are outside these adapter profiles. CSS sizing does not
remove the existing 1920×1080 drawing-buffer ceiling.

The built-in viewer permits one browser-viewport expansion per document. A second player must wait for the first to exit; overlapping entry rejects with `UNSUPPORTED_FEATURE`.

`presentation.state.viewportExpanded` reports browser-viewport expansion separately
from native `fullscreen`. `presentation.subscribe(listener)` immediately delivers
the current presentation snapshot and then changed snapshots, including native
fullscreen/PiP observations and viewport entry/exit. The returned unsubscribe only
removes that observer. Destruction retires observers without a final callback.

The built-in player registers its complete-player expansion adapter. External
controls can check `presentation.canExpandViewport`, call
`requestViewportExpansion()` or `exitViewportExpansion()`, and subscribe to the
same state as the built-in button. Standalone Player hosts can opt in through
`setViewportExpansionAdapter(adapter)`; the host adapter owns layout, focus and
background restoration. Its synchronous `open()`/`close()` must retain composed
audio/video/subtitle output, and `subscribe()` must notify external exits as well
as commands. Removing/replacing the adapter or destroying the Player closes it.
Expansion requires leaving fullscreen/PiP first; native entry closes expansion.
This does not add Safari native video fullscreen or broaden existing PiP profiles.

Media Session is opt-in with `presentation.setMediaSessionEnabled(true)` and permits
one owning Player per document. To publish metadata for loaded media, call
`presentation.setMediaSessionMetadata({title, artist, artwork}, sourceId)` using
the source ID captured when starting the metadata lookup. A retired source ID
throws `ABORTED`, so delayed artwork/title work cannot overwrite a replacement.
Metadata is copied through the owning window's `MediaMetadata` constructor, may
be prepared before acquiring the lease, and is published only by the accepted
owner. Pass `null` to clear the current source's metadata. Source replacement,
source close, disabling the lease and destruction clear the published metadata;
a non-owner never clears another player's metadata. Titles/URLs are not inferred
automatically. Browser metadata support and physical OS-control qualification
remain distinct.

## External profiles

`demuxe/media-element` explicitly exports/registers `demuxe-media`; import does not
register it. Call `element.bind(player)` to borrow a runtime. Put the Player host
inside the element when using the Media Chrome media slot. This facade does not
move a borrowed host automatically. Disconnect disposes after a microtask unless
reconnected; explicit `dispose()` synchronously prevents callbacks. Rebinding is
explicit after disposal. Binding synchronizes accepted metadata, time, volume, rate
and pause intent for controls already listening; these events carry `initial: true`.
It does not replay ended/seeked events or invent readiness.

Media Chrome **4.19.2**, controls profile 1: play, mute, volume, observed time and
duration, and controller fullscreen. Seeking is available through the facade's
currentTime setter, but buffer-dependent time sliders are excluded. Do not enable
loading indicators, captions, casting, PiP, rendition menus or native cue consumers
on the strength of this profile.

`demuxe/adapters/videojs` exports `registerVideojsTech(videojs, name?)` for Video.js
**8.24.1**. It imports no Video.js runtime. Pass `demuxe: {demuxePlayer: player}` and
`techOrder: ['Demuxe']` with no Video.js sources. This is a dedicated Tech profile,
not a source handler or general legacy plugin compatibility claim. It temporarily
places the stable host inside the Tech and restores its original position before
Video.js teardown. A host can belong to only one Tech at a time. Teardown leaves
application-relocated hosts in place and never restores a destroyed runtime host.
Successful source replacement clears the host UI's previous fatal error. The Tech ignores Video.js's bootstrap volume default until
the public ready callback; controls must wait for ready before issuing setters.
This preserves application settings when attaching or remounting a borrowed UI. The application must retain the original parent. Progress,
caption, PiP and fullscreen controls are excluded from this profile. Fullscreen
remains available through the canonical presentation API with a designated outer
container. Sources, playlists and retry policy stay application-owned. Video.js currentSrc
returns an opaque `demuxe-session:<id>` for an accepted session because its public
play method requires a nonempty source identity. It is not a fetchable URL. Before
a source is accepted, Video.js may defer play pending a source, so applications
must open through Player before offering Video.js playback controls.

The host libraries are exact development dependencies for examples/tests. Neither
is a mandatory dependency of the core import. `examples/integration.html` imports
public package subpaths through an import map and pins external browser scripts.
Tests serve installed copies of those exact packages instead of relying on a CDN.

| Projection | Semantics / deviation |
| --- | --- |
| play promise | Immediate delegation; canonical completion, not a new observed-output promise |
| pause/setters | Asynchronous owner commands; errors use `operationerror`, never unhandled rejection |
| paused | Accepted pause intent, including while buffering or seeking |
| currentTime | Accepted observed time; no optimistic timestamp publication |
| seeked | Forwarded only from the core settlement event |
| events | One canonical snapshot projection, then events; stale reentrant publications are retired; loop boundaries do not emit ended |
| loadedmetadata | Accepted source publication; no canplay/canplaythrough/readiness synthesis |
| duration | Finite canonical value, NaN for unknown, Infinity only for explicit live |
| ranges | Native-shaped empty placeholder if unknown; `state.buffered/seekable` retain null |
| error | Only canonical session errors; denied commands do not poison healthy media |
| source | No reflected URL; src assignment rejected; no secondary fetch/engine path |
| defaults | Attributes are not current settings; use the explicit properties after binding |
| capabilities | Canonical `state.capabilities` remains authoritative; unsupported controls excluded |

There is no fabricated readyState, native track list, frame callback, captureStream,
DRM handle, or native-element branding. A source replacement that fails retains
previous accepted media under the canonical transaction contract.

Preview remains one shared latest-request-wins lane. A binding must use request
AbortSignals for its own work and must not call global cancel/clear on disposal.
No decoder/cache per widget is added. Display titles/posters remain UI-local and
do not overwrite source metadata. Timed metadata, wider source management, cue
emulation, advanced presentation and a generalized plugin system are deferred
(INT-08/INT-10) until a concrete consumer needs them.

Primary host contracts: [Media Chrome media elements](https://www.media-chrome.org/docs/en/media-element),
[Video.js Tech](https://legacy.videojs.org/guides/tech/),
[Tech registration](https://docs.videojs.com/tech).

Qualification and unresolved scope: [implementation ledger](API-INTEGRATION-LEDGER.md) and [browser/contract evidence](../results/api-integration/20260927/README.md).
