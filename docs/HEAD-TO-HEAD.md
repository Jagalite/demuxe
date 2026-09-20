<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Rerunnable player comparison

The maintained harness is `tests/head-to-head/`. It compares the current Demuxe
source with pinned Movi 0.4.0, libmedia AVPlayer 1.3.1, and ordinary HTML video.
These competitor versions reproduce the earlier study's baselines; they are not
claims about the latest available releases.

Each run selects explicit cases, validates a frozen asset snapshot, starts its
own range-capable server and fresh browser instances, and writes a new result
directory. The original matrix has 28 cases: seven player/configuration choices
across four media/feature combinations. Edit the matrix and adapters together
when adding another player, route, codec, track layout or feature.

## Prepare once

From the repository root, install the locked development dependencies with
`npm ci` if they are absent. Python 3.12+, Node 22+, FFmpeg/ffprobe (including
libx264, AAC, geq and drawbox), and the selected browser are required. The default
browser is installed Google Chrome through Playwright's `chrome` channel.

```sh
npm run fixtures:head-to-head -- --output build/head-to-head/assets-01
```

The output directory must not already exist. Preparation downloads hash-pinned
competitor packages/runtime files, generates 36-second synthetic media, and
compiles the current Demuxe TypeScript into that isolated directory. It copies
currently available local engines and their notices without changing the live
checkout or substituting an older engine from a lab. It records missing engines
explicitly. Build needed engines using the project's normal build process before
preparing another snapshot; preparation does not silently rebuild them.

An optional local cache avoids downloading identical dependency bytes:

```sh
npm run fixtures:head-to-head -- \
  --output build/head-to-head/assets-02 \
  --lab /absolute/path/to/preserved/head-to-head-lab
```

The lab argument is optional and portable. Every reused dependency must match
`tests/head-to-head/assets.lock.json`. Neither the old Demuxe binary nor its old
fixtures are used. A failed setup preserves `commands.json` and has no completed
`manifest.json`; use a new directory after diagnosing it. `--duration 90` creates
a longer fixture for longer performance windows.

The prepared snapshot records the source revision and dirty player diff, source
hashes, generated runtime hashes, available engines, dependency hashes, FFmpeg
version, generator commands, fixture stream metadata and video-packet identity.
Regeneration on another FFmpeg version may produce different media bytes: compare
only runs using the same prepared manifest, not just the same fixture name.

## Compare an explicit Demuxe path

The catalogue defaults to Demuxe auto selection. `--demuxe-mode native` (or
`hybrid` / `software`) pins its public mode without changing production routing.
Case IDs include the mode, so alternative results remain separate from defaults:

```sh
node tests/head-to-head/run.mjs \
  --assets build/head-to-head/assets-with-engines-01 \
  --catalogue --demuxe-mode native \
  --cases demuxe.native.hls-fmp4,demuxe.native.hls-hevc \
  --output results/head-to-head/demuxe-native-hls-01
```

Use a fresh output directory for each run. This reuses the same explicit HLS source
metadata, fixture bytes, and correctness checks as the auto-mode comparison.
Do not replace auto-mode failures with pinned-mode passes in aggregate counts.

The [recorded Native HLS run](../results/head-to-head/demuxe-native-hls-01/REPORT.md)
passed both cases. Add `--alternative results/head-to-head/demuxe-native-hls-01`
to the catalogue renderer alongside the existing primary/supplement arguments.
It verifies the alternative evidence and matching asset/browser identities, marks
confirmed alternatives purple, and preserves default-mode outcome totals.

## Verify automatic HLS routing and fallback

The [routing-fix run](../results/head-to-head/demuxe-auto-hls-fix-01/REPORT.md)
uses `build/head-to-head/assets-native-hls-fix-01` and the four
`demuxe.auto.hls-ts,demuxe.auto.hls-fmp4,demuxe.auto.hls-hevc,demuxe.auto.hls-live`
cases with `--catalogue`. All four passed; the VOD cases now select Native.

The separate compatibility fallback regression is rerunnable:

```sh
node tests/head-to-head/hls-fallback.mjs \
  build/head-to-head/assets-native-hls-fix-01 \
  results/head-to-head/demuxe-hls-fallback-new
```

