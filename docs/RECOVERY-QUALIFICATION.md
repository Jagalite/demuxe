<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Hover and source-scoped network recovery qualification

Base inspected: `e8542ccb79752d0e3869273ba09f91aa3158a0ae`.
This change does not publish a release, move the live demo, or change Wasm
seek-restoration routing.

## Confirmed fixes

The scrubber retains source/owner/time intent independently of an in-flight
request. Buffering suspends generation and cancels that request without losing
intent. The eligibility edge retries the latest hover once, including the
settled Demuxe refinement. Source replacement, pointer leave/cancel and destroy
retire the intent and all late frames. A cache miss does not form a retry loop.
The real element forwards its updated timeline eligibility to this reducer.

Shaka recovery observes the actual `retry` event and the lifetime of each
logical `NetworkingEngine.request()` operation. It returns the identical Shaka
PendingRequest and does not reschedule retries or alter abort behavior. The
source-local adapter correlates `downloadfailed` with `retry`, including Shaka's
connection/stall timeout normalization. Retry cancellation is observed after
all event listeners run. Concurrent requests, delays, exhaustion, late results
and disposal are covered independently. The public contract is documented in
[PUBLIC-API.md](PUBLIC-API.md#source-scoped-network-recovery).

The adapter is pinned to the event/request semantics of Shaka **5.2.11**:
[request lifetime and retries](https://github.com/shaka-project/shaka-player/blob/v5.2.11/lib/net/networking_engine.js),
[download event contract](https://github.com/shaka-project/shaka-player/blob/v5.2.11/lib/player.js).
The real-runtime browser tests must continue to pass when that dependency changes.
These observations do not cover application-managed authorization refreshes or
other playback transports.

## Repeatable tests and evidence

`tests/scrubber-preview.mjs` includes negative-before-fix regressions for a
stationary hover, stale completion, latest intent during suspension, and each
retirement boundary. `tests/shaka-recovery.mjs` checks the logical operation
contract and exhaustively replays all command traces through depth five.
Existing Shaka backend/network, scrubber and transport tests remain in the API
gate. `tests/demo-identity.mjs` rejects stale assets, changed pins and unsafe paths.

The maintained **Streaming recovery and replay** workflow runs Chromium and
Firefox against generated HLS media. It retains JSON evidence and request logs.
To reproduce the additional cases after building and preparing Shaka:

```sh
mkdir -p build
HEADLESS=1 BROWSER=chromium ONLY='recovery qualification' \
  OUT=results/streaming-recovery/chromium node tests/shaka-lifecycle.mjs
HEADLESS=1 BROWSER=firefox ONLY='recovery qualification' \
  OUT=results/streaming-recovery/firefox node tests/shaka-lifecycle.mjs
```

The 48-second fixture plays through naturally at 2x; the test never seeks near
the end or manually removes buffers. It requires a positive real buffered
start before natural end, a new request for the evicted first segment on replay,
source identity retention, video output and an audible 440 Hz signal. This
qualifies eviction/replay correctness, not a multi-hour endurance or memory test.

The teardown case closes during an observed real retry, then opens a different
880 Hz source. It requires the old analyzer to be silent, the old surface paused
and disconnected, no old requests beyond two configured backoff intervals, no
late errors or old source IDs, and an idle recovery state on the replacement.
The cases explicitly request adaptive quality policy so browsers with native HLS
support cannot silently bypass Shaka. A close/publication regression also prevents
queries to an already-retired backend while the closing barrier still retains it.
A separate transient-outage case requires a real retry to return to idle without
a terminal error. All cases assert worker, surface and owned-Blob cleanup.

## Wasm restoration investigation: inconclusive, production unchanged

The characterization in `tests/api-stability/player-transport-state.mjs` confirms
that an ordinary streaming seek failure restarts routing at zero, while a failed
boundary restoration lacks the streaming fact. With Hybrid it starts at two
(or one with provider preferences); ordered Software starts at one. The
restoration command has no streaming field, and its pending work does not
retain that fact. This is a control-flow difference, not proof of playback loss.

A successful earlier route would still have to satisfy the exact failed
source's manifest, authentication, representation, selected tracks, feature
requirements, deployment and already-failed-route exclusions. For example,
`planAdmission` rejects Shaka for unsupported PCM output, non-WebVTT external
attachments, unavailable MSE, or a source-specific Shaka rejection; cooperative
private playback does not admit manifests at all. Rewinding the index alone
cannot make these alternatives usable.

The new browser fixtures exercise a usable Shaka route independently, but do
not reproduce the same source after a Wasm seek and compensating restore both
fail. No matching Wasm playback failure/usable alternate pair was established
in this investigation. Accordingly **`player-transport.ts` is unchanged**.
Before changing it, retain the exact failing stream and source options, cause
both failures in a real Wasm backend, demonstrate successful output at the
requested target on an earlier eligible route, and then add a regression that
fails under the current routing. A mocked successful backend is not that evidence.

## Demo status

The existing hosted demo is explicitly labeled as an older pinned development
demo in the README and [Pages documentation](PAGES.md#public-demo-pin). Its
manifest identity is pinned separately from the current source package version.
Read-only asset verification does not claim live playback qualification. The
Pages smoke suite now verifies fetched asset bytes against the same manifest
recorded with its playback results; newly assembled pages visibly show their tag.
