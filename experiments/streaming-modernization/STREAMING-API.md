<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Streaming API and migration draft

This describes the staged implementation. Promote it with the implementation only
after the combined qualification gate passes. The current evidence and unresolved
gates are in `docs/STREAMING-MODERNIZATION-STATUS.md`.

## Open and select quality

```ts
import {Player} from 'demuxe';

const player = new Player(container, {assetBase: '/assets/demuxe/'});
await player.open({
  url: 'https://media.example/master.m3u8',
  format: 'hls', // use 'dash' for an MPD
  streaming: {qualityPolicy: {mode: 'manual'}},
});
await player.play();

const quality = player.state.quality.qualities.find(q => q.height === 720);
if (quality) await player.setQuality({mode: 'manual', qualityId: quality.id});
await player.setQuality({mode: 'auto', maxBandwidth: 4_000_000, maxHeight: 1080});
```

Manual startup chooses the lowest eligible rendition. Quality IDs belong to one
opened source; read them from its inventory and discard them on source replacement.
Bandwidth values and ceilings are bits per second. Resolution ceilings describe
representation dimensions. A ceiling limits eligibility; it does not request a
specific rendition or promise a network speed.

Manual selection is authoritative and turns Auto off. Restoring Auto is explicit.
`state.quality` reports requested, preparing, demuxed and presented IDs separately.
`setQuality()` accepts a request; it does not promise that the picture has already
changed. Subscribe to `qualitychange` or `statechange` and inspect `presentedId`.
A preparation failure retains the current rendition and reports `transitionError`.
A decoder or transport failure after acceptance follows normal playback error
handling. Aligned same-family switches preserve the ongoing mpv instance.

The optional `demuxe/player` element delegates to this same Player. It shows an
Auto/quality selector when the current source exposes an eligible quality inventory.
Fully custom applications continue to use the core Player without bundled UI.

## Live and final windows

The manifest/demux owner reports `state.streamType` and `state.seekable`. A live
window is not a forward playback-buffer measurement. An unknown window remains
unknown; applications should disable unavailable seeking rather than estimate it.

```ts
const window = player.state.seekable?.at(-1);
if (player.state.streamType === 'live' && window) {
  // The staged default resume policy uses six seconds behind available media.
  await player.seek(Math.max(window.start, window.end - 6));
}
```

Pausing does not move the playback position as the DVR window advances. Resuming
an expired pause seeks to six seconds behind the available end, or the beginning
of a shorter window. Explicit seeks outside the current window are rejected.
The staged recovery diagnostic/log records the reason and accepted target.
An integrated live window's end is exclusive. Seeking exactly to it is rejected
before interrupting any accepted seek; choose an interior target as above. The
component timeline and seek buttons share the six-second return-to-live target.
That headroom is an application policy, not a measured live-latency claim.

ENDLIST or a static MPD update makes the presentation finite. Its final retained
window stays authoritative, including a nonzero start; removed history does not
become seekable again. A caller's initial `streaming.live` hint cannot override a
known native final state. `duration` and the available window are separate from
measured network throughput and mpv's forward packet-cache duration.

## Compatibility and supported transitions

`streaming.representation` and top-level `streaming.maxBandwidth` retain fixed
compatibility selection when `qualityPolicy` is absent. They are not ABR. Combining
those legacy fields with `qualityPolicy` is rejected. Move an adaptation ceiling
inside `{qualityPolicy: {mode: 'auto', maxBandwidth: ...}}`; choose a fixed quality
with the source-scoped manual API after opening.

Native direct/remux remains unchanged without an explicit quality policy. A pinned
Native route rejects persistent mpv quality control. Hybrid and Software use the
same integrated native manifest/session subsystem and retain their existing
WebCodecs and software decoder paths respectively.

Current integrated admission targets aligned separated H.264/fMP4 ladders. HLS
uses its audio/subtitle groups, explicit discontinuity identities and WebVTT
mapping. DASH uses initialization-bearing SegmentTemplate with an explicit positive
SegmentTimeline; period transitions require contiguous timelines and matching
representation/track identities. Fragmented `mov_text` subtitles use the same
period map. Bounds reject excessive catalogs, malformed timestamps or exhausted
resource/cue budgets rather than treating them as successful completion.

The compatibility adapters remain available outside explicit persistent control.
A source requiring them can be reopened explicitly using fixed selection; that
reopen is not a seamless quality change. Negative DASH repeats, SegmentList,
changed track inventories/codec families across periods, raw DASH WebVTT without
initialization, stpp, LL-HLS, low-latency DASH and DRM are not claimed by this
integration. Safari/mobile and physical output require separate qualification.
