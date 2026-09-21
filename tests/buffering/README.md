<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Buffering qualification

Build with `npm run build`. Fixtures are the immutable H.264/AAC normal/high/long
movie derivatives prepared by
`research/items/mpv-cache-browser-stream/tests/prepare.py`; their manifest records
encoding commands, source hashes and independent FFmpeg RGB references. Media is
Big Buck Bunny, Blender Foundation, CC BY 3.0; see that item's NOTICES.md.

Run one media suite at a time so CPU and network evidence are not contaminated
by another Demuxe qualification process:

```sh
STAGE=qualification node tests/buffering/run.mjs
BROWSER=firefox STAGE=qualification node tests/buffering/run.mjs
STAGE=baseline node tests/buffering/run.mjs
STAGE=profiles PROFILE_FIXTURE=high RTT_MS=0 node tests/buffering/run.mjs
STAGE=seeks ONLY=high node tests/buffering/run.mjs
node tests/shaka-lifecycle.mjs
BROWSER=firefox node tests/shaka-lifecycle.mjs
```

`ONLY` is a comma-separated substring filter on case IDs. `screen` is a short
startup/seek/lifecycle matrix. `profiles` covers none/low-latency,
metadata/balanced, auto/resilient for each file backend, including independent
pictures at 10 and 30 seconds. The default qualification matrix covers balanced
without a buffering option; Native uses the literal zero-option constructor.
Two additional cases exercise 8 MiB and 64 MiB memory budgets. Resilient/64 MiB high-bitrate trials at zero RTT must actually fill beyond the balanced forward allocation. Shaka's suite covers adaptive, live, lifecycle, and the same profile/preload pairs.

The controlled Range server uses aggregate throttling, no-store, and 75 ms
request latency by default (`RTT_MS=0` selects the stable local comparison). Media phases are sequential: 6 s fast, 6 s at 1.05× nominal
bitrate, 18 s outage, 6 s fast recovery. At 2× playback, near-media-bitrate
bandwidth is intentionally below consumption. Request latency plus bounded
single-flight reads can also constrain effective throughput on high-bitrate media.
This measures the actual bridge, not just the nominal token-bucket setting.

Seeks use public `Player.seek()`, which awaits the existing target-readiness
contract. Current runner measures ±2, ±5, ±15 and ±30 seconds relative to the
actual preceding position, plus a distant seek. Earlier retained runs selected
40±distance absolute targets in sequence; their actual distances must be derived
from `before.state.currentTime`, not the old labels. They remain regression
and lifecycle evidence, with exact-distance supplemental runs recorded separately.

The `baseline` test overrides only the internal cache option, before source open,
to reproduce historical cache=no with the same current decoder and bridge.
This is test-only; no public expert command or opt-out is introduced. Therefore
it isolates caching without confounding the new outage-retry window.

Every run has a unique directory in `results/buffering`, copied source, hashes,
full sampled state/diagnostics, control phases, browser version, requests and
seek/cleanup evidence. The first-frame field is a 100 ms source-progress/render
proxy; it is not a photon measurement. CPU uses Chrome CDP process CPU time or
Firefox process-tree `ps` time, excludes the server, and is not power consumption.
Wasm heap bytes are committed linear memory; allocator peak is unavailable.
Newer snapshots also sum observed current/candidate heaps to capture transactional
overlap. This excludes unobserved probe allocations, so it is not total process memory.
Server writes can exceed delivered bytes on cancellation. Never convert byte
LRU measurements to playable seconds. Post-close and post-destroy assertions
require zero active responses, workers and surfaces, closed owned AudioContexts
and released retained frames when reported; replacement and reopening
exercise the same Player instance.

```sh
python3 tests/buffering/analyze.py results/buffering/RUN/results.json > metrics.json
node tests/buffering/index.mjs
```

The index records source/runtime hashes, raw-result hashes, and every trial outcome,
including failures. Rebuild it after completed follow-ups; it does not modify raw
runs or replace the qualification report. Interrupted phases remain analyzable.

Metrics distinguish network phases from later seeks/reopens. Duplicate bytes
across the entire lifecycle include intentional source reopens. Raw request body
write offsets allow narrower interval analysis. Failed trials are retained;
review the validation report before generalizing any passing run.

For an immutable executable snapshot and the final Remux reporting regression:

```sh
node tests/buffering/freeze.mjs
BUFFERING_RUNTIME=results/buffering/runtime-NEW BROWSER=firefox STAGE=qualification FIXTURES=high ONLY=high-remux-2 ASSERT_REMUX_WAITING=1 node tests/buffering/run.mjs
```

The analyzer separately reports clock freezes lasting at least 750 ms. A browser
status counter alone is insufficient: the original Firefox Remux run retained
playing while the media clock stopped. The focused regression requires actual
starvation to become public buffering and the clock to recover afterward.
