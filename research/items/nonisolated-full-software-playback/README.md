<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Full Software playback without cross-origin isolation

Assessment: 2026-09-30. **Bounded public Software and Hybrid working on JSPI and Asyncify; production completion continues.** The full private codec build includes dav1d, zimg and XML. Original public Software fixtures and 20 additional public Software/Hybrid codec cases passed in Chromium without isolation. Direct ASS/filter/snapshot and continuous PCM/cadence checks passed. Full public feature, format, Firefox, long/large input, regression and release qualification remains incomplete. See [current public evidence](PUBLIC-PLAYER-QUALIFICATION.md) and [production completion contract](../../../docs/NONISOLATED-PLAYBACK-COMPLETION.md).

## Finding

The existing cooperative mpv infrastructure substantially reduces the remaining port. The current RGB Software entry points can already link against the verified private mpv libraries and initialize, render an idle black RGB buffer, destroy, and recreate under both JSPI and Asyncify. A replacement mpv scheduler or a separate cross-worker video-frame protocol is not currently justified for the first RGB prototype.

The video-enabled private codec build and host now combine asynchronous mpv calls, rendering, finite source reads, and consumed-audio feedback. Public integration and broader media qualification follow this prototype. This is more specific, and potentially smaller, than the earlier conversational estimate of a general full-engine rewrite.

The canonical evidence is [renderer prerequisite run](evidence/20260929T175300Z-render-prerequisite-01/run.json), [browser results](evidence/20260929T175300Z-render-prerequisite-01/result.json), and [input/artifact manifest](evidence/20260929T175300Z-render-prerequisite-01/manifest.json).

## Scope and contract

- Hypothesis: extend the existing cooperative mpv runtime to play finite files with FFmpeg video decoding, RGB canvas presentation, and message-delivered stereo audio, while mpv retains A/V timing and subtitle ownership.
- First target: MPEG-2 video-only, then MPEG-2 + AC-3, followed by the six ordinary Software-dependent README fixtures (rows 33–37 and 41 at review time). Local files first; authorized finite HTTP range sources next.
- Baseline: the same fixtures through the existing isolated Software engine, with independent decoded-picture/audio references. A passing isolated route is not itself a pixel or audio fidelity oracle.
- Success: actual changing decoded pictures, expected audible/captured audio, bounded queues, synchronized time, correct paused/playing seeks and EOF, cancellation after a real pending read, and complete teardown on both private runtimes.
- Adverse controls: reject invalid dimensions/resources; disable JSPI APIs in the Asyncify worker; assert private Wasm memory and absent SharedArrayBuffer; prohibit native-video/WebCodecs substitution during Software qualification; exercise stale PCM epochs, failed source reads and cancellation.
- Stop/reassess: renderer/codec initialization failure, scheduler ownership violation, unbounded queues, unsafe suspension/reentry, or inability to maintain a declared playback workload without weakening fidelity. Record the first causal failure before altering scheduling.
- Implementation authorized on 2026-09-29 in a dedicated worktree: video-enabled private build and finite Software playback prototype, starting with MPEG-2 video-only then synchronized stereo A/V. Qualification gates still apply.

## Implementation worktree

Branch: `codex/nonisolated-software-20260929`, based on `73e1ba0f47b28c8278af4a50f1630f711a43d8dd`.
Worktree: `/Volumes/seed2/Projects/demuxe-nonisolated-software-20260929`.

The new dependency `playback` profile enables MPEG-2, MPEG-4 Part 2, ProRes,
MP2 and MP3 alongside the existing private audio/subtitle decoders and required
parsers. It is separate from the existing `audio` and `subtitles` profiles.
The experimental [playback linker](tests/build-playback.py) enforces that
profile and uses one video decoder thread. The 24 logical mpv tasks remain
cooperative, with private memory and no parallel decoding claim.

