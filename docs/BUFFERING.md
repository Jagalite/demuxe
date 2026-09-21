<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Buffering policy and diagnostics

Demuxe buffering is enabled automatically. `balanced` is the default. Each
playback backend uses its own buffering implementation, configured by Demuxe
according to portable application intent. See [PUBLIC-API.md](PUBLIC-API.md#automatic-buffering)
for the constructor contract and profile table.

## Reading diagnostics

`player.diagnostics.buffering` is a plain data snapshot. For balanced Hybrid or
Software it resolves to:

```js
{
  requestedProfile: 'balanced', preload: 'auto', backend: 'mpv',
  control: 'profile', cache: true,
  forwardLimitBytes: 33554432, backwardLimitBytes: 8388608,
  settings: { /* applied mpv options and observed packet-cache properties */ },
  notes: [ /* packet budgets and independent memory owners */ ]
}
```

`settings` contains `demuxer-cache-state`, `paused-for-cache`, and
`cache-buffering-state` when observed. Cache state can expose forward bytes,
packet time ranges and total bytes. These are packet-cache diagnostics, not
presentation-ready buffered media. Backward use cannot always be measured
independently; total minus forward is only non-forward packet storage. Cached
backward seeks can reclassify retained packets as forward data, temporarily
putting observed forward bytes above the configured read-ahead target without
allocating a new cache. Packet granularity and unused-forward donation also
prevent interpreting either direction as an exact independent allocation cap.

Browser resolution reports `backend: 'browser'`, `control: 'hint'`, the requested
profile and effective preload intent. Browser profiles and byte limits are not
enforced. Shaka resolution reports its effective `bufferingGoal`,
`rebufferingGoal`, and `bufferBehind` without exposing a Shaka instance. Remux
resolution reports base forward/history targets, its coded-data ceiling, and
`settings.effectiveForwardSeconds`, playback rate and paused state. Direct
`settings.elementPreload` exposes the current browser hint, including temporary
metadata discovery during explicit open.

Keep these resource owners separate:

| Owner | Evidence | Meaning |
| --- | --- | --- |
| Source byte cache | `backend.io` / Remux `source` | Raw byte LRU and active read allocation, not seconds |
| mpv packet cache | `buffering.settings['demuxer-cache-state']` | Demux packets and packet timeline coverage |
| Video decode/presentation | `backend.decoderStats`, `backend.presentation` | Retained/queued decoded frames |
| Audio | `audioDiagnostics()` / `backend.queuedFrames` | Audio output ring and activity |
| Wasm memory | `backend.heapBytes` | Published engine committed linear memory, not whole-player or malloc peak allocation |
| Browser/Shaka playable media | `state.buffered` | Actual media-element playable ranges |

Transactional source/backend replacement can temporarily keep two engines alive.
A single published `heapBytes` value does not measure that overlap or probe heaps.
Workers are destroyed and owned AudioContexts closed on retirement.

mpv keeps its normal cache-secs/readahead/hysteresis/seekable-cache/cache-pause
strategy for auto preload. Only cache enablement and packet budgets change.
Bundled mpv 0.40 resolves cache-secs 3600000, readahead 1, hysteresis 0,
seekable-cache auto, cache-pause yes, cache-pause-wait 1. A time ceiling this large
does not allocate that much media: bounded packet bytes stop read-ahead first.
`none`/`metadata` use cache-secs 1 during initial preparation; play restores the
bundled normal value. Other mpv defaults remain untouched.

The [mpv manual](https://mpv.io/manual/stable/#options-demuxer-max-bytes) describes
packet-cache limits and [Shaka's buffering documentation](https://shaka-project.github.io/shaka-player/docs/api/tutorial-network-and-buffering-config.html)
describes its goals. Exact bundled defaults were also checked against the local
0.40 source snapshot and Shaka 5.2.11 `player_configuration.js`.

`state.status === 'buffering'` means observed waiting/starvation: browser events,
Shaka's buffering state, mpv paused-for-cache, or Remux's observed clock starvation near a playable edge with an outstanding producer. Remux exposes that fallback as `settings.waitingForMedia`; it requires at least 750 ms without progress and clears on progress, pause, seek or generation change. Background downloading alone
does not imply buffering. `null` remains unknown; `[]` remains known empty.

## Qualification

See [BUFFERING-VALIDATION.md](BUFFERING-VALIDATION.md) for fresh production-candidate
runs, failed trials, fixes, limitations and reproduction commands. The prior
[cache experiment](../research/items/mpv-cache-browser-stream/REPORT.md) remains
immutable supporting evidence; its 24/16 rewind trial is not the balanced default.