It injects a Native compatibility rejection and requires actual Hybrid marked
video/audio plus cleanup. It is fault-injection evidence, not a default playback
result, and uses its own hash inventory. Keep its totals separate.

## Refresh engines without changing the media

The recorded [clean build](../results/head-to-head/engine-build-01/README.md) and
[56-case Demuxe follow-up](../results/head-to-head/demuxe-with-engines-01/REPORT.md)
use this process. The follow-up has no missing-engine blockers.

After building missing engines, prepare a new snapshot while reusing the previous
snapshot's exact fixture bytes:

```sh
npm run fixtures:head-to-head -- \
  --fixtures-from build/head-to-head/assets-expanded-03 \
  --output build/head-to-head/assets-with-engines
npm run test:head-to-head -- --catalogue --cases demuxe \
  --assets build/head-to-head/assets-with-engines \
  --output results/head-to-head/demuxe-with-engines
```

Preparation verifies every reused fixture against the parent manifest and retains
its original generation records. It compiles the current TypeScript and copies the
currently installed engine assets into the fresh snapshot. Reusing media does not
reuse the old Demuxe runtime. Build provenance should accompany any installed
engine files; a successful build alone does not establish playback correctness.

## Run correctness

```sh
# List all exact case IDs without launching a browser.
npm run test:head-to-head -- --list

# All 28 declared cases.
npm run test:head-to-head -- \
  --assets build/head-to-head/assets-02 \
  --output results/head-to-head/my-correctness-run

# A player, or comma-separated exact IDs, selects a bounded subset.
npm run test:head-to-head -- \
  --assets build/head-to-head/assets-02 \
  --cases video.default.aac-mp4,demuxe.auto.aac-mp4,movi.native-first.aac-mp4,libmedia.prefer-mse.aac-mp4
```

Without `--output`, the runner creates a timestamped result directory. It never
overwrites an existing run. The default is headless correctness. Use `--headed`
for a visible browser run. For Playwright's bundled Chromium use `--channel ''`;
for its Firefox use `--browser firefox --channel ''`. Install those browsers with
the matching Playwright version beforehand. Missing browser assets are blocked,
not successful tests. Only tested browser/profile combinations are qualified by
their individual records.

| Fixture | Requirements |
| --- | --- |
| `aac-mp4` | H.264 + AAC, MP4 |
| `aac-mkv` | The same compressed video/audio packets, Matroska |
| `pcm-mkv` | The same video packets, decoded signed-24-bit stereo audio |
| `pcm-ass` | PCM Matroska plus the exact ASS drawing and font |

Routes are plain video default; Demuxe auto/explicit Native; Movi default/native
preference; and AVPlayer default/MSE preference. A preference is not a forced
codec capability. Actual observed routes are retained in each case record.

Plain video, configured Native Demuxe and configured native-first Movi use the
same explicit host libass overlay for ASS. This measures an application integration,
not built-in ASS support. Default library routes request their documented built-in
integration. Missing subtitles fail correctness, even when video is smooth.

Each correctness case checks:

- Moving displayed output and a red/blue/green timeline marker from screenshots.
- Independent 440 Hz left / 880 Hz right decoded digital audio signals.
- Pause/resume, bounded 1.25x rate progression, forward/backward/far seeks, and
  final timeline settlement near EOF.
- Required magenta ASS drawing before and after seeks.
- Observed surface, AudioContext and worker cleanup before closing the browser.

These are bounded marked-output checks, not sample-exact decoding, physical speaker
output, calibrated A/V synchronization, exhaustive subtitle rendering or endurance.
The small 320x180 fixture is appropriate for compatibility and harness validation;
its performance cannot stand in for high-resolution real media. Video packet hashes
establish the fixture relationship, not browser output fidelity. The fixture uses
different channel tones to catch a missing, swapped or duplicated channel.

`passed`, `failed` and `blocked` are separate outcomes. A missing required current
engine is blocked. Unsupported audio or absent requested subtitles fail the tested
combination; they are not converted into a passing expected failure. The exit code
is nonzero if any selected case does not pass. A subset says nothing about omitted
cases. Interrupted runs stay incomplete and cannot pass the evidence verifier.

