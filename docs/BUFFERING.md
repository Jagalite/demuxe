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
| mpv packet cache | `state.cached` / `buffering.settings['demuxer-cache-state']` | Resident demux packet timeline coverage, not decoded/playable frames |
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

## Runtime policy and unified reporting

The same `BufferingOptions` apply at construction and at runtime:

```js
await player.setBuffering({
  profile: 'resilient', // low-latency | balanced | resilient
  preload: 'auto',     // none | metadata | auto
  aheadSeconds: 30,
  behindSeconds: 10,
  memoryBudget: 32 * 1024 * 1024,
});
const {requested, effective, capabilities, buffered, cached} = player.getBuffering();
```

`setBuffering` replaces the policy: omitted fields reset to defaults. It is serialized
with other player operations and does not reopen the source, seek, change playback
intent, or initiate a mode switch. The policy persists across subsequent sources and
backend changes. An invalid policy rejects before applying; a backend failure triggers
an attempt to restore the previous policy. If restoration also fails, the operation
rejects with an explicit partial-application error. Older externally deployed remux
providers without the runtime setter reject with `UNSUPPORTED_FEATURE`; consult
`capabilities.runtimeUpdate` before offering a live control.

| Control | Native browser | Remux | mpv | Shaka |
|---|---|---|---|---|
| Preload | Browser hint | Limits paused speculative work | Limits preparation readahead | Limits preparation goal |
| Profile | Hint only | Time/byte targets | Packet byte budgets | Buffering goals |
| Ahead/behind seconds | Not applied | Applied as targets | Not applied | Applied as targets |
| Memory budget | Not enforceable | Coded-data ceiling | Packet budget ceiling | Not enforceable |
| Manual video ranges | Not exposed | Not exposed | Not exposed | Not exposed |

Ahead time must be greater than zero and at most 120 seconds; behind time is 0–120
seconds. The existing 8–64 MiB memory-budget range remains. Targets are subject to
fragment/keyframe granularity and backend limits: Remux caps its coded-data ceiling
at 12 MiB and scales forward time above 1x playback; non-auto preload uses a smaller
paused/preparation target. These are not total browser/decoder-memory caps. At the coded-data ceiling, Remux may shorten requested history to preserve forward
progress, evicting at safe GOP boundaries and waiting for SourceBuffer completion.
Reducing limits does not promise immediate release of all resident data. If the
protected decode interval itself exhausts the budget and playback runs out of forward
coverage, Remux reports a budget failure rather than removing required reference
frames or waiting indefinitely.

`getBuffering()` returns a detached, frozen snapshot. `requested` retains user intent,
including unsupported controls; `effective` describes the active adapter's policy and
settings. Capability flags identify supported controls, not strict timing or memory
guarantees. `buffered` reports playable ranges and `cached` reports packet-cache ranges;
`null` means unknown, while `[]` means known empty. Before opening a source, `active`
is false and the reported resolution is provisional.

Video policies and thumbnail strategies have independent scheduling and budgets.
This API unifies existing controls; profiles do not dynamically predict network health.
Adaptive tuning, explicit range fetch/release, and full-file/offline downloads are not
implemented by this API and must not be advertised as supported strategies.
