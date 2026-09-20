<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Shaka production-route qualification

This refactor replaces Demuxe's production manifest rewriting/scheduling helpers
with Shaka Player 5.2.11. It does not turn upstream feature support into a Demuxe
qualification claim. Evidence below is from bounded synthetic Chrome/macOS tests
and exact-package consumer checks, with source, assets, harness and browser
identities retained in each result.
The catalogue and CPU runs below precede the later review fixes to seek rejection,
dynamic-timeline classification and initial runtime cancellation. Their results
remain tied to their recorded source hashes; review-fix regressions are recorded
separately below.

## Default adaptive catalogue

[Fresh four-player run](../results/head-to-head/shaka-catalogue-01/REPORT.md):
24 cases, 12 passed and 12 failed. Demuxe passed all six affected rows. The
comparison-player failures remain failures; they are not fixture or environment
blockers. This run predates the subsequent authorization-default, public track-ID,
live-permission and pinned-audio edge-case fixes, which have separate regressions.

| Fixture | Demuxe automatic plan | Result |
| --- | --- | --- |
| H.264/AAC HLS TS VOD | Native Direct | Pass |
| H.264/AAC HLS fMP4 VOD | Native Direct | Pass |
| HEVC/AAC HLS fMP4 VOD | Native Direct on tested Chrome/platform | Pass |
| H.264/AAC DASH fMP4 | Shaka/MSE | Pass; former Hybrid pause failure is not present on this route |
| AV1/Opus DASH WebM | Shaka/MSE | Pass |
| H.264/AAC sliding live HLS | Shaka/MSE | Pass; bounded window progression, not a long live soak |

Checks include marked moving video and channel tones, pause/resume, rate,
VOD seeking/EOF or live-window progression, and cleanup. Existing unrelated file
rows keep their original evidence. Older custom-route streaming CPU numbers were
removed from README rather than relabelled as Shaka results.

## Controlled Shaka and fallback catalogue

[Controlled run before review fixes](../results/head-to-head/shaka-controlled-01/REPORT.md):
9 passed and 2 failed. All six required profiles were attempted through Shaka,
using a public bandwidth ceiling to exclude Native Direct.

| Fixture / explicit route | Result |
| --- | --- |
| H.264/AAC HLS TS / Shaka | Pass |
| H.264/AAC HLS fMP4 / Shaka | Pass |
| HEVC/AAC HLS fMP4 / Shaka | Fail: runtime VideoToolbox decode error after initial output |
| H.264/AAC DASH fMP4 / Shaka | Pass |
| AV1/Opus DASH WebM / Shaka | Pass |
| H.264/AAC sliding HLS / Shaka | Pass |
| H.264/AAC HLS fMP4 / plain browser video | Pass |
| H.264/AAC HLS fMP4 / forced Hybrid | Fail: seek deadline |
| H.264/AAC HLS fMP4 / forced Software | Pass |
| AV1/Opus DASH WebM / forced Hybrid | Pass |
| AV1/Opus DASH WebM / forced Software | Pass |

HEVC's first causal failure was `PIPELINE_ERROR_DECODE`, VideoToolbox OSStatus
`-17694`, at approximately 1.97 seconds; the later interrupted-play error occurred
during recovery. Native Direct passed the same authored HEVC fixture. Controlled
Shaka HEVC is therefore **not qualified** on this tested profile. The explicit
quality ceiling correctly prevented fallback from silently dropping that intent.
The Hybrid HLS seek failure likewise cannot produce a valid CPU comparison.

A [standalone differential](../results/shaka/hevc-differential-2026-09-20T22-44-03.345Z/result.json)
reproduced the same HEVC error at 1.974332 seconds with plain Shaka, both with
matched controls and with uninterrupted playback. Plain Native passed pause,
rate and seeks on that source. This excludes the Demuxe adapter/network policy
as a necessary cause; it does not establish the exact Shaka/MSE/browser defect.

## Matched whole-player CPU

[Raw performance windows](../results/head-to-head/shaka-performance-01/REPORT.md)
and [derived medians](../results/shaka/performance-analysis-01.json) retain all
21 attempted windows: **15 accepted, 0 failed, 6 instrumentation-blocked**.
Each measured route has three accepted rounds, five seconds warmup and twenty
seconds steady measurement, with alternatives rotated and no concurrent tests,
builds or downloads. Fixtures are 36-second, 320×180, 30 fps synthetic sources on
the recorded Chrome/macOS host; this is not a movie-resolution power benchmark.

