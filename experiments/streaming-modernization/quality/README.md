<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Source-scoped quality API (staging)

This overlay is separate from the native integration and its qualification.
`prepare.py --quality` applies both. No root release code is replaced.

```ts
await player.open({
  url: 'https://media.example/master.m3u8',
  format: 'hls',
  streaming: {qualityPolicy: {mode: 'auto', maxHeight: 1080}},
});
const quality = player.state.quality.qualities[0];
await player.setQuality({mode: 'manual', qualityId: quality.id});
await player.setQuality({mode: 'auto', maxBandwidth: 4_000_000});
```

`qualityPolicy: {mode: 'manual'}` opts into the persistent subsystem with
conservative initial selection. Select a discovered source quality after opening.
The optional component delegates `setQuality()` to the same Player and displays
Auto/quality choices only when the current source/route exposes them.

`state.quality` distinguishes requested, preparing, demuxed, and presented IDs.
Only an actual drawing acknowledgement changes presented quality. `qualitychange`
uses the existing state event model, and `capabilities.features.quality` describes
availability. IDs expire with the source; FFmpeg stream IDs are not public IDs.
A manual request disables automatic adaptation. An application can restore Auto
explicitly, with optional bandwidth/resolution ceilings. These are eligibility
ceilings, not a claim about actual bandwidth or a fixed rendition.

Legacy `streaming.representation` and `streaming.maxBandwidth` retain their fixed
compatibility-selection behavior when `qualityPolicy` is absent. Combining them
with `qualityPolicy` is rejected so initial/fixed selection and adaptation ceilings
cannot have ambiguous precedence. Native direct/remux behavior is unchanged when
quality control is not requested. A pinned Native route rejects a request for
persistent mpv quality control rather than silently ignoring it.

The original quality archive covers finite aligned separated H.264/fMP4 ladders.
The later live, DASH, discontinuity, subtitle and timeline overlays extend this
same API; see `docs/STREAMING-MODERNIZATION-STATUS.md` for their separate evidence.
An explicit quality policy rejects an unsupported manifest transactionally.
No experimental archive is release-qualified by this API document.

## Evidence and boundaries

The component quality selector delegates to `Player.setQuality`; it neither
selects FFmpeg tracks nor restarts playback. Auto is shown only when the accepted
source/route advertises quality selection. The status distinguishes requested and
presented quality. Source replacement invalidates old quality IDs. Turning Auto
on is explicit; a manual selection turns it off.

`component-quality-chrome-01` passes four actual-playback cases on archive 03.
`component-quality-firefox-02` passes four cases on archive 04, including Escape
focus restoration and source replacement. The earlier Firefox capture failure is
preserved; continuity is now measured separately from paused screenshots.
`audio-relay-chrome-01` and `audio-relay-firefox-01` pass all four cases with an
injected 750 ms rendering-worker stall. This demonstrates independent PCM relay
and cleanup; it is not a physical output latency or device qualification claim.

Source-scoped quality IDs are opaque and must not be stored for another open.
`streaming.representation` and `streaming.maxBandwidth` retain their legacy fixed
initial-selection behavior without `qualityPolicy`; they are not ABR. Combining
legacy selection with the new policy is rejected to avoid ambiguous precedence.
An Auto ceiling is an eligibility limit; it is not an initial or fixed selection.
An initial manual policy starts conservatively, after which applications select
an ID from the accepted source inventory.

The original integrated scope requires aligned, separated H.264/fMP4 ladders
with known bitrate metadata. Later native overlays add live/DVR and period
replacement under the same ownership and quality API. Existing compatibility adapters remain active
outside the opt-in integration; these documents do not advertise those adapters
as continuous adaptation.

`verify-evidence.py` requires direct public API, component, long ABR, and injected
relay-stall matrices from Chrome and Firefox, all bound to one runtime SHA-256.
It rejects missing cases, worker leaks, mismatched archive/harness bytes, missing
presented transitions, wrong source identity behavior, and continuity failures.
This evidence gate supplements clean engine builds, source companion verification,
transport/deadline tests and the original release suites. It cannot authorize
release by itself, and its output always states `releaseQualified: false`.