The [host](tests/private-playback-host.mjs) serializes commands, event draining
and RGB canvas rendering through the existing continuation owner. Its optional
[PCM transport](tests/private-pcm-transport.mjs) sends bounded stereo blocks to
the existing worklet, returning consumed-sample feedback to the full engine.
The [browser runner](tests/run-playback.mjs) exercises both runtimes without
headers, disables JSPI for Asyncify, compares three seek pictures against an
independent FFmpeg decoder, plays and seeks to EOF, and cancels a pending read
after recreating the engine. The initial synthetic workload is 320x180 at 24 fps,
4 seconds, with optional 48 kHz stereo AC-3. No public admission or packaging
change follows from this prototype.

```sh
python3 tests/prepare-fixture.py /EXTERNAL/FRESH_FIXTURES
python3 tests/build-playback.py --deps /EXTERNAL/PLAYBACK_DEPS --sdk /PINNED/SDK --out /EXTERNAL/FRESH_LINK
node tests/run-playback.mjs /EXTERNAL/FRESH_LINK evidence/UTC-video-run /EXTERNAL/FRESH_FIXTURES/mpeg2.ts /EXTERNAL/FRESH_FIXTURES/reference.rgb
# Prepare another fresh fixture directory with --audio; append reference.f32
# to the browser runner arguments to exercise the actual AudioWorklet transport.
```

Commands above run from this item directory. Build dependencies first with
`experiments/jspi-asyncify/mpv/scripts/build-dependencies.py --profile playback`
using the pinned SDK, verified downloads, build tools and a fresh external output.

## Implemented media result

The [accepted row record](evidence/20260929T224600Z-readme-suite-02/accepted-rows.json)
contains 12 accepted backend cases for the six real finite README fixtures, with
current worker/host/PCM source hashes verified against each run. All had
`crossOriginIsolated === false`, no SharedArrayBuffer and private ArrayBuffer
Wasm memory; Asyncify ran with both JSPI APIs disabled.

| Fixture | JSPI output/lifecycle | Asyncify output/lifecycle | Worklet underruns JSPI / Asyncify |
| --- | --- | --- | --- |
| [MPEG-2 + AC-3 / TS (row 33)](evidence/20260929T224600Z-mpeg2-ac3-01/result.json) | Passed | Passed | 0 / 0 |
| [Interlaced MPEG-2 + AC-3 / TS (row 34)](evidence/20260929T224643Z-mpeg2-interlaced-ac3-01/result.json) | Passed | Passed | 2 / 0 |
| [MPEG-2 + MP2 / MPG (row 35)](evidence/20260929T224747Z-mpeg2-mp2-01/result.json) | Passed | Passed | 0 / 0 |
| [MPEG-4 Part 2 + MP3 / AVI (row 36)](evidence/20260929T224842Z-mpeg4-mp3-01/result.json) | Passed | Passed | 6 / 4 |
| [ProRes + PCM / MOV (row 37)](evidence/20260929T225356Z-prores-pcm-02/result.json) | Passed | Passed | 2 / 0 |
| [MPEG-2 video-only / TS (row 41)](evidence/20260929T225333Z-mpeg2-video-only-01/result.json) | Passed | Passed | n/a / n/a |

Each case compared seek pictures at 0.5, 1.5 and 2.5 seconds, played an initial
window, sought near EOF and reached EOF, then recreated the engine with a
blocked read and canceled it. All destroys had zero live/retained logical tasks,
wait keys, scheduler/source timers, source handles and pending reads, and 24/24
free coroutine slots. Audio cases closed the AudioContext and stopped transport.
No browser video decoder or native media-element fallback is present in this host.

These fixtures are 320x180, 30 fps, approximately 36 seconds. The experiment
plays roughly one second initially and two seconds near EOF, rather than the
whole file continuously. Picture MAE was 0–0.209 on the 0–255 channel scale,
with expected reference frame times within the declared one-frame tolerance.
The first half-second of consumed stereo PCM matched host FFmpeg with RMSE
0–0.0000126 after bounded codec-startup alignment. Wrong red/blue channel output
was rejected. The raw captured PCM excludes worklet zero-filled underruns;
2–6 underrun quanta occurred in several cases, without a predeclared cadence
screen or phase attribution. Those counts remain in the records, and uninterrupted
sound/A/V timing remains unqualified. No CPU measurement was made.

