<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Remux runtime selection

`PlayerOptions.remuxRuntime` defaults to `'auto'`. It selects the FFmpeg runtime
used for source inspection, finite file remux, qualified FLAC24 audio
transcoding, qualified private mpv subtitle/PCM services, and cooperative
Software/Hybrid playback when its matching assets are installed. It does not force remux when browser-direct playback is suitable.

```js
const player = new Player(container, {
  assetBase: '/demuxe/',
  remuxRuntime: 'auto',
});
```

| Value | Behavior |
| --- | --- |
| `auto` (default) | Use pthread when `globalThis.crossOriginIsolated === true`; otherwise JSPI when both JSPI APIs exist, else Asyncify. |
| `on` | Enable a private runtime even on isolated pages: prefer JSPI, else Asyncify. |
| `off` | Disable private runtimes and retain pthread selection. Pthread routes still require isolation; browser-only playback remains available. |
| `jspi` | Require JSPI. Construction rejects with `UNSUPPORTED_FEATURE` if either JSPI API is unavailable. |
| `asyncify` | Select Asyncify regardless of isolation or JSPI support. |

Values are strings. The spelling is `asyncify`. `off` does not disable all
remuxing; `nativeRemux` is the separate remux policy. Runtime policy is set at
construction. Use a new Player to change it.

JSPI detection checks `WebAssembly.Suspending` and `WebAssembly.promising`.
Effective isolation is checked through `crossOriginIsolated`, rather than
attempting to read the document's response headers. These checks select a runtime;
they do not certify that a codec, route, engine asset, or browser can play a source.

`player.diagnostics.remuxRuntime` reports the requested policy, selected runtime,
isolation, and JSPI availability. This is selection evidence, not evidence that
an engine was loaded. Actual remux execution is recorded in the backend diagnostics.

The deprecated `experimentalRemuxRuntime` option still accepts `pthread`, `jspi`,
and `asyncify`; `pthread` maps to `off`. Supplying both old and new options rejects
with `INVALID_ARGUMENT`, even if their values might resolve to the same runtime.

## Routing and failures

Private runtime selection admits file remux, qualified FLAC24 transcode, and
embedded mpv subtitles (ASS/SSA, SRT, mov_text, PGS and VobSub). The native-video /
mpv-audio route additionally admits one 48 kHz stereo PCM16 stream. It uses
private Wasm memory, transferred PCM and acknowledged AudioWorklet consumption;
video remains browser decoded. Compressed audio, multichannel and resampling are
not admitted by this private mpv audio profile. Embedded subtitles can be combined
with the restricted audio route. All services use the same selected runtime.

External ASS/SSA, SRT and rich WebVTT can accompany automatic FLAC24
adaptation (`native-transcode-ass`) or explicit/automatic lossless FLAC
(`native-flac-ass`). The shared mpv subtitle service follows the browser media
timeline. JSPI and Asyncify work on isolated and non-isolated pages; only the
pthread build requires isolation. The PCM24
regression covers forced JSPI and Asyncify, rendered captions, audio/video output,
paused seek, visibility changes and cleanup (`node tests/private-adaptation-ass.mjs`).

Browser-direct, browser gain and Shaka retain their existing requirements.
The separate cooperative playback profile adds Software video decoding and Hybrid
browser video decoding with mpv audio. Its full assets support the qualified
finite-file codecs, resampling/downmixing, subtitles/fonts and filters described
in [non-isolated completion](NONISOLATED-PLAYBACK-COMPLETION.md), including the
completed Chromium/Firefox package checks. Selecting a runtime does not bypass source,
feature, asset or browser decoder checks. The restricted native-video/PCM service
above retains its own contract; see [private mpv Player qualification](PRIVATE-MPV-PLAYER.md).

Selection does not retry a failed JSPI engine using Asyncify. With `auto`, an
initial plain URL can still try browser Direct when optional private inspection
cannot load its assets or the server returns HTTP 200 instead of ranged 206. This
exception requires an eligible browser-direct route: explicit transport controls,
forced remux, selected tracks, and identity constraints are not bypassed. Required
engine failures and source permission/identity errors remain terminal. On a
non-isolated page, selection never falls back to a pthread engine.

Modular cooperative playback acquires its manifest, Wasm, glue and default font
through the deployment's verified provider loader. Verified glue is imported using
a temporary Blob URL; pages with an explicit Content Security Policy must permit
Blob module scripts for this modular path. The legacy package loader retains its
existing deployment behavior.

## Inspector preloading

`prepare(['inspector'])` loads and compiles the selected remux runtime. Private
inspectors and cooperative Hybrid/Software engines can be prepared without
isolation when the matching playback assets are installed. Pthread preparation
requires isolation. The compiled module is reused by source inspection and still
passes the worker's backend/ABI checks. Preparation creates no media workers.

## Assets and validation

Install the verified private builds using `scripts/install-private-remux.py` as
described in the [local integration guide](../experiments/jspi-asyncify/local/INTEGRATION.md).
Local beta assembly now requires and verifies both `engine-remux-{jspi,asyncify}`
and `engine-adaptation-{jspi,asyncify}` sets, plus the private bridge and its MIT
notice. Both standard and full `copy-assets` deployments retain them. Missing,
incorrectly identified, or hash-mismatched installed assets fail assembly.

`scripts/install-private-mpv.py` installs the provenance-verified subtitle and
audio component builds into `engine-mpv-{subtitles,audio}-{jspi,asyncify}`. The
service loaders validate manifest identity, hashes, Wasm backend/ABI and private
memory. Beta assembly includes the complete optional set plus `web/private-mpv/`
and its MIT notice; a partial set is rejected. Tagged packages also require
`privateMpv` source/configuration and artifact bindings in the clean build record.
The retained local component records do not qualify a tagged release.

This is local-main functionality. No release has been published. Tagged release
packaging now checks the private engines against the clean engine build record.
Each private engine needs matching artifact hashes and a `privateRemux` entry
listing its `inputs` and `configurations` from that record. The normal source
archive verifier checks those source/configuration bytes and SDK correspondence.
The exact-archive Chrome/Firefox consumer gate also requires automatic selection,
forced Asyncify, `on`, and `off` remux cases. The existing local component builds
do not supply that clean release record.

Validation: [selection browser results](../results/jspi-asyncify/runtime-selection-01/result.json)
cover 14 cases using frozen current sources, default and explicit policies,
isolated/non-isolated documents, JSPI APIs disabled, remux/transcode playback and
seeking, unavailable JSPI, invalid values, missing Wasm, and worker cleanup.
The simulated unavailable-JSPI cases run in Chrome; they are not Firefox/Safari qualification.
Selection/admission tests preserve browser routes and exclude unqualified private
routes. Packaging tests check identities/hashes and standard/full copying.
HEVC CPU remains withheld; see the [investigation](HEVC-PRIVATE-RUNTIME-INVESTIGATION.md).

At the time of the selection campaign, full beta assembly stopped at the existing
`Build record mismatch: native/adaptation/flac.h` check. No new archive was
produced. The installed private assets passed identity/hash verification;
[packaging evidence](../results/jspi-asyncify/runtime-selection-01/packaging-check.json)
records the exact limitation. A fresh matching maintained engine build is needed
before validating the complete archive.

Review-fix validation: the maintained `runtime-isolation.mjs` suite retains
explicit `off` coverage. `runtime-selection-regressions.mjs` covers optional
inspection fallback, forced/controlled rejection, HTTP 401/403, private inspector
preloading and module reuse, and teardown. Its latest retained result is
[here](../results/jspi-asyncify/runtime-selection-fixes-1790543745338/result.json).
