# Custom preview sampling

Use `player.preview.setStrategy({type: 'custom', sample})` or pass the same
strategy in `PlayerOptions.preview.strategy`. Built-in strategies remain available;
the player element displays a custom strategy as Custom.

```ts
player.preview.setStrategy({
  type: 'custom',
  sample: ({ duration, focus }) => {
    const center = Math.floor(focus);
    const times = [center];
    for (let distance = 1; distance <= 15; distance++) {
      times.push(center + distance, center - distance);
    }
    return times.filter(time => time >= 0 && time < duration);
  },
});
```

`PreviewSampler` receives a frozen `PreviewSamplingContext` containing:

- `duration` and `focus`, in seconds. Hover temporarily takes priority over playback.
- `bucketSeconds`, the cache quantization interval.
- `cachedTimestamps`, resident requested buckets for the 240 × 135 background preview size.
- `budget`: `maxEntries`, `maxBytes`, `usedEntries`, `usedBytes`,
  `availableEntries`, and `availableBytes`. Usage covers the whole preview cache.

Return a synchronous array of at most 256 finite timestamps in `[0, duration)`,
in priority order. Return the desired working set, including already cached times;
Demuxe skips resident buckets and deduplicates without sorting. It bounds the working
set by entry capacity and a conservative byte-capacity estimate from resident images.
An empty array does no work this cycle. Throws, promises, and invalid arrays are ignored.
Keep the callback fast and free of side effects: it runs on the main thread and cannot
be preempted. Precompute scene analysis elsewhere and return its timestamps here.

The callback is evaluated on eligible background scheduling ticks, approximately
500 ms apart after each request completes. Requests are serialized, foreground work
has priority, and playback protections still apply. Unknown duration, disabled previews,
source changes, and strategy replacement retain their existing lifecycle behavior.

Eviction remains owned by Demuxe: background inserts evict only background entries;
foreground cache hits promote entries, and foreground inserts can evict the oldest
entry of either kind. The callback does not pin images or control eviction. An evicted
custom sample becomes eligible on the next tick if it is still in the desired set.
Failed or uncacheable requests can be retried on later eligible ticks; a sampling
function should use the budget to keep its requested working set modest.
Adaptive sampling also reconciles its visited history with resident buckets when
focus changes, allowing local samples evicted since an earlier visit to be regenerated.

## Pure interaction-aware policies

`context.interaction` supplies an immutable snapshot so the sampler does not need
mutable history or its own clock:

- `source`: `hover` for foreground preview requests (including timeline scrubbing
  and cache-only lookups), otherwise `playback` for the fallback preview focus.
- `velocity`: signed media seconds per real second between focus observations.
  Positive means forward, negative means backward. It resets on focus-source changes
  and becomes zero after 500 ms without movement. It is observed focus movement,
  not decoder throughput; seeks may produce large values.
- `dwellMs`: elapsed time within the same focus bucket and focus source. It resets
  on bucket changes and source replacement. With bucketing disabled, exact focus
  changes reset dwell. Hover requests retain priority for 1500 ms after the last
  request, then sampling falls back to the latest playback position.

Keep algorithms pure: return the same timestamps for the same context. For example,
a hover-only policy can return `[]` when `interaction.source !== 'hover'`, and a
refinement policy can add finer samples once `interaction.dwellMs >= 300`.
Demuxe supplies timing and resets history; these values only schedule preview images
and do not control mpv, codec buffering, or playback packet prefetching.

## Gaussian and directional presets

These presets use the same pure sampling context and bounded preview lane as a
custom callback. Both appear in the player's Thumbnail strategy settings.

```ts
player.preview.setStrategy({type: 'gaussian'});
// Defaults: samples: 25, every: 1, radius: 30, sigma: 10

player.preview.setStrategy({type: 'directional'});
// Defaults: samples: 25, every: 1, radius: 30, lookAhead: 0.5
```

Gaussian chooses deterministic equal-mass quantiles from a normal distribution on
a stable time grid, truncated to the local radius and video boundaries. This changes
sample density: there are more locations near the focus and fewer in the tails.
`sigma` is the standard deviation in media seconds. It does not draw random samples
or merely sort a uniform list by Gaussian scores. The current grid location has
first priority, followed by selected locations nearest the distribution center.

Directional uses the same distribution with standard deviation `max(every, radius/3)`.
For hover input, it shifts the distribution center by `velocity * lookAhead`, capped
to half the radius in either direction. `lookAhead` is in real seconds. Faster movement
predicts farther ahead, reversal changes the bias, and the current focus remains
first. Stationary input and playback fallback use a centered distribution. These are
bounded heuristics, not predictions learned from user data. Existing foreground
priority and playback pressure can defer all speculative generation.

Both produce at most `samples` locations on an `every`-second grid (or the cache
bucket spacing when larger). Rounding to the grid, repeated quantiles, small caches,
and video edges can reduce the count. They cover a local window, not a reserved
whole-video storyboard, and do not pin cache entries. Defaults are initial tuning
choices, not performance-qualified optimal values. The existing Adaptive default
is unchanged.

Limits: `samples` is an integer from 1 to 256; `every` is finite and positive;
`radius` is 0–3600 seconds and `radius / every` must not exceed 2048.
Gaussian `sigma` is positive and at most 3600 seconds. Directional `lookAhead` is
0–5 seconds. Invalid configurations fail atomically before replacing the strategy.

## Demuxe strategy

```ts
player.preview.setStrategy({type: 'demuxe'});
```

Demuxe combines broad coverage and local detail. It reserves up to 24 storyboard
locations, using at most one third of the estimated cache entry capacity. These
locations span the whole video and are retained ahead of local entries during
normal eviction. Entry and byte limits still take precedence; explicit unload,
clear, source changes, and budget reductions can remove any image.

The remaining working set contains up to 25 local normal-density samples within
30 seconds of focus. Above eight media seconds per real second of hover movement
(with bucket dwell below 300ms), the local grid becomes five seconds and predicts
0.5 seconds ahead, bounded to 15 media seconds. Slower inspection uses a one-second
Gaussian grid. These are initial heuristics, not research-proven optimal settings.

Background scheduling checks every 100ms and waits at least 100ms after a foreground
request. It remains serial, yields to foreground work and buffering, and obeys the
provider's playback restrictions. No playback buffering configuration is changed.

The player component shows the nearest resident image while the pointer moves,
then refines the target bucket after 180ms without a pointer move. Its timestamp
label identifies the represented image. This is bucket-level refinement, not a
promise of exact decoded PTS. Leaving the timeline or destroying the component
cancels deferred refinement. Direct API callers still control their own requests.

Choose **Demuxe** in Thumbnail strategy, or open
`examples/player-element.html?preview=demuxe`. Adaptive remains the default.

`tests/preview-scenarios.mjs` compares the real Demuxe preset with the earlier
`demuxe-prototype` custom callback and the existing presets. Historical results
retain their original labels. The callback API stays stateless; retention,
scheduling, and presentation are owned by the controller and component.