## Expanded catalogue correctness

`--expanded` prepares the 56 additional combinations from `planned.json` and
`expand.py`. `--catalogue` runs each against Native video, Demuxe automatic,
Movi default, and AVPlayer default: 224 recorded outcomes, including blockers.
The original four-fixture/seven-configuration matrix remains independently runnable.

```sh
npm run fixtures:head-to-head -- --expanded --output build/head-to-head/expanded-assets
npm run test:head-to-head -- --catalogue --assets build/head-to-head/expanded-assets \
  --output results/head-to-head/expanded-correctness
npm run verify:head-to-head -- results/head-to-head/expanded-correctness
```

Use fresh directory names for each preparation/run. Expanded generation needs the
listed FFmpeg encoders (including libx265, libsvtav1, libvpx, and the audio encoders).
Every row retains generated stream metadata or its preparation error. Unsupported
fixture generation blocks that row; it does not substitute another codec/layout.
Commands, catalogue, generator sources, and prepared-asset hashes accompany each run.

Audio-only cases omit video checks; video-only cases omit audio checks. Text subtitles
must render the fixture phrase before and after seeks, recognized with macOS Vision
(`swiftc` required); missing OCR infrastructure blocks qualification. ASS, PGS, and VobSub must display
the marked magenta drawing. PGS/VobSub fixtures also undergo an independent FFmpeg
overlay check before browser trials. Embedded subtitles remain embedded; the external WebVTT
case uses the player's external subtitle API or HTML track.

Multichannel inputs get a stereo playback/lifecycle screen, but discrete channel
fidelity remains blocked even if that screen succeeds (`screenPassed: true`). Tagged
10-bit HDR fixtures similarly screen decode/lifecycle only; they are not reference
HDR color material and cannot qualify tone mapping or physical HDR output. Such
blocked screens are ineligible for performance comparisons.

Live HLS serves a clock-driven, three-segment sliding window from the generated
36-second clip and records the actual playlists. Its bounded check requires continued
playback across updates (changing displayed video and marked audio), pause/resume, rate control and cleanup; VOD EOF checks do
not apply. It does not establish long-running live recovery, discontinuity handling,
or adaptive bitrate switching. VOD HLS/DASH cases retain seek and EOF requirements.

A controlled subtitle negative test uses `--negative-control hide-subtitles` with
`--cases video.default.h264-vtt`: it obscures the subtitle region while leaving
video/audio running and must fail rendered-text recognition.

Refresh the README and detailed tables only from verified completed results:

```sh
python3 tests/head-to-head/render-catalogue.py results/head-to-head/expanded-matrix-01 \
  --supplement results/head-to-head/expanded-subtitles-01 \
  --supplement results/head-to-head/expanded-subtitles-02 \
  --supplement results/head-to-head/expanded-live-01
```

Supplements replace only their exact player/fixture rows, preserve the original
outcomes, and link to their own asset/harness identities. Pilots and negative
controls are not pooled into the comparison.

No CPU benchmark or percentage-gain calculation is part of this catalogue screen.

## Performance is a separate gate

Run benchmarks only while no competing playback, benchmark or build is active.
`--exclusive` is the operator's explicit assertion of that condition; the runner
does not stop other people's processes or pretend it can prove machine idleness.
First obtain a matching **headed** correctness run with the final harness and
asset hashes, then use its summary:

```sh
npm run test:head-to-head -- --assets build/head-to-head/assets-02 \
  --cases video.default.aac-mp4,demuxe.auto.aac-mp4 \
  --headed --output results/head-to-head/headed-correctness

npm run test:head-to-head -- --assets build/head-to-head/assets-02 \
  --cases video.default.aac-mp4,demuxe.auto.aac-mp4 \
  --headed --performance --exclusive \
  --correctness results/head-to-head/headed-correctness/summary.json \
  --output results/head-to-head/performance-01
```

Performance requires the same asset manifest, harness/matrix and exact browser
profile as a passed correctness case. It runs at least three rotating-order rounds,
five seconds of warmup and twenty seconds of measurement, using a fresh browser
per trial. `--rounds`, `--warmup-seconds`, and `--measure-seconds` can increase
those bounds; prepare a longer fixture if needed.

