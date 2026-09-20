<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Public API contract

Contract for the public API milestone work. Implementation and qualification are
tracked separately in PUBLIC-API-VALIDATION.md; this document is not test evidence.
The baseline is demo-source 8bb451b, present in the working tree on main f9a8f9c.

Player is the sole playback owner. It owns its video/canvas surface, bounded
source adapters, routing, synchronization, recovery and teardown. There are
exactly three modes: native, hybrid, software. UI and core imports are separate.
No arbitrary mpv command interface is exposed.

## Compatibility and additions

Existing: ready, open(File | ArrayBuffer), openRemote, play, pause, seek,
volume(0–100), rate(0.5–2), selectTrack with backend IDs, subtitleVisible,
addSubtitle, addTextTrack, addFont, setMode, setAutomaticSelection, filter and
tone-mapping methods, resize, destroy, properties, diagnostics, mpv events,
modechange and selectionchange.

Additions: state, subscribe, mediaInfo, typed high-level events, feature
availability, open(string | URL | RemoteSource), AbortSignal open options,
setVolume(0–1), setMuted, setPlaybackRate, stable public track selections, close,
assetBase. These are additive; legacy volume and rate units do not change.

## State and events

state is a deeply frozen snapshot. Its identity remains unchanged until a value
changes. subscribe(listener) calls the listener immediately and returns an
idempotent unsubscribe. Updates happen before subscribers and high-level events.
Ordinary backend property bursts are coalesced in a microtask, with no new worker
polling. Subscribers must not throw; observer failures do not change playback.

status describes observed idle/paused/playing/buffering/ended/error state;
playbackIntent describes requested play/pause independently. pendingOperation has
an increasing instance-local ID and opening/seeking/switching/closing kind.
activeMode is null without accepted media. Legacy mode remains the configured
route while idle. Candidate events never replace accepted state. Failed
replacement reports an operation error and preserves a working session.

Seconds are used throughout. Unknown duration and ranges are null; [] means
known empty. Byte-cache statistics are never converted into buffered time.
Native ranges use the browser timeline translated out of remux bias. mpv
buffered time is unknown; seek ranges use observed demuxer seekable ranges for
live sources, and confirmed demuxer seekability plus duration for VOD. An unknown
live window disables a finite seek slider. Container duration may include subtitle
events after audiovisual samples end. A target inside that reported duration is
not proof of subtitle-only presentation support: if the current engine restarts
the seek at demux EOF and clamps its audiovisual position before the target,
`seek()` rejects with `INVALID_ARGUMENT` and restores the prior position and
play/pause intent. Duration and subtitle events are retained. This is a seek
presentation limitation, not a codec failure, and does not trigger codec fallback.
A successful seek also checks the runtime position after frame presentation;
the requested clock value alone is insufficient. mediaInfo includes display geometry,
source rotation when reported, display aspect and selected streams; absent
metadata stays null. No UI needs mpv property names.

High-level event detail contains the committed state. Source acceptance emits
sourcechange; subsequent changed fields emit durationchange, trackschange,
capabilitieschange, volumechange, ratechange and timeupdate. play expresses
accepted play intent; playing requires observed playback progress, waiting
observed starvation, pause observed pause, ended EOF. seeking precedes the
backend seek; seeked occurs only after native seeked or mpv presentation settles.
statechange follows snapshot publication. modechange retains loading/ready/failed
candidate phases and selectionchange retains route-attempt detail.

## Completion, cancellation and ownership

open resolves after an accepted paused session loads and its initial output is
ready. File references are retained; ArrayBuffers are copied and limited to
32 MiB. Remote options are copied. open accepts {signal}; abort before acceptance
cancels inspection/candidate work and preserves the previous usable session.
Abort after acceptance has no effect. Caller-owned text-track URLs remain alive
until close/source replacement. Fonts have existing bounded instance budgets.

play resolves when the backend accepts playback, not at the first time update.
Call from a user gesture; resume is initiated in that gesture when no operation
is pending. Autoplay denial is AUTOPLAY_BLOCKED and never triggers codec fallback.
pause resolves at observed pause. seek resolves after output settles; it does not
interrupt active packet reads. There are at most 32 pending core operations.
Controls preview scrubbing locally and submit a seek on release.

close aborts older queued/in-flight operations, disposes media-specific resources
and attachments, and leaves a reusable idle instance. It retains configured
volume/mute/rate, mode policy, filters, tone mapping, output policy and bounded
fonts. destroy is terminal and idempotent, cancels work, disposes all instance
resources and removes owned DOM. Pending promises reject predictably. Await
cleanup before discarding the owner.