The [first suite](evidence/20260929T184300Z-readme-suite-01/result.json) retained
wrong seek pictures for interlaced and video-only MPEG-2 with 0.5-second demux
preroll. Their observed GOP interval was one second; two-second preroll covered
that tested interval and produced the correct pictures. This is a bounded
prototype seek policy, not a guarantee for arbitrary long-GOP files. An attempted
`absolute+very-exact` command was rejected and retained separately; the actual
fix uses `hr-seek-demuxer-offset` with `absolute+exact`.

A ProRes run passed media checks but its Node CLI hung after writing the results;
[the clean retry](evidence/20260929T225356Z-prores-pcm-02/result.json) replaces it
for acceptance. The suite's original failed return code remains untouched.
The harness now bounds its own HTTP shutdown and exits after evidence writes.
The [build record](evidence/20260929T225500Z-playback-build-01/run.json) retains
SDK/dependency/source hashes and both static Wasm audits. Large binaries and
independent reference arrays stay in the external build directory. Early manual
run identifiers used a local clock label; actual UTC timestamps are retained in
raw browser/build records.

## Latest merge qualification (2026-09-29 local time)

The bounded experimental non-CPU correctness gates passed and are recorded in
[merge qualification](MERGE-QUALIFICATION.md). **The public Player still excludes
this candidate. This is an experimental implementation, not a completed public
Software feature.** No full CPU benchmark has been run.

The maintained host/transport, internal Backend, worker, playback installer and
asset/release checks are implemented. Browser controls and source replacement
passed on Chrome JSPI, forced Chrome Asyncify and actual Firefox Asyncify. These
checks exercise authorization renewal, replacement during a pending seek or
authorization callback, permission failure, AudioContext suspension/resumption,
settings restoration and zero native resources after teardown.

The contemporary isolated RGB Software baseline passed all six fixtures:
[baseline](evidence/20260930T003007Z-isolated-baseline/result.json). Independent
FFmpeg RGB and stereo PCM remain the output oracles. Native mpv `avsync` is an
internal timing diagnostic; it does not establish independent physical A/V
synchronization. Captured PCM excludes zero-filled underruns, which are screened
separately with retained phase/counter evidence.

Earlier continuous runs exposed startup delays, real PCM starvation and cadence
or A/V failures. All remain failed. The current candidate declares a 32,768-frame
PCM ring and 0.5-second native buffer, checked against the installed ABI/manifest.
The worklet uses a fixed diagnostic capture buffer. The transport now queues PCM
before starting consumption after a reset/resume, while preserving underrun
reporting once playback is running, and views exactly its stereo ring capacity.
The final continuous matrix uses unchanged picture, PCM, frame, gap, duration and
underrun thresholds. The [18-case acceptance record](evidence/20260930T030401Z-accepted-continuous-cases/result.json) binds the current maintained runtime sources; the failed suites remain unchanged.

The bounded-file seek policy now rewinds sufficiently far for the observed
native duration up to 60 seconds; a six-second GOP fixture passed both runtimes
at 0.5, 7.5 and 9.5 seconds. Longer sources remain unqualified. Tagged BT.709 720p
and 1080p fixtures passed bounded picture/output/lifecycle checks. Earlier HD
fixtures with unspecified color metadata remain failed; mpv and the independent
FFmpeg reference selected different default matrices. An earlier 1080p capture
hit Node's heap limit with numeric-array serialization; binary capture transport
replaced it and passed fresh output checks. These are not continuous HD or
physical HDR qualifications.

An idle Chrome harness stall is retained separately with no accepted media
outcome and no established cause. Startup phase logging and an outer evaluation
deadline now bound that class of harness failure. Malformed-source and genuine
pending-HTTP cancellation checks passed on all three browser/runtime combinations.

## Remaining integration work

1. Move the bounded host into a maintained playback worker and implement the
   public Backend contract, including readiness/output verification, command
   replies, seek generations, track/settings restoration and destruction.
   Implemented experimentally; public factory/admission remains pending.
2. Add a provenance-bound playback asset profile to the linker/installer,
   loader, asset manifest and preparation path. Public preparation currently supports
   the existing engine/service profiles. The maintained loader and separate
   provenance-bound playback installer now exist; preparation/package qualification
   remains pending.