Recorded metrics include API open wall time, CDP-listed browser-process CPU,
sampled summed RSS where available, position, native frame drops, errors and
server requests. Foreground loss, process turnover, stalled progression or
excessive frame drops reject the trial. Custom routes without comparable frame-drop
counters are explicitly blocked from this performance profile. They can still
run correctness. Add an independently justified counter contract before comparing
their costs as equally smooth playback.

Correctness analysers and screenshots are absent from scored playback. CDP and
state polling still add overhead. CPU excludes server work, external OS media
services, GPU energy and setup/warmup; API open time is not first frame or sound.
Summed RSS can double-count shared mappings. Fresh browsers do not flush OS caches.
Three rounds are a starting record, not statistical proof of a universal ranking.

## Inspect and verify results

Each completed run contains `REPORT.md`, `summary.json`, per-case records and
captures, the request trace, the asset manifest, a frozen harness under `files/`,
and `manifest.json` with hashes of the captured run files. Original dependencies
and large fixture/runtime bytes remain in the prepared `build/` snapshot; preserve
that snapshot for offline byte-identical reruns. Result records alone are not a
self-contained runtime distribution.

```sh
npm run verify:head-to-head -- results/head-to-head/my-correctness-run
npm run test:head-to-head:contracts

# Deliberately obscure real video. This must fail the displayed-marker check.
npm run test:head-to-head -- --assets build/head-to-head/assets-02 \
  --cases video.default.aac-mp4 --negative-control cover
```

An integrity pass means the recorded outcomes are intact, including failures and
blocks. It does not mean every player passed. The cover command intentionally exits
nonzero; preserve that record as evidence the visual acceptance gate is exercised.
Unit controls additionally reject silence, swapped/missing channels, wrong timeline
colors, changed performance identities, unsafe paths and malformed ranges.

Original harness code is Apache-2.0 where marked; the test HTML retains the project
integration grant. Synthetic fixtures/results are original Demuxe research material;
the font, Movi, AVPlayer, libass and linked dependencies retain their own licenses.
Pinned package notices are copied into the local asset snapshot. Captured source
under `files/` retains its SPDX notices and is not relicensed as result data.
This workflow neither publishes a player release nor certifies distribution rights.

The earlier September 16 comparison remains a separate historical study. Its
interrupted trials are not pooled with these new generated-fixture runs.

The [initial maintained run](../results/head-to-head/README.md) records all 28
correctness outcomes, the negative control, harness corrections and validation
limits. It contains no new performance measurements.
The [player-by-media route table](HEAD-TO-HEAD-ROUTES.md) shows the observed paths
and outcomes for each configuration, with links to the individual records.

## Qualify why a case uses Hybrid

[The current report](HEAD-TO-HEAD-HYBRID.md) covers all 17 Hybrid rows. Correctness
snapshots retain `selectionTrace`, `nativeVerificationFailures`, `mediaTracks`
and `audioParams`. Native failure observation preserves the original return/error
and is enabled only for correctness, never performance.

The audio/packaging hint probe and component report are rerunnable:

```sh
node tests/head-to-head/probe-hybrid-mse.mjs \
  results/head-to-head/demuxe-with-engines-01 \
  results/head-to-head/hybrid-mse-probes-new
python3 tests/head-to-head/explain-hybrid.py \
  --run results/head-to-head/demuxe-original-with-engines-01 \
  --run results/head-to-head/demuxe-with-engines-01 \
  --run results/head-to-head/demuxe-auto-hls-fix-01 \
  --run results/head-to-head/demuxe-hybrid-audit-01 \
  --run results/head-to-head/demuxe-hybrid-original-audit-01 \
  --probes results/head-to-head/hybrid-mse-probes-new \
  --output results/head-to-head/hybrid-qualification-new
```

Use fresh output directories. The report generator verifies run hashes and
requires actual Native audio-failure evidence for audio-driven rows; it does not
treat an admission-policy rejection as a browser codec failure. The exact browser
rerun commands and case selections are retained in each audit's `summary.json`.