Stable track IDs are scoped to a source generation and mapped to backend IDs.
Source stream indices preserve identity across routes where reported. External
subtitle files use a separate attachment namespace: their demuxers can share the
same stream index. Replaying the retained attachments preserves their track IDs. Identity
that exists only within a backend cannot be guessed across Native/mpv routes;
explicit selection causes an unsupported-transition rejection. New source IDs
invalidate previous IDs. null means disabled; 'auto' delegates initial selection.
Legacy selectTrack retains its documented backend-ID contract.

Errors are PlayerError with code, operationId, operation, scope, retryable and
redacted message. Session errors alone populate state.error. Failed controls or
replacement errors are operation-scoped. Codes: INVALID_ARGUMENT, ABORTED,
AUTOPLAY_BLOCKED, SOURCE_PERMISSION, SOURCE_CHANGED, NETWORK_TIMEOUT,
UNSUPPORTED_MEDIA, UNSUPPORTED_TIMELINE, UNSUPPORTED_FEATURE, ASSET_LOAD_FAILED, ISOLATION_REQUIRED,
DECODE_FAILED. Normal events/diagnostics redact authorization fields, URL userinfo,
queries and fragments; raw mpv properties remain an advanced inspection surface.

## Using normalized state

```ts
const player = new Player(host, {assetBase: '/assets/demuxe/'});
const unsubscribe = player.subscribe(state => {
  render({
    status: state.status,
    seconds: state.currentTime,
    duration: state.duration,
    seekWindow: state.seekable,
    audio: state.audioTracks,
    subtitles: state.subtitleTracks,
    aspect: state.mediaInfo.aspectRatio,
    seek: state.capabilities.features.seek,
  });
});
await player.open(file, {signal});
await player.selectSubtitleTrack(player.state.subtitleTracks[0]?.id ?? null);
await player.setVolume(.75);
await player.setMuted(true);
await player.close();
unsubscribe();
await player.destroy();
```

state.volume is normalized 0–1, configured independently from mute. Legacy
properties.volume still reflects backend 0–100 output, including zero while
muted. subtitlesVisible exposes the retained visibility setting independently
from the selected subtitle identity. player.capabilities includes legacy booleans,
deployment flags and feature availability; the same object is in the snapshot.
Feature availability describes request/route eligibility, not a guarantee that
an untested codec, asset or output device will work. Source-specific timeline and
track availability remain unknown until established.

The core emits structured operation errors for failed queued controls, while
synchronous legacy argument validation throws PlayerError. Rejected opens due
to invalid arguments or a signal already canceled may reject without an event;
callers must catch returned promises. Observer exceptions are reported through
the browser's error reporting and cannot veto a committed session. Close reserves
one teardown slot beyond the 32 ordinary pending-operation limit, so a full queue
cannot prevent cleanup. Browser resume requests initiated during another queued
operation may require a fresh user gesture when that operation completes.

Native exposes display dimensions; source rotation/codec metadata can remain null
when the browser does not report them. Its selected video entry is an opaque
source-scoped identity and does not imply a browser video-track switching API.
Live mpv seek windows use the demuxer's reported cached seekable timestamps; a
byte cache alone never creates a buffered-time claim. High-level time/state
notifications reuse backend events; only existing seek/presentation settlement
and engine health mechanisms retain their preexisting polling.

## Experimental playback optimizations

`experimentalBufferedNativeSeeks` and `experimentalHybridAudioFilters` are opt-in
constructor options, both false by default. Hybrid currently admits only scalar
`volume=N` / `lavfi=[volume=N]` attenuation for N in [0, 1]. Other filters retain
Software routing or explicit-mode rejection.

`audioGain` (default 1) and `setAudioGain(value)` request experimental scalar
attenuation in [0, 1]. All three modes use a dedicated, lazy Web Audio gain stage.
The setter updates that stage in place, preserving the engine, source, position,
and pause intent. Hybrid/Software gain follows the mpv PCM output without changing
the user audio filter chain. Ordinary volume and mute remain separate. Unity on a
fresh player allocates no gain stage; restoration retains an existing stage.
Transactional replacement is reserved for backends without an in-place gain method.
Diagnostics expose `plan` and `audioGain`; feature capabilities include `audioGain`.
See [current qualification and limitations](OPTIMIZATION-COMPLETION.md).

### Experimental selected-audio FLAC preparation