| Fixture / route | Median CPU, % of one core | Three-round range |
| --- | ---: | ---: |
| H.264/AAC HLS fMP4 / plain browser Native | 29.8% | 26.3–31.7% |
| H.264/AAC HLS fMP4 / Demuxe Shaka | 28.6% | 28.3–30.8% |
| H.264/AAC DASH fMP4 / Demuxe Shaka | 29.1% | 27.0–29.7% |
| AV1/Opus DASH WebM / Demuxe Shaka | 29.3% | 27.5–30.3% |
| AV1/Opus DASH WebM / Demuxe Hybrid | 46.8% | 44.2–47.3% |
| HLS fMP4 and AV1 DASH / Demuxe Software | Not measured | Frame-counter qualification missing |

HLS Shaka and browser Native have overlapping round ranges: the evidence supports
comparable steady-state cost, not a speedup claim. AV1 DASH Shaka used **37.4% less
median CPU than Hybrid** in this matched fixture (17.5 percentage points of one
core). Native Direct still avoids Shaka's download and initialization when it can
correctly satisfy the source. No startup CPU, physical energy or general codec
advantage follows from these steady-state numbers.

Software passed playback correctness for both profiles, but the existing harness
has no established Software frame-presentation counter. Its six windows therefore
remain **measurement blockers**, not decoder failures or invented CPU results.
The failed controlled HEVC and Hybrid HLS seek cases were excluded before timing.
Historical custom-scheduler CPU results were not mixed with these measurements.

## API, source policy and cleanup

[Eight-scenario lifecycle run](../results/shaka/lifecycle-2026-09-20T22-33-53.076Z/result.json)
passed audio selection with an actual 880 Hz output oracle, stable source-scoped
IDs, legacy `selectTrack` IDs, visible segmented WebVTT, visibility changes,
bandwidth ceiling, representation selection, source replacement, and cancellation.

An injected startup incompatibility reached real Hybrid playback while retaining
same-origin cookie authorization. A runtime Shaka error recovered through Hybrid
and preserved paused position, rate, volume and subtitle visibility. Authorization
refresh succeeded; persistent 403 stopped without codec fallback. Every case
checked that surfaces and workers were removed. The no-isolation case played
DASH and pinned HLS without `SharedArrayBuffer`/cross-origin isolation. `live:true`
is permission, so a finite VOD still publishes a finite duration and VOD state.

A [final pinned-audio browser regression](../results/shaka/lifecycle-2026-09-20T22-37-45.949Z/result.json)
confirmed that selecting French audio retains the high source representation,
320px output and disabled ABR. Unit negatives reject incompatible video/audio
pairs and bandwidth violations before changing the selected variant.

Transport unit checks cover request ownership across retries, allowed origins,
headers/credentials and refresh, denied redirects, retirement/cancellation,
bounded responses, strong validators and exact byte ranges. Native Direct
manifest failure checks accept ordinary HTTP 200 endpoints without demanding a
random-access file contract; authorization failure remains terminal.

## Ordinary-file regressions

[Three-mode API regression evidence](../results/player-api/shaka-refactor-regression.json)
covers all 21 checks: 20 passed in the full run, then the remaining assertion
passed separately after correcting a pre-existing stale message match. The
replacement assertion checks the public error code and preservation of the
working source. Runtime hashes were unchanged between runs; this is not reported
as a fictional single 21/21 run. Native, Hybrid and Software file playback,
filters, track selection, state-preserving transitions, cancellation and worker
cleanup passed. Missing synthetic inputs were regenerated from recorded recipes.

## Build and exact package

[Validation record](../results/shaka/validation-01/summary.json): 95 focused tests
passed. TypeScript build, generated SPDX stamping and core dependency boundaries
passed. [Package validation](../results/shaka/packaging-validation-01/summary.json)
records all licensing, copying, asset-pin, preferred-source and release-gate unit
checks with their logs and hashes.

The pre-review-fix archive SHA256 is
`d7ff5794192d02225ca17bcfda491e2dd2d40c7b810459f358dd609067cfbcbc`.
[Chrome 4/4](../results/shaka-package/chrome-2026-09-20T22-38-15.524Z/result.json)
and [Firefox 4/4](../results/shaka-package/firefox-2026-09-20T22-38-31.224Z/result.json)
passed offline consumer installation, strict public TypeScript consumption,
asset-copy integrity, ordinary Native Direct plus controlled HLS TS/fMP4 and
DASH fMP4 playback, pause, seek and cleanup. The ordinary file did not request
Shaka. The archive contains none of the three retired manifest/subtitle helpers.
This is runtime/package evidence for the captured source, not publication approval.