3. Add finite private Software admission with explicit source/feature limits;
   preserve the existing isolated Software and Hybrid paths. Browser capability
   signals alone must not admit the new route.
4. Qualify public open/replacement, pause/resume and AudioContext interruption,
   playback rate, tracks/subtitles/filters, authorization-refreshing HTTP ranges,
   failed reads, longer GOPs, large decode workloads and target browsers.
5. Measure continuous cadence/A/V timing and CPU only after the relevant
   correctness gates pass. The current worklet capture records actual consumed
   PCM and excludes zero-filled underrun samples; its underrun counters must be
   retained. Sample fidelity alone does not qualify uninterrupted sound.

The private Software prototype does not implement named Hybrid/WebCodecs video
ownership or expand the Dolby Vision fixtures. The production no-isolation
eligibility checks remain in force until the new route satisfies its gates.

## What was actually run

The [probe builder](tests/build-render-probe.py) verified the existing private audio dependency closure and its pinned SDK, then linked unmodified copies of `native/player.c` and `native/events.c` with the cooperative source bridge, continuation/context support and private libraries. Only the source bridge import names were adapted in copied inputs, as in the existing private service linker. No installed engine or dependency archive was replaced. The second binary was produced by the existing Binaryen Asyncify import profile.

| Check | JSPI | Asyncify |
| --- | --- | --- |
| Chrome 153.0.8010.53, headless localhost, no COOP/COEP | Passed | Passed |
| `crossOriginIsolated === false`; SharedArrayBuffer unavailable; private ArrayBuffer heap | Passed | Passed |
| JSPI APIs disabled | Not applicable | Both disabled |
| Three create → forced idle RGB render → report swap → destroy cycles | Passed | Passed |
| Invalid zero-width rendering rejected | Passed | Passed |
| Live/retained scheduler tasks and wait keys after each destroy | Zero | Zero |
| Reusable coroutine slots after each destroy | 24/24 | 24/24 |

Both modules used a 64 MiB heap in this probe. Asyncify observed 2,376 bytes maximum saved stack and 24 unwind/rewind pairs; these are observations for idle renderer lifecycle, not media capacity limits. The probe checked the 64×64 RGB buffer; it did not exercise a canvas, decode media, open an audio device, compare the isolated renderer, or measure CPU/cadence. No Software playback claim follows from this result.

Large build artifacts remain at `/Volumes/seed2/Projects/demuxe-nonisolated-full-playback-20260929/render-probe-01/`; their hashes and exact commands are retained with the run. Dependency and source hashes are recorded separately from current-working-tree source-review snapshots.

## Reuse and exact gaps