`experimentalAudioAdaptation: 'flac'` enables explicit Native trials after ordinary
Native/direct or packet-copy audio is unsuitable. It does not enable automatic
adaptation. The optional separately built preparation assets must be packaged.
The tested subset is integer PCM16/24 mono/stereo at 44.1/48 kHz; unsupported
precision/layouts reject instead of quantizing, downmixing or resampling. Video
packets are copied. No Opus permission is implied. It supports the separately
requested `audioGain` operation and external Native ASS, including their combination.
Long unequal tails have a separate qualified experimental FLAC path for desktop
Chrome, H264 and PCM16/24. It preserves the final video image while longer audio
continues, and silence after shorter audio ends. Distant seeks regenerate bounded
real preroll. Firefox rejects this Native timeline with `UNSUPPORTED_TIMELINE`;
use an eligible mpv route. On Firefox, a distant seek after video EOF can
recover from Hybrid through Software, with the failed seek disclosed in diagnostics.
Use Software explicitly when continuous ASS behavior through a Firefox video-EOF
audio tail is required; that Hybrid combination is not qualified.
Opus long tails remain unsupported. See the
[current qualification and reproductions](../results/optimization-final/README.md).

### Automatic lossless adaptation policy

```js
const player = new Player(container, {automaticAudioAdaptation: 'lossless'});
await player.open(file);
```

This optional policy permits Native FLAC only for inspected local Matroska with
H264 up to 1080p and selected 48 kHz PCM16/24 mono/stereo audio, with established
selected-track starts and ends within 50 ms. Original direct/copy playback remains
preferred. Unsupported sources retain eligible Hybrid/Software alternatives;
explicit modes remain authoritative. Selecting a different audio track repeats
admission while preserving its source identity and user intent. External Native
ASS and gain use their existing options and must form a supported complete plan.

This does not enable Opus, resampling, downmixing, embedded Native subtitles,
remote automatic adaptation or streaming adaptation. FLAC preserves admitted
integer decoded samples; it does not restore an earlier lossy recording.
Diagnostics disclose rejected alternatives and the accepted transformation.

### Experimental Native ASS/SSA

Set `experimentalNativeASS: true` to use external ASS/SSA with Native direct,
remux or qualified FLAC playback. Use the existing `addSubtitle(file)`,
`addFont(file)`, `selectSubtitleTrack(id)` and `subtitleVisible(value)` methods.
Fonts added before opening avoid a later transactional font refresh. Attachments
are source-scoped and reset on opening a new source. Source-scoped external IDs
follow attachment order across Native and mpv; they are distinct from embedded
stream indices. Other subtitle formats and embedded ASS still require mpv.

Install the optional libass assets using the package asset-copy command from a
package built with `--ass-build`. This feature requires cross-origin isolation.
Use container fullscreen; video-only fullscreen, PiP and casting cannot carry the
external overlay. Native PiP/remote-playback controls are disabled for this plan.
See [current coverage and limits](OPTIMIZATION-COMPLETION.md).

### Experimental selected-audio Opus preparation

`experimentalAudioAdaptation: 'opus'` requires `allowLossyAudio: true` and explicit
Native mode. It is a separate profile, never a fallback from failed FLAC. The
qualified input subset is copied H.264 video with selected PCM16/24 mono/stereo at
48 kHz. Other sample rates/layouts/codecs reject; permission to encode lossily does
not authorize resampling or downmixing. Original compressed audio remains preferred
when it can be copied. Opus+gain is supported; Opus+Native ASS is not admitted.
The matching optional preparation engine includes the pinned FFmpeg Opus encoder.
No sample-exact claim applies to Opus. See the current coverage document for delay,
padding, timestamp and marker tests and the unresolved long-tail limit.

### Complete-plan admission diagnostics

`diagnostics.plan` identifies the accepted internal plan without adding a public
mode. `diagnostics.planAdmission` lists finite candidates with `eligible`, typed
rejection `code`, and `reason`. Eligibility is permission to attempt the plan;
actual codec preparation and meaningful startup readiness/output must still succeed.
`diagnostics.runtimeCapabilities` adds source-scoped `untested`, `probing`, `verified`,
and `failed` evidence for those same plans; it does not add modes or controls.
See [runtime capability discovery](runtime-capability.md).
Automatic routing retains Native copy, authorized qualified Native FLAC, eligible Hybrid, then Software. It
uses requested effects, source inspection, selected tracks, transport constraints
and browser prerequisites. The experimental adaptation option remains explicit-only;
automatic FLAC uses the separate lossless policy above. Route ranking
does not use prototype benchmark percentages. Explicit mode selection remains
authoritative. In-place gain updates refresh plan diagnostics without rerouting.

### Plain external WebVTT

`addSubtitle(file, {select, label, language})` can retain Native A/V for plain UTF-8 WebVTT on file presentations. Admission excludes cue settings, markup, CSS, regions, identifiers and timestamp maps; richer files use the existing admitted renderer. Malformed admitted plain cue timing and invalid UTF-8 reject without replacing the working source. Browser-loaded cue count, text and timestamps are verified. Captions retain external track identities and are cleared on source replacement. Manifest timelines and adapted-audio combinations require separate qualification. See [component routing and evidence](COMPONENT-ROUTING.md).
