# Optimization integration: local stage checkpoint

Historical checkpoint report. For subsequent local implementation and current coverage, see [completion status](OPTIMIZATION-COMPLETION.md).

For the subsequent correctness fixes and current unequal-tail limitation, see
[the review-fix report](OPTIMIZATION-REVIEW-FIXES.md).

This is **partial implementation, not completion of the optimization program**.
Do not promote adaptation, Native ASS, or the new experimental options to general
automatic admission. A separate maintained audio-preparation engine has been built. Release qualification,
physical A/V measurement, endurance and performance improvements are not claimed.
See [the stage 2 report](OPTIMIZATION-FLAC.md) for the current adaptation evidence.

## Starting point and isolation

Remote refs were fetched on 2026-09-15. `origin/main` remained
`51f0792fa6c5229a8695d908006a0a573bfc1c10`; the integration branch
`codex/optimization-integration` starts at saved streaming checkpoint
`f2491f62c777fa55225aed9b0b7ecf2e340accf7` in a dedicated worktree.
The original checkout and the adaptation laboratory were not modified.
An existing `origin/HEAD.lock` prevented the first generic fetch; fetching the two
explicit refs with remote HEAD following disabled succeeded without deleting it.
No commit, push, merge, tag, or publication was performed.

The original adaptation/risk-review laboratory was found at
`/private/var/folders/p2/hs2582qs5672qbvtm4z5_9840000gn/T/demuxe-adapt.QUfsHU`.
Selected original source, patches, failure results and the edge fixture are copied
under `results/optimization-integration/reference/`, with SHA-256 provenance.
These are historical test references, excluded from runtime packaging.

## Implemented stage

- Conservative opt-in buffered remux seeks use **current** media and SourceBuffer
  ranges, a retained random-access point, and accepted source/generation identity.
  They preserve the worker, MediaSource and SourceBuffer. The consumer target moves
  backwards without rewinding the producer or incorrectly evicting the new playhead.
  Native waits for a target video-frame callback, not merely `seeked`, on this path.
- MSE initialization removes its event listener and clears its deadline on success,
  failure and cancellation. Source initialization accepts one completion only.
  Failed-generation worker messages cannot negotiate a new buffer or append output.
  Repeated remux destruction cannot revoke the same URL again.
- Native scalar attenuation uses one media-element source and one GainNode output.
  Gain 1 allocates no AudioContext on a new session. Play resumes a suspended
  context; retirement disconnects nodes and closes it. Ordinary volume/mute stay
  on the media element. Remote Native already requires CORS-clean media.
- Hybrid can retain WebCodecs video with an explicitly admitted scalar mpv audio
  filter. Constructor, dynamic setter, automatic selection and capabilities share
  the feature policy. Unsupported chains go to Software in automatic mode or reject
  in explicit Hybrid mode. They are never silently removed.
- A finite internal plan registry names the accepted direct/remux/gain/Hybrid/filter/
  Software plans and records source prerequisites, resources, fidelity and fallback.
  Diagnostics expose the actual plan. This is an initial registry; it does not yet
  implement all the requested source/feature/fidelity policy decisions.

### Public API additions

```js
const player = new Player(container, {
  experimentalBufferedNativeSeeks: true, // default false
  experimentalHybridAudioFilters: true, // default false
  audioFilters: 'lavfi=[volume=0.5]',
});
// Separately requested scalar attenuation (0..1, default 1):
await player.setAudioGain(0.5);
```

`audioGain` is also a constructor option. It is experimental, not a claim of
sample-exact final output. Native uses Web Audio; mpv routes use the scalar audio
filter. `setAudioGain` uses the existing transactional replacement contract,
preserving position, rate, mute and playback intent. It currently reopens the
session; it is not an optimized live gain setter. Filters admitted on Hybrid are
only `volume=N` and `lavfi=[volume=N]`, with finite decimal N from 0 through 1.
`capabilities.features.audioGain` reports gain support; audio-filter availability
still requires checking this documented qualified subset. Amplification,
expressions, other filters and arbitrary chains are not newly admitted.

The three public modes and existing default selection behavior are preserved.
New buffered seeking and Hybrid filters remain explicitly experimental. No
background Hybrid-to-Native handoff or per-open engine benchmark was added.