| Area | Existing reusable implementation | Remaining change |
| --- | --- | --- |
| mpv scheduling and suspension | [engine](../../../web/private-mpv/engine.js), [scheduler](../../../web/private-mpv/scheduler.js), [continuations](../../../web/private-mpv/continuations.js) | Reuse first. Actual decode workloads may expose fairness, stack or task-capacity issues that idle rendering cannot detect. These logical tasks are not parallel decoder threads. |
| Finite source reads | [private source loader](../../../web/private-mpv.js), [cooperative C stream](../../../experiments/jspi-asyncify/stage2/native/stream-coop.c), existing LocalFileReader/RangeReader | Wire the full engine to these readers. Preserve source identity, authorization refresh, read deadlines, cancellation and source replacement. The [finite-resource shim](../../../experiments/jspi-asyncify/mpv/native/finite-source.c) deliberately rejects nested resources. |
| Codec libraries | [private dependency builder](../../../experiments/jspi-asyncify/mpv/scripts/build-dependencies.py) and verified private mpv archive | Add a playback build profile. Current private audio FFmpeg enables subtitle decoders plus AAC/AC-3/PCM, with no video decoders. The separate playback profile now enables MPEG-2, MPEG-4 Part 2, ProRes and MP2/MP3 with the existing private audio decoders. Broader codecs, filters and formats require separate build/qualification work. Do not widen the existing audio service's qualification. |
| RGB rendering | [native/player.c](../../../native/player.c), libmpv software renderer, [Software worker's RGB draw path](../../../web/software-full-engine-worker.js) | Retain rendering in the engine worker and transfer an OffscreenCanvas once. Copy private RGB bytes into ImageData before another render can replace them. Use the existing [RGB VO rotation correction](../../../scripts/compile-software-vo.py) when qualifying rotated media. Decoded RGB output has been exercised by the prototype; larger resolutions, rotation, HDR and the public presentation flow remain unqualified. |
| mpv invocation and worker loop | Existing Software event/command handling plus `host.call()` | Replace raw synchronous `_web_*`/`ccall` use with scheduler-owned asynchronous calls. Serialize host render/event/control operations, keep heap strings alive across suspension, refresh heap views after growth, and prevent overlapping timer pumps. Retain MPV command-reply and seek-generation semantics. |
| Audio | [browser AO](../../../native/ao_browser.c), [private audio worker](../../../web/private-mpv/audio-worker.js), [private worklet](../../../web/private-mpv/audio-worklet.js) | Reuse the epoch/reset acknowledgments, transferred PCM and real-consumption feedback in the same full mpv engine. First qualify stereo 48 kHz output. Compressed decoding, resampling and concurrent video load need new evidence. The existing media-element clock trimming in NativePrivateMpvAudio is not the clock owner for full mpv video. |
| Player construction and verification | [Backend contract](../../../src/internal/backend.ts), [WasmPlayer](../../../src/internal/wasm-player.ts), [UnifiedPlayer](../../../src/unified-player.ts) | Add an internal private Software backend/transport selected by runtime, preserving the public Software mode and current session owner. Implement the additional startup/output/seek verification hooks consumed by UnifiedPlayer; the Backend interface alone does not enumerate them all. WasmPlayer currently allocates shared audio memory and assumes pthread teardown. |
| Runtime admission and preparation | [runtime selector](../../../src/internal/remux-runtime.ts), [plan admission](../../../src/internal/playback-plans.ts), [preparation](../../../src/internal/engine-preparation.ts) | Introduce a build/profile-qualified private Software capability and select the corresponding assets/font/precompiled module. Update feature reporting, route rejection and preparation together. Merely deleting isolation checks would load an incompatible engine. Keep Hybrid excluded until separately implemented. |
| Asset integrity and release | [private loader](../../../web/private-mpv.js), [installer](../../../scripts/install-private-mpv.py), [asset collector](../../../scripts/private_remux_assets.py), [package assembly](../../../scripts/package-beta.py) | Add the distinct playback profile, ABI checks, verified two-runtime artifacts, provenance/source bindings and copy/package coverage. Existing private services are hardcoded to subtitle/audio profiles. Scope any promotion to matching exact-archive browser evidence. |

The full pthread Software builds additionally use dav1d/zimg, broader filters, YUV presentation and larger memory budgets. Copying the current restricted 128 MiB private service cap or enabling a few decoders does not establish parity with those builds. A broad playback build needs an explicit dependency inventory, single-thread-safe configurations, declared resolution/memory limits, and separate SIMD/color/filter checks.

## Original implementation sequence (historical)

### 0. Renderer prerequisite — completed here

Link the current RGB entry points to private mpv and run lifecycle checks on both runtimes. This removes an immediate link/init concern but does not establish actual video decoding.

### 1. One real video-only file — next implementation slice

Extend the private build/link tooling with a separately identified experimental playback profile containing MPEG-2 decoding and required parsing. Reuse the cooperative source reader and the existing RGB native entry points. Add a minimal private worker with one guarded asynchronous event/render pump and an OffscreenCanvas. Set explicit decoder-thread/resource policies for the private build rather than inheriting pthread assumptions.

Run the MPEG-2 video-only fixture under JSPI and forced Asyncify. Verify changing pictures against an independent decoded reference, source timestamps, pause, forward/backward seeks, EOF/replay and cleanup. Disable browser video decode APIs as a negative control. Keep production admission unchanged until this slice passes.

### 2. Add real audio and lifecycle correctness

Combine the existing private PCM transport with that same mpv instance; retain mpv ownership of audio/video scheduling and consumed-audio feedback. Use MPEG-2 + AC-3, then MP2/MP3/PCM fixtures. Verify captured audio, A/V offset, rate changes, AudioContext suspension, paused seeks, underruns, source replacement, cancellation during a pending read, EOF audio tail and repeated destruction. Do not insert a second independent playback clock.

This is the highest remaining integration uncertainty. A decode call runs synchronously until it yields or returns, so heavy video work can delay the worker's PCM/command processing. Measure maximum decode/pump gaps and queue behavior before deciding whether scheduler or transport changes are needed. The idle probe does not measure this risk.

### 3. Player integration and bounded format support

Implement the private backend's full control and output-verification contract, asset loading, preparation, feature availability and route admission as one coherent change. Preserve current plan ordering, native routes, permission/source failures and explicit mode pins. Add runtime-specific build/fixture evidence for the six ordinary rows and reference the existing restrictions on interlacing and output fidelity. Prove finite URL and local-file lifecycle behavior. No blanket private-runtime allowlist removal.

### 4. Qualification, packaging and expansion

After output correctness passes, measure sustained playback cadence, audio underruns, control/seek latency, memory and CPU on a declared desktop workload. Validate each actual backend/build in Chrome and Asyncify-capable Firefox; simulated absence of JSPI in Chrome is not Firefox qualification. Test missing/corrupt assets, packaging, exact-archive consumers and regression of existing pthread/Native paths. Keep Safari/mobile and broader device coverage explicit.

Widen codecs, formats, resolution and output profiles only with corresponding gates. The separate component-registry refactor is not a prerequisite for this work. No calendar duration is inferred from the number of files or the renderer probe.

## Separate follow-ups

- **Hybrid:** [native/vd_browser.c](../../../native/vd_browser.c) waits on a shared futex mailbox. Full private Hybrid requires an asynchronous request/result bridge, packet/configuration ownership, decoder flush/seek handling and retained-frame lifecycle validation. It is unnecessary for the first private Software fallback.
- **YUV and performance parity:** adapt the [YUV renderer](../../../native/yuv-backend.c) and its build helpers after RGB correctness. Its immediate same-worker draw callbacks look reusable, but were not exercised here. RGB admission must state its presenter limits and retain rotation/color correctness.
- **Dolby Vision rows 64–65 and 79–80:** recorded Auto runs reach Software and private remux fails. The initial failure is HEVC parameter-set construction, with additional recorded Hybrid seek/retained-frame issues. These are not proof that every Dolby Vision source fundamentally requires software video decoding. A Native/Hybrid repair is a separate possible route. Private Software playback also would not establish RPU/color, physical HDR or Atmos fidelity.
- **Full parity:** multichannel layouts, broader resampling/filter/tone-mapping behavior, nested HLS/DASH resources, hardware/device coverage and endurance extend beyond the six-row finite-file target. Existing restricted audio or subtitle evidence cannot qualify these responsibilities.

## Reproduction

Use fresh external build and evidence directories; never overwrite this run.

```sh
python3 research/items/nonisolated-full-software-playback/tests/build-render-probe.py \
  --deps /Volumes/seed2/Projects/demuxe-jspi-asyncify-builds-20260927/mpv-review-deps-01 \
  --sdk /Volumes/seed2/Projects/demuxe-release-closeout-20260916/build/emsdk-4.0.14 \
  --out /absolute/fresh/external-render-probe
node research/items/nonisolated-full-software-playback/tests/run-render-probe.mjs \
  /absolute/fresh/external-render-probe /absolute/fresh/evidence-directory
```

The builder refuses source/header/archive/toolchain drift. The browser runner freezes its runtime/worker inputs and rejects shared memory or accidentally enabled JSPI in the Asyncify case. The prerequisite has no media fixtures; media correctness and performance stages remain pending. See [current structured state](item.json) and [decision history](history.jsonl).

## Record validation

The new item's JSON, local links, probe source syntax, definition hash, evidence manifest and artifact hashes passed focused checks. `git diff --check` passed for the research index; its only change is this item's registration. The repository-wide `python3 scripts/research.py verify` finished with 16 failures (12 distinct paths) in older evidence references, including removed JSPI helpers/build artifacts and changed production renderer/remux sources. It reported no failures for this new item. The unrelated records were not repaired by this investigation. See [verification output](evidence/record-validation-20260929.json).
