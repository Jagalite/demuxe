# Playback optimization completion work

Post-review fixes: public range objects are restored for windowed Native, and
original-track inspection no longer depends on optional preparation assets.
Package 22 passed the focused Chrome/Firefox routing and Chrome tail regressions;
see [the fix evidence](../results/optimization-review-fixes-final/README.md).
The complete package-20 matrix below remains historical exact-artifact evidence.
Tagged candidate qualification is recorded separately in
`results/optimization-release-closeout/` and the release verification record.

Latest local stage (2026-09-16): automatic lossless admission is implemented for
the documented local-file subset. The progressive FLAC long-tail path passes
Chrome output, seek, pause/rate, sample and packet comparisons, including nonzero
starts and ASS+gain. Firefox's unequal-tail paused-seek failure remains reproduced;
that Native configuration rejects explicitly and retains the mpv alternatives.
A distant short-video seek can recover through Software; continuous Firefox Hybrid
ASS behavior after video EOF is not qualified (see the current evidence).
Preparation ABI 2 rejects mixed assets. Frame verification uses emitted MP4 sample
intervals and edit mapping, including rounded B-frame overlaps at fractional seeks.
Clean optional source builds and the integrated exact-archive release gate are in
place. Final candidate qualification is recorded in
[the current closeout evidence](../results/optimization-final/README.md).

Earlier package-14 source-build and benchmark results below are historical, as are
package-12/13 reports. They are not measurements of the final ABI-2 runtime.

Prior review fixes: the four Native ASS findings are fixed and covered by Chrome/Firefox regressions. That review used `build/native-ass-04` (interface version 2) and local package candidate `build/optimization-package-13`. See the review-fix section at the end. Earlier package-12 benchmark and checkpoint records remain historical evidence, not measurements of the rebuilt subtitle artifact.

The implementation below started at `f97588443ff4d2a043a2fd8500fb73bd45e656e1`.
Remote main was fetched and verified at that commit, with no later commits and
no initial working changes. That implementation and its review fixes were committed
and pushed to main as `cdd1cb5cc2e48f484e58bc0c2f1bc05fb6a7de83`. Subsequent
closeout work is local in `demuxe-optimization-integration`. The optimization
laboratory is unchanged.
Earlier integration, FLAC and review-fix reports are historical evidence; their
references to an uncommitted checkpoint describe their original preparation date.

**Release promotion has not occurred.** The latest scope and remaining browser/
source limitations are in the current closeout evidence; older sections retain
their historical qualification boundaries.

## In-place gain

All three maintained backends now expose a dedicated scalar attenuation stage.
Native attaches one MediaElementAudioSourceNode lazily. Hybrid and Software attach
one GainNode after their existing PCM worklet, preserving the user's mpv filter
chain, channel count and WebCodecs video path. Unity on a fresh player allocates no
stage. Once created, the stage remains connected through zero/unity changes;
ordinary volume and mute remain separate. No new AudioContext is allocated for
Hybrid or Software. Native resumes its context before redirecting playing media;
destroy cancels a blocked resume before any late source node can be allocated.

`setAudioGain` serializes in-place updates through the existing operation queue.
The fallback for a backend without a gain method remains transactional. Both
maintained backends support the in-place method. Diagnostic plans distinguish
Hybrid gain from mpv scalar filtering and their supported combination.

Evidence: `tests/in-place-gain.mjs`, Chrome and Firefox results under
`results/optimization-completion/gain-*`. Tests measure graph RMS at half, quarter,
zero, unity and mute; assert backend/worker/remux/context identity; check rapid
updates, paused position, seek, source replacement and teardown. A suspended-context
resume barrier proves destroy occurs during an outstanding update. These digital
measurements do not establish physical speaker output or A/V synchronization.
The older Native gain test initially assumed synchronous AudioParam observation;
its failed result remains saved. The corrected test waits for output processing.