## Timestamp blocker: historical reproduction and maintained replacement

`experiments/optimization-integration/fixtures.py` generates eight small fixtures:
B-frames 0/2 × start 0/2 seconds × matched/unequal audio duration. The unequal case
has an awkward final audio-frame length. Commands and SHA-256 hashes are saved in
`fixture-manifest.json`; packet/stream probes remain in `build/optimization-fixtures`.
The original 8.1-second risk fixture is retained verbatim in the reference folder.

`reproduce-timestamps.mjs` runs the **historical scratch worker**, read-only, using
the original laboratory LibAV binary only as a reproducer. No benchmark binary is
added to the product. All eight no-B-frame codec/case combinations convert; all
eight B-frame combinations fail. Both original edge-fixture runs reproduce:

```
Application provided invalid, non monotonically increasing dts to muxer in stream 0: 33600 >= 32528
```

The scratch worker reconstructs absent DTS from PTS. That is invalid for reordered
video. The failure exists independently of the streaming checkpoint. Neither
clamping DTS, dropping packets, video transcoding nor a blanket B-frame ban was
implemented. A maintained adaptation pipeline must preserve demux decode order and
rescale established timestamps, or explicitly reject unavailable timestamp
information. Stage 2 adds a maintained, opt-in FLAC adapter using the existing bounded
Matroska/H.264 decode-order reconstruction instead of the scratch algorithm.
All eight controlled fixtures and the original failure pass in Chrome and Firefox.
General automatic FLAC and all Opus admission remain disabled. The original scratch adapter also hard-codes AVC MIME, 90-second
duration, stereo/48 kHz and restricted PCM assumptions; those are not ported.

## Complete candidate inventory

| Candidate | Stage status and gate |
|---|---|
| Buffered Native seeks | Implemented, opt-in; Chrome/Firefox short output/refill checks |
| Hybrid scalar audio filters | Implemented, opt-in; dynamic reconfiguration and signal checks |
| Other Hybrid audio filters | Deferred; per-filter latency/continuity qualification required |
| Native Web Audio scalar gain | Implemented, explicit request; signal/mute/zero/restore checks |
| Native ASS/libass overlay | Deferred; original loader and paused-resize patch preserved, not integrated |
| Progressive FLAC adaptation | Implemented for explicit Native trials; maintained FFmpeg 9.0.1; integer mono/stereo qualification only |
| Explicitly permitted Opus adaptation | Blocked; no implicit lossy permission or fallback |
| Adaptation + ASS | Disabled, constituent plans unqualified |
| Adaptation + gain | Implemented, experimental; bounded playback/seek and selected-track tests |
| Adaptation + ASS + gain | Disabled, constituent plans unqualified |
| First versus steady fragment sizing | Deferred pending paired cost evidence; existing bounded fragment policy retained |
| FLAC encoder settings | Deferred; sample-exact adapter and end-to-end benchmark required |
| Compiled module/worker reuse | Deferred; no cross-source reuse or credential state introduced |
| Hybrid compressed-packet copies | Inspected; unchanged pending ownership/copy-cost measurement |
| Packet/configuration adapters | Preserved; codec/configuration tests pass; no replacement claimed |
| Software YUV/GPU | Existing experimental presenter preserved, RGB default; no new artifact built |
| Arbitrary Native/Hybrid GPU effects | Separately gated follow-up |
| Separate audio/video SourceBuffers | Separately gated follow-up |
| WebCodecs audio decoding | Separately gated follow-up |
| Authenticated unchanged-byte transport prototype | Not revived; no demonstrated win |
| Routine Hybrid-to-Native handoff | Not revived |
| Client video transcoding | Not introduced |
| Independently clocked custom audio with Native video | Not introduced |

## Fidelity, source identity and fallback

Original-track direct playback and packet-copy remux retain their preference.
Explicit Native FLAC trials add selected-audio lossless conversion only. No new
downmix, sample-rate change or lossy adaptation permission is introduced. The scalar effect is a separately requested transformation, not an
encoding fidelity claim. Existing browser/mpv output resampling remains governed
by the existing backend behavior. Final speaker output and physical A/V sync were
not measured.

Existing operation serialization, source-scoped track identities, immutable range
checks, resource limits, cancellation and fallback loop protection remain active.
The plan registry does not supersede mpv's streaming scheduler or clock. Existing
source/integrity errors retain their terminal handling. Broader error classification
and authorization-refresh policy unification remain outstanding.