Shaka's non-UI library is 829,754 raw bytes / 272,773 gzip bytes and loads only
for its execution plan. The 98,070-byte optional transmuxer worker is packaged but
not enabled; Shaka's main-thread execution avoids retaining its shared worker.
Notices, preferred source and release packaging are documented in
[runtime assets](RUNTIME-ASSETS.md) and [licensing](LICENSING.md).

## Reproduction

```sh
npm run test:shaka
python3 tests/head-to-head/prepare-streaming.py \
  build/head-to-head/assets-component-isolation-01 \
  build/head-to-head/assets-shaka-new
node tests/head-to-head/run.mjs --catalogue --headed \
  --assets build/head-to-head/assets-shaka-new \
  --controlled-streaming --streaming-backends \
  --cases video.default.hls-fmp4,demuxe.auto.hls-fmp4,demuxe.hybrid.hls-fmp4,demuxe.software.hls-fmp4 \
  --output results/head-to-head/shaka-new-correctness
```

`--controlled-streaming` supplies a public bandwidth ceiling to automatic/native
Demuxe cases, forcing controlled Shaka execution. Forced Hybrid/Software cases
receive the same single-rendition fixture without a ceiling they cannot enforce.
`--streaming-backends` adds those explicit comparison lanes to the existing
catalogue harness. It does not change production routing. The preparation script
verifies all inherited fixture/dependency hashes and records current source hashes;
normal `setup.py` also includes the pinned Shaka assets.

CPU runs require the matching passed correctness summary, exact asset/harness
and browser identities, `--performance --exclusive --headed`, at least three
rotated rounds, five seconds warmup and twenty seconds measurement. CPU is the
existing CDP process CPU delta divided by wall time, as a percentage of one core.
No screenshot/audio-analysis instrumentation runs during measurement. A failed
correctness route or unstable process/frame window cannot produce a CPU claim.

## Review-fix regressions

[Review-fix validation](../results/shaka/review-fixes-01/summary.json) records the
fresh build, package and 54 passing focused tests. These cover shared runtime
waiters, cancellation of the final fetch, removal of pending execution scripts,
retry after cancellation and dynamic-to-VOD state changes.

The [expanded lifecycle run](../results/shaka/lifecycle-2026-09-20T23-10-03.981Z/result.json)
passed 10 of 11 checks, including real finite HLS EVENT permission/state and
initial runtime-fetch cancellation followed by successful playback. Its expired
seek case could not reach the test action: the fixture had too few segments for
Shaka to expose a DVR window. The [corrected seek fixture](../results/shaka/lifecycle-2026-09-20T23-11-31.724Z/result.json)
passed separately with identical runtime source hashes. It confirms
`INVALID_ARGUMENT`, unchanged backend/surface/source identity, no excluded
streaming plan, and a subsequent successful seek and playback. This is coverage
across two recorded runs, not a single 11/11 run.

The loader now fetches its same-origin runtime with cancellation, then uses a
temporary Blob script. CSP deployment requirements are documented in
[runtime assets](RUNTIME-ASSETS.md). Prior catalogue, CPU and archive evidence
above retains its original source scope.

The review-fix archive SHA256 is
`ab0fd255f52149cb7bab10eeadaffd6d1dd5c36084624f4b3a94f7deac9b2112`.
[Chrome 4/4](../results/shaka-package/chrome-2026-09-20T23-12-59.866Z/result.json)
and [Firefox 4/4](../results/shaka-package/firefox-2026-09-20T23-13-25.095Z/result.json)
passed exact-package Native Direct, Shaka HLS TS/fMP4 and DASH fMP4 playback,
controls and cleanup with CSP permitting same-origin fetch, Blob scripts and
the existing Wasm compilation requirement. Neither permits JavaScript
`unsafe-eval`. The initial CSP run passed all three Shaka cases but blocked the
ordinary file's metadata probe because the harness omitted `wasm-unsafe-eval`;
that failed evidence is retained in the validation record.

## Qualification limits

Safari, mobile, real-world servers, prolonged live/DVR, automatic ABR under shaped
networks, discontinuities and multi-period transitions need their own fixtures.
Shaka owns those mechanisms; this campaign does not certify every upstream
feature. DRM has no Demuxe license contract. Growing byte-range live resources
are outside the stable range-resource identity contract. Cross-origin media
needs explicit permitted origins and server CORS; authenticated redirects are
rejected. Explicit track or quality intent must be preserved or the fallback
rejects. No general HDR, surround-fidelity, hardware-acceleration, device-energy
or universal CPU advantage is claimed.

The archive remains a developer beta candidate. These checks do not replace all
release, real-device, long-movie or physical-output gates.