Baseline and updated root build plus 18 routing/lifecycle contracts pass. The gain
source assembled with the saved streaming overlay compiles and passes its 59
contracts (`build/optimization-streaming-16`, logs in the gain evidence directory).
This is source/contract qualification, not end-to-end HLS/DASH qualification.

## Historical unequal-tail limitation (before the 2026-09-16 stage)

Both one-second video with 30-second audio and 1.017-second audio with 30-second
video reproduce the bounded-work rejection. The new reverse fixture command and
SHA-256 are retained under `results/optimization-completion/tails/`. Hybrid
continues beyond the shorter track in both cases. The first reverse-case test
incorrectly required continuing audio frames after audio ended; that failed result
is preserved and the test now checks continuing video output instead.

The single combined SourceBuffer still cannot provide progressive continuation
of the longer track under the existing bounds. MSE's open-state track-range
intersection explains why splitting SourceBuffers alone would not establish
support ([MSE specification](https://www.w3.org/TR/media-source-2/)). No fake range,
synthetic sample, timestamp extension or premature end-of-stream workaround has
been admitted. Existing explicit rejection and Hybrid alternative remain; this
is containment, **not unequal-tail playback support**.

## Native external ASS/SSA

`experimentalNativeASS: true` admits external ASS/SSA through existing
`addSubtitle`, `addFont`, subtitle selection and visibility APIs. It does not
extract embedded subtitles. Unsupported external formats retain mpv requirements.
The optional worker directly links the repository's pinned libass 0.17.3,
FreeType, FriBidi and HarfBuzz stack. No laboratory renderer or unrelated FFmpeg
binary is shipped. Assets load only when an external subtitle is attached.

The worker owns one renderer and selected track. Limits include 8 MiB per subtitle,
16 MiB aggregate attachments, 32 MiB user fonts, 100,000 parsed events, 512 bitmap
parts and 2 MiB bitmap bytes per render, 1920×1080 presentation, bounded RPC waits,
and 128 MiB maximum Wasm memory. Existing fonts and subtitle bytes remain owned by
the Player for transactional replacement. Rendering uses Native source time and
rejects results from obsolete visibility/seek/resize revisions. Paused resize
re-renders active cues before replacing the canvas. Paused idle rendering stops.

Source-scoped external subtitle identities use attachment order across Native and
mpv; embedded stream identities remain separate. mpv attachment completion now
waits for the corresponding track-list update, not just command acceptance.

Four complete combinations pass short Chrome and Firefox checks: direct+ASS,
remux+ASS, FLAC+ASS, FLAC+ASS+gain. Checks cover authored drawing, animated karaoke,
fonts, active-cue seeks, rate, pause, visibility, resize, gain, mode transitions,
source replacement and worker cleanup. Screenshots and failures remain under
`results/optimization-completion/ass-*`.

Fullscreen must include the player container. Video-only fullscreen reports a
limitation; native PiP and remote playback controls are disabled while the overlay
is attached. An external canvas does not accompany PiP or casting. No Safari,
mobile, embedded-subtitle, HDR-overlay, long-duration or physical A/V claim.

`link-native-ass.py` records pinned inputs and archive/artifact hashes and saves
wrapper source. Local beta packaging accepts `--ass-build`, includes the optional
assets and source companion, and refuses release admission. Reused library archive
hashes are not a clean rebuild/source-correspondence proof; that release gate stays
open. Ordinary Native playback does not load this worker or Wasm.

## Remaining scope / admission

| Item | Current status |
| --- | --- |
| Buffered Native seeks | Existing opt-in behavior preserved; previous frame and authority regressions retained |
| Native / Hybrid / Software gain | In-place implementation and Chrome/Firefox digital-output tests |
| Hybrid scalar filter | Existing qualified forms preserved; combined gain now has a separate stage |
| Progressive FLAC, original DTS repair, multi-audio | Opt-in implementation preserved; separate automatic lossless policy admits the narrow documented subset |
| Long unequal tails | Reproduced both directions; unsupported with bounded rejection |
| External Native ASS and combinations | Implemented, opt-in; Chrome/Firefox output checks and installed consumer checks |
| Embedded Native ASS | Not implemented; mpv remains alternative |
| Opus adaptation | Implemented, explicit Native and lossy permission; H.264 + PCM16/24, 48 kHz mono/stereo; Chrome/Firefox targeted output and lifecycle checks |
| Executable complete-plan eligibility | Finite registry now filters actual selection and validates the accepted plan; typed admission reasons; adaptation stays explicit |
| Initial/steady fragment sizes, FLAC settings | 0.125-second initial fragment rejected for PTS regression; 0.5-second default retained. FLAC level 0 sample checks pass; paired cost screen recorded, default 5 retained |
| Module / worker reuse | No new reuse admitted; credential/source isolation gates remain |
| Hybrid packet copies / format adapters | Removed redundant owned packet copy with shared-input capability fallback; Chrome/Firefox and configuration-prefix contracts pass |
| Software YUV/GPU | Existing experimental presenter retained; matching-artifact final qualification pending |
| Arbitrary GPU, WebCodecs audio, broader separate-track MSE | Not enabled |
| Rejected transport, routine background handoff, video transcode | Not revived |

No dependency upgrades, old/new glue mixing, HLS/DASH manifest ownership changes,
ABR/live admission or publication are part of the implementation. The source push
recorded above did not promote an optional runtime to release qualification.
Final-artifact paired benchmarks and clean-consumer checks are recorded below.
Clean release source correspondence remains open; no historical percentages are
used as measurements of the new artifacts.

## Targeted reruns

```sh
npm run build
node --test tests/optimization-contracts.mjs tests/remux-buffering.mjs tests/native-selection.mjs
node tests/in-place-gain.mjs
BROWSER=firefox node tests/in-place-gain.mjs
node tests/native-ass.mjs
BROWSER=firefox node tests/native-ass.mjs
CASES=audio-tail,video-tail RESULT_ROOT=results/optimization-completion/tails node tests/optimization-review-regressions.mjs
```

Local ASS link (requires the pinned root libraries built by `scripts/build.sh`):

```sh
python3 scripts/link-native-ass.py --sdk /path/to/emsdk-4.0.14 \
  --library-root /path/to/matching-root-build --output build/native-ass-FRESH
```

The served `web/engine-ass` must contain that build's matching `subtitles.mjs` and
`subtitles.wasm`. Never combine arbitrary glue and Wasm.

## Explicit Opus profile and fidelity

The shared maintained preparation controller now supports an Opus encoder profile.
Only explicit Native mode, `experimentalAudioAdaptation: 'opus'` and
`allowLossyAudio: true` admit it. The narrow compiled input gate is H.264 video plus
selected S16/S24 integer PCM, 48 kHz mono/stereo. The native FFmpeg 9.0.1 encoder
uses 96 kbit/s per channel. No separate library stack, audio resampling, downmix,
video decoding or video encoding is added. Original-copy audio is attempted first.
Lossless failure never grants lossy permission. Opus+ASS is unqualified and rejected.

Encoding remains continuous until a seek resets its timeline. The existing source,
range authentication, generation retirement, bounded lookahead and byte budgets
remain shared. Delayed MP4 initialization and edit-list handling preserve nonzero
starts and codec pre-skip. Final packet duration carries the partial-frame end;
raw decoders can expose the declared discard padding. Tests independently reconcile
input count, encoded count, packet durations, codec delay and raw decoded padding,
and cross-correlate deterministic audible markers (at most one sample of lag).
This verifies timeline/sample accounting, not lossless samples or speaker output.
See [Opus in ISO BMFF](https://www.opus-codec.org/docs/opus_in_isobmff.html).

Preserved failures include the original naive raw-count assertion on a partial
Opus frame. Updated checks explicitly account for padding rather than removing
samples from the source. Chrome and Firefox pass original-edge, B-frame/nonzero
mismatch and marker fixtures. FLAC decode-back remains byte-exact on its supported
integer fixtures, including selected multi-audio. Long unequal tails are still
unsupported for both profiles. Opus permission, original AAC copy and 44.1 kHz
rejection have separate browser tests. Paused bounds, cancellation, stale output,
worker/range failure and source replacement reuse the existing lifecycle harness.

## Selection and error boundaries

The finite plan registry now executes admission using requested effects, subtitle
attachments, source inspection, browser prerequisites, transport requirements and
fidelity permissions. The actual backend plan is checked before acceptance.
Automatic copy/direct and packet-copy remux remain ahead of Hybrid and Software;
audio adaptation never becomes automatic by setting its experimental option.
Native ASS is limited to file presentations. Explicit mode remains authoritative.
Selected stream and external attachment identities survive supported mode changes.

Admission codes distinguish unsupported features/source, policy prohibition,
unqualified combinations and deployment requirements. Existing source-integrity,
authorization and lifecycle handling remains intact. This is not a complete
migration of all legacy engine message matching into structured errors; compatibility
handling remains where replacing it lacks matching-engine evidence.

## Smaller optimizations and preserved boundaries

EncodedVideoChunk copies its input unless an explicit transfer is requested. The
Hybrid worker now passes the live Wasm view synchronously into that constructor,
acknowledges the packet only afterward, and never transfers the shared heap.
Configuration descriptions and joined prefixes remain owned. A TypeError selects
one remembered owned-buffer fallback. Chrome and Firefox real playback plus a
shared-input mutation test pass; short checks eliminate 140–154 kB of redundant
JavaScript copies. This byte reduction is not a measured universal CPU improvement.
[WebCodecs specification](https://www.w3.org/TR/webcodecs/).

The first-fragment 0.125-second experiment fails video presentation timestamp
preservation on two retained B-frame/nonzero-start fixtures. Raw captures and
failures remain under `first-fragment/`; packaging rejects this setting. No speed
comparison is meaningful after that correctness failure. The default remains 0.5 s
for initial and steady fragments. FLAC level 0 passes sample/video checks but is
not promoted merely because its encoder stage can be cheaper.

No new worker pool or compiled-module cache is admitted. Cold/warm full startup
cost is measured, but no isolated pool benefit or credential/decoder-state teardown
proof exists. Software YUV/GPU remains the existing experimental option with RGB
fallback. The historical YUV report retains intermittent seek failures and failed
movie playback gates; no matching new YUV artifact or broader fidelity qualification
is claimed. Packet/configuration adapters remain in place and their tests pass.
Arbitrary GPU effects, WebCodecs audio and broader separate-track MSE are deferred;
rejected transport, routine handoff and general video transcoding remain excluded.

## Final-artifact cost screen

The 1280×720/30 fps, 16-second H.264 B-frame + PCM24 fixture is recorded in
`results/optimization-completion/benchmark-fixture.json`. The retained harness
measures open, optional subtitle attachment, observed video, ten seconds of
playback and destroy. Cold means a fresh browser, not a flushed OS cache; warm
means one preceding open/play/destroy. CDP CPU includes reported browser processes
and newly observed process lifetime CPU. Summed process RSS can double-count pages;
external OS media services are excluded. No physical audio-onset or display latency
claim is made. Two trials per setting/plan are a short screen, not endurance data.

FLAC setting screen (`flac-settings/cost-1789520752161/result.json`):

| Setting / condition | Browser CPU seconds | Peak summed RSS MiB | Observed video ms | Generated bytes |
| --- | ---: | ---: | ---: | ---: |
| Level 5 cold | 3.337 | 946 | 682 | 6,182,478 |
| Level 0 cold | 3.318 | 1097 | 508 | 6,685,027 |
| Level 0 warm | 3.146 | 988 | 266 | 6,685,027 |
| Level 5 warm | 3.223 | 1112 | 283 | 6,182,478 |

Level 0 saves less than 3% of observed total CPU in either pairing while producing
8.1% more bytes. The observations are too few to attribute a small CPU difference
to compression; level 5 remains the default. Preparation is included, not moved
outside the measurement. Engine hashes are recorded for each trial.

The first 720p FLAC+ASS+gain seek screen failed both Native trials. It exposed an
inherited frame-verifier assumption: a playing clock must still be within 1 ms of
the seek target when the compositor callback runs. The fix briefly holds the
media clock during buffered seek verification, then restores the captured play
intent. It preserves workers, MSE, SourceBuffers and forward preparation. The
exact-target/covering-frame assertion is retained, not widened. Both paused and
playing intent now have a contract regression; the failed raw run remains under
`final-cost/cost-1789520825299/`. Hybrid passed that original screen.

The corrected complete-plan screen passes all four trials
(`final-cost/cost-1789520946665/result.json`):

| Plan / condition | Browser CPU seconds | Peak summed RSS MiB | Observed video ms | Verified seek / including refill ms |
| --- | ---: | ---: | ---: | ---: |
| Native FLAC + ASS + gain cold | 5.295 | 1021 | 909 | 26 / 69 |
| Hybrid ASS + gain cold | 6.146 | 1156 | 1393 | 464 / 464 |
| Hybrid ASS + gain warm | 6.058 | 1163 | 613 | 442 / 442 |
| Native FLAC + ASS + gain warm | 4.974 | 1074 | 303 | 21 / 21 |

This screen includes a forward buffered seek near five seconds and Native producer
refill, plus teardown. Native backend/worker/MediaSource/SourceBuffer identities
remain unchanged. All workers retire. Hybrid uses the same ASS attachment and gain
request. CPU differences in this fixture do not establish an automatic ranking or
universal hardware acceleration. Startup includes subtitle attachment replacement;
ordinary Native playback avoids the optional assets entirely.

## Final validation, packaging and saved streaming

Final root contracts pass 36/36; the assembled saved-streaming source compiles and
passes 59/59 integration contracts in `build/optimization-streaming-24/streaming`.
The assembly starts from f2491f62c777fa55225aed9b0b7ecf2e340accf7 and preserves its
AVIO, worker retirement, decoder generations, manifest/timeline ownership, window
anchors, source locks and patches. The root mpv/FFmpeg 7.1.1 playback engines and
optional FFmpeg 9.0.1 preparation engine retain distinct matching JS/Wasm pairs.
These are assembly/contract checks, not end-to-end streaming or ABR/live admission.
File adaptation does not qualify HLS/DASH/CMAF adaptation.

Final FLAC original-edge and multi-audio decode-back pass; final Opus original-edge
and marker packet/delay/padding checks pass. Final gain checks pass all three modes
in Chrome and Firefox, including digital attenuation, identity, restored unity,
source replacement and destroy during blocked resume. Firefox also passes the
playing buffered-seek regression with nonzero-start FLAC+ASS+gain. Earlier full
automatic-selection and public-API suites pass with restored reference fixtures;
the fixture hashes/provenance and the initial missing-fixture failure are retained.

The installed package checks exercise TypeScript exports, manifest hashes, original
Native without optional engine loading, Hybrid, Software, packet-copy remux,
external ASS, FLAC, Opus and FLAC+ASS+gain, seeking and cleanup. Eight package-10
cases pass. Packaging preserves notices and places preferred source companions
beside the runtime archive. Review found that the combined ASS+adaptation package
omitted the adaptation source from SHA256SUMS (its per-engine manifest hash was
already present). The packager now records both companions independently; a
permanent copy-assets regression verifies both file hashes and checksum entries.
Package 12 contains this fix; exact results and hashes are in the final logs and
checkpoint below. This does not close clean-build/source-correspondence release
qualification. Release-tag attempts for either optional engine and packaging the
failed first-fragment setting are explicitly rejected without creating an output.

Evidence directory: `results/optimization-completion/`. Key logs:
`final-contracts.log`, `final-streaming-build-24.log`,
`final-streaming-contracts-24.log`, `final-flac.log`, `final-opus.log`,
`final-gain.log`, `final-gain-firefox.log`, `final-ass-firefox.log`,
`final-consumer.log`, `final-consumer-12.log`, `final-copy-assets-12.log`,
`source-companion-before.log`, `package-gates.json`.
Historical failures remain alongside passing reruns.

Historical package-12 optional artifacts were `build/adaptation-opus-01/engine-1789520173100009000`
and `build/native-ass-02`. Local package candidate: `build/optimization-package-12`.
`results/optimization-completion/checkpoint-delivery/` contains the binary integration
patch and SHA-256 inventory, including untracked new runtime sources and evidence.
At that historical checkpoint, HEAD was f97588443ff4d2a043a2fd8500fb73bd45e656e1
and the work was uncommitted. The later source push is recorded at the top.

## Historical package-12 blockers and reruns

At that checkpoint, the program remained incomplete: progressive long unequal tails have no qualified
continuation implementation; clean optional-runtime release correspondence and
broader source/browser/endurance qualification remain open. Embedded Native ASS,
Opus+ASS and automatic adaptation are not admitted. Legacy error-message adapters
have not all been migrated to typed engine errors. No Safari/mobile, casting/PiP
subtitle destination or physical A/V qualification is implied.

```sh
npm run build
node --test tests/plan-admission.mjs tests/optimization-contracts.mjs tests/remux-buffering.mjs tests/native-selection.mjs tests/retained-codec-worker.mjs tests/video-codec-config.mjs
CASES=original-edge,multi-audio RESULT_ROOT=results/optimization-completion/rerun node tests/audio-adaptation.mjs
PROFILE=opus CASES=original-edge,opus-markers RESULT_ROOT=results/optimization-completion/rerun node tests/audio-adaptation.mjs
PROFILE=opus node tests/audio-adaptation-lifecycle.mjs
BROWSER=firefox PROFILE=opus CASES=bounded-local-gain,authenticated-range,destroy-blocked-read,incorrect-range node tests/audio-adaptation-lifecycle.mjs
CASES=audio-tail,video-tail RESULT_ROOT=results/optimization-completion/rerun node tests/optimization-review-regressions.mjs
node tests/in-place-gain.mjs
BROWSER=firefox node tests/in-place-gain.mjs
node tests/native-ass.mjs
BROWSER=firefox node tests/native-ass.mjs
INTEGRATION_ROOT=build/optimization-streaming-24/streaming RETAINED_WORKER=build/optimization-streaming-24/streaming/web/filter-retained-engine-worker.js node --test experiments/streaming-modernization/integration/*.test.mjs
BETA_ARCHIVE=build/optimization-package-12/demuxe-0.3.0-beta.3.tgz node --test tests/copy-assets.mjs
BETA_ARCHIVE=build/optimization-package-12/demuxe-0.3.0-beta.3.tgz ADAPTATION_FIXTURE=build/optimization-fixtures/long-pcm.mkv CASES=automatic-local,hybrid-pin,software-pin,native-remux,native-external-ass,native-adaptation,native-opus,native-adaptation-ass-gain node tests/beta-consumer.mjs
FIXTURE=build/optimization-fixtures/benchmark-720p.mkv ASS=1 GAIN=.5 QUICK=1 RESULT_ROOT=results/optimization-completion/rerun-cost node tests/audio-adaptation-cost.mjs
```

Run performance screens alone, not concurrently with qualification or builds.
The unequal-tail tests passing means predictable rejection plus a working Hybrid
reference; it does **not** mean Native supports those tails.

## Final package confirmation

Package 12 passes all eight installed-consumer playback cases and all six
asset/source-companion checks. Its SHA-256 is
`ab336d56a2c8cb3106fe75d300badb16d8fd28c02d88e87d592f3c0e97faf855`. All 61 served runtime files were
matched to its manifest before the final paired benchmark; the proof is
`final-benchmark-runtime-hashes.json`. No engine or runtime source changed afterward.
The source companion hashes are in the package's SHA256SUMS and local checkpoint.

Final package cost run: `final-package-cost/cost-1789521577115/result.json`.
This repeats the same 720p complete-plan screen after the final capability fix.

| Plan / condition | Browser CPU seconds | Peak summed RSS MiB | Observed video ms | Verified seek / including refill ms |
| --- | ---: | ---: | ---: | ---: |
| native ASS + gain / cold | 5.705 | 1056 | 672 | 14 / 57 |
| hybrid ASS + gain / cold | 6.724 | 1113 | 983 | 280 / 280 |
| hybrid ASS + gain / warm | 6.374 | 1144 | 646 | 466 / 466 |
| native ASS + gain / warm | 5.352 | 1166 | 334 | 25 / 69 |

Native in this table includes FLAC preparation; Hybrid includes mpv audio and
WebCodecs video. The earlier scope and measurement limitations still apply.
All four final trials pass, with Native presentation resources retained across
the seek and no workers remaining after destroy. These observations do not change
automatic ranking.

The original multi-audio fixture's second track is 44.1 kHz, so its Opus selection
correctly rejected. That failed attempted qualification is preserved in
`final-opus-firefox.log`; no resampling permission was added. A separate two-track
48 kHz fixture (`opus/multi-fixture.json`) now passes selected-track Opus accounting
in Chrome and Firefox (`final-opus-multi*.log`). To repeat:

```sh
PROFILE=opus CASES=opus-multi-audio node tests/audio-adaptation.mjs
BROWSER=firefox PROFILE=opus CASES=opus-multi-audio node tests/audio-adaptation.mjs
```

| Complete plan | Admission | Actual browser evidence |
| --- | --- | --- |
| Native direct / packet-copy remux | Existing automatic subset | Chrome/Firefox existing suites; installed Chrome package |
| Native gain | Requested scalar [0,1] | Chrome/Firefox digital output and in-place identity |
| Hybrid scalar filter + gain | Explicit filter qualification option | Chrome/Firefox; video remains WebCodecs |
| Software gain | Requested scalar [0,1] | Chrome/Firefox digital output and in-place identity |
| Native direct + ASS / remux + ASS | Explicit external ASS option, file presentation | Chrome/Firefox |
| Native FLAC + ASS / FLAC + ASS + gain | Explicit Native FLAC and ASS options | Chrome/Firefox; final Chrome package and 720p paired cost |
| Native Opus / Opus + gain | Explicit Native profile and lossy permission | Chrome/Firefox limited source subset and lifecycle; final Chrome package |
| Opus + ASS, embedded Native ASS, long unequal tails | Rejected / not implemented | No support claim |
| Native file adaptation for HLS/DASH/CMAF | Gated | No streaming adaptation qualification |

This post-build confirmation adds evidence to the repository report; the frozen
package includes the report as it stood at packaging. Its runtime bytes are those
verified and benchmarked above. `delivery.json` provides the machine-readable
closeout. This was a local, uncommitted snapshot before the source push.


The final Opus+gain cost screen also passes four trials
(`final-opus-cost/cost-1789521758993/result.json`), using the same 720p source and
package-matched runtime. ASS is disabled because that Opus combination is not
qualified. Hybrid preserves original decoded audio and the requested gain; Opus
intentionally adds a lossy generation, so lower cost cannot justify selecting it
without policy permission.

| Plan / condition | Browser CPU seconds | Peak summed RSS MiB | Observed video ms | Verified seek / including refill ms |
| --- | ---: | ---: | ---: | ---: |
| native + gain / cold | 4.099 | 953 | 681 | 14 / 79 |
| hybrid + gain / cold | 5.237 | 1040 | 702 | 440 / 440 |
| hybrid + gain / warm | 4.892 | 1040 | 298 | 438 / 438 |
| native + gain / warm | 3.677 | 1101 | 239 | 10 / 118 |

Repeat with `PROFILE=opus FIXTURE=build/optimization-fixtures/benchmark-720p.mkv
GAIN=.5 QUICK=1 node tests/audio-adaptation-cost.mjs` (single shell command).
The earlier `checkpoint-final` remains an immutable pre-Opus-benchmark snapshot;
`checkpoint-delivery` is the final patch/evidence inventory. No runtime changed
between these checkpoints, only the benchmark harness and closeout evidence.


## Native ASS review fixes

The four findings in `results/optimization-review-current/REVIEW.md` are fixed:

- **Source versus output dimensions:** the worker passes Native video geometry
  separately from the canvas raster size. libass storage size remains tied to that
  source geometry through resizes. A 10-pixel unscaled border on 640×360 video is
  5 pixels at 320×180 and returns to 10 when restored. Zero video geometry uses
  libass's script-layout fallback; no new audio-only or anamorphic qualification
  is claimed from the square-pixel video test.
- **Rejected subtitle selection:** native parsing retains the accepted ASS track
  until the candidate parses and passes its cue budget. The controller retains the
  current bitmap/visibility, blocks intervening render requests during the track
  transaction, and invalidates stale output. A rejected malformed attachment leaves
  the old selection visible and able to render fresh output after seek/toggle.
- **Construction cleanup:** Worker creation precedes DOM attachment. Subsequent
  synchronous construction failures tear down the worker, observer, listeners and
  canvas and restore altered styles/presentation flags. Three injected Worker
  construction failures now leave zero orphan canvases rather than one per retry.
- **Visibility versus selection:** Native ASS selected-track metadata no longer
  depends on whether subtitles are visible. Hide/show preserves the selected ID.

The changed render ABI is versioned. The worker checks `subtitle_api_version() == 2`
before initialization, and the packager rejects older ASS manifests. Matching
`subtitles.mjs` and `subtitles.wasm` were rebuilt from the pinned libraries into
`build/native-ass-04`; no library source lock or saved streaming contract changed.
Clean release/source correspondence remains a separate open gate.

Permanent regressions:

```sh
node tests/native-ass-selection-regressions.mjs
BROWSER=firefox node tests/native-ass-selection-regressions.mjs
node tests/native-ass-style-regressions.mjs
BROWSER=firefox node tests/native-ass-style-regressions.mjs
node tests/native-ass.mjs
BROWSER=firefox node tests/native-ass.mjs
```

Both browsers pass all four reviewed regressions, all four existing Native ASS
combinations, and the blocked-Wasm-load destroy case. The explicit old-interface
fault injection runs in Chrome. Its initial Firefox attempt is preserved: Firefox
worker module imports bypassed that Playwright interception, so that additional
case is marked skipped there; the four actual fix regressions run in both browsers.
Root contracts remain 36/36, and the rebuilt saved-streaming source assembly
`build/optimization-streaming-25/streaming` compiles and passes 59/59 contracts.
No modernized streaming end-to-end qualification is implied.

New evidence and package checks are under `results/optimization-ass-fixes/`.
The original review reproducers/results and package artifacts remain unchanged.
Package-13 installed-consumer and asset-copy reruns use:

```sh
BETA_ARCHIVE=build/optimization-package-13/demuxe-0.3.0-beta.3.tgz ADAPTATION_FIXTURE=build/optimization-fixtures/long-pcm.mkv CASES=automatic-local,native-external-ass,native-adaptation-ass-gain node tests/beta-consumer.mjs
BETA_ARCHIVE=build/optimization-package-13/demuxe-0.3.0-beta.3.tgz node --test tests/copy-assets.mjs
```

This fix does not resolve long unequal-tail adaptation, embedded Native ASS,
Opus+ASS, automatic adaptation or release promotion. No new performance improvement
is claimed; previous benchmark numbers retain their original artifact identities.