## Streaming baseline preservation

The saved modernization remains staged rather than installed into the root runtime.
Root engines use mpv 0.40.0 / FFmpeg 7.1.1. The final saved overlay uses mpv 0.41.0 /
FFmpeg 9.0.1, pinned libass and its maintained browser/AVIO patches. Neither lock nor
patch collection was changed. TypeScript 5.9.3 and Playwright 1.58.2 remain pinned.
The saved candidate-26 release/live qualification blockers remain open.

`experiments/optimization-integration/prepare.py` checks the exact saved checkpoint,
runs its unmodified `prepare.py --timeline`, then merges the optimization delta.
**Correction to stage 1:** assemblies 02–07 silently skipped tracked-file patches
because `git apply` was invoked from the wrong directory. Their 59 test passes
covered the saved overlay, not combined implementation. The original logs remain
historical evidence. Assembly 08 exposed real patch conflicts. The assembler now
uses a three-way merge and only explicitly reviewed additive resolutions; unknown
conflicts stop with a saved artifact. Assembly 12 contains the actual delta,
compiles, and passes all 59 saved integration contracts. These are source/contract
checks, not rebuilt HLS/DASH browser qualification. The separate FFmpeg 9.0.1 FLAC
preparation engine uses its own matching glue and explicit remux ABI.

## Validation and evidence

Evidence lives under `results/optimization-integration/` and the existing harness
result directories referenced by its logs. Initial build passed. The initial unit
run had 25 passes plus a browser-harness setup failure from missing generated VP8/
VP9 fixtures; that run was not a playback regression. The first aggregate streaming
unit invocation omitted its required environment variables; its failures remain
saved, followed by the correctly configured run.

New contract tests fail on the missing buffered-seek implementation before the
change, then pass afterward. Cancellation tests establish an outstanding MSE open
before supersession/destroy and assert no late worker allocation. These are injected
contracts, not real network-fault coverage.

Short Chrome and Firefox checks cover Native direct/remux/gain, ordinary Hybrid,
filtered Hybrid and Software. Buffered seeks retain identities, present the target
frame while paused, and resume through refill. Scalar checks compare signal
amplitudes, mute, zero gain, unity restoration and closed retired contexts. All
cases assert worker/surface cleanup. Earlier harness mistakes (reading an absent
`state.paused`, and fetching a fixture from a server-disallowed path) remain saved.
No amplitude claim is inferred from the earlier visual-only runs.

Root playback uses six verified existing engine assets. `runtime-reuse.json`
records SHA-256 and correspondence to the 51f0792 release archive. Browser glue
matches exactly except the saved diagnostic product rename. No newer Wasm is paired
with older glue. The assembled streaming source is tested separately without
borrowing these engines.

Representative commands:

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm run build
node --test tests/optimization-contracts.mjs tests/remux-buffering.mjs tests/native-selection.mjs
python3 experiments/optimization-integration/fixtures.py
node tests/optimization-playback.mjs
BROWSER=firefox node tests/optimization-playback.mjs
LAB_VENDOR=/path/to/preserved/lab/repo/web/adapt/vendor node experiments/optimization-integration/reproduce-timestamps.mjs
python3 experiments/optimization-integration/prepare.py --output build/optimization-streaming-new
INTEGRATION_ROOT=build/optimization-streaming-new/streaming RETAINED_WORKER=build/optimization-streaming-new/streaming/web/filter-retained-engine-worker.js node --test experiments/streaming-modernization/integration/*.test.mjs
```

Stage 1 had **no paired CPU/memory benchmarks**. Stage 2 adds a bounded
FLAC-versus-Hybrid cold/warm screen; see [its exact scope](OPTIMIZATION-FLAC.md). Correctness checks and existing
historical percentages are not performance evidence. The requested cold/warm
open→10-second playback→destroy comparisons, full lifecycle/range-fault matrix,
broader adaptation codec/layout qualification, Native ASS/fullscreen/PiP,
and final rebuilt streaming/browser suites remain outstanding. Safari and mobile
are not qualified. This checkpoint delivers the implemented stages and preserves
the unresolved work; it does not satisfy all requested completion gates.
