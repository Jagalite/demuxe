<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Streaming modernization staging area

This profile is **unqualified**. It does not change the root release source lock,
patch series, package API or served engine binaries. No commit/tag is needed to
test it. Preserve every failed attempt and use new output directories.

The [architecture decision](../../docs/STREAMING-ARCHITECTURE.md) defines ownership
and independent acceptance gates. Baseline restoration comes before replacing
streaming adapters or exposing quality controls.

## Current integrated candidate

Use `prepare.py --timeline` for the complete staged implementation, including
pinned libass, incremental AVIO, persistent manual/automatic quality, live
components, HLS discontinuities, DASH periods, subtitles and final-window updates.
The baseline and transport sections below describe independently retained stages;
their historical limitations do not describe every later overlay. See
[the current evidence status](../../docs/STREAMING-MODERNIZATION-STATUS.md) for
what has actually passed and what still blocks completion.

```sh
python3 experiments/streaming-modernization/prepare.py --timeline \
  --output build/modernization-final-01 --downloads /path/to/verified-archives
# Install the pinned tools and clean-build all three engines as below.
# From that prepared directory:
python3 scripts/package-beta.py --output ../modernization-runtime-01
# Back at the repository root, use those exact bytes for the broad gate:
python3 experiments/streaming-modernization/qualify-baseline.py --integration \
  --work build/modernization-final-01 --output build/modernization-checks-final-01 \
  --archive build/modernization-runtime-01/demuxe-0.3.0-beta.3.tgz \
  --stream-fixtures /path/to/aligned-ladder \
  --large-fixture /path/to/interleaved-large-segment \
  --streaming-fixture /path/to/bbb-stream.mp4
```

The full 58-job matrix additionally runs quality API/component/ABR, delayed candidate,
large-resource, network-failure, truthful-length container corruption, discontinuity/subtitle, live-expiry,
final-window and sustained-playback harnesses. Each writes a new evidence directory
and records its archive hash. Run browser performance workloads serially, with no
concurrent builds or fixture generation. See [source maintenance](MAINTENANCE.md)
and [the staged public API](STREAMING-API.md).

## Upstream selection

Checked official releases on 2026-09-14: [mpv 0.41.0](https://github.com/mpv-player/mpv/releases/tag/v0.41.0)
and [FFmpeg 9.0.1](https://ffmpeg.org/download.html). These are the newest stable
candidates tested in the isolated baseline. The final clean baseline passes all
seven workload groups and source/archive correspondence verification; see
[the evidence status](../../docs/STREAMING-MODERNIZATION-STATUS.md). Transport and
streaming integration retain separate acceptance gates.
`baseline/profile.json` records exact tag commits and downloaded archive hashes.
Emscripten stays at 4.0.14 for attribution of regressions. libxml2 moves from
2.13.8 to 2.15.4 because the old pin predates dictionary/URI/parser security fixes;
its exact revision and hash are also recorded in the profile. Other dependencies
remain pinned in the baseline; the later subtitle stage upgrades libass to 0.17.5.

Upstream development history was reviewed for
[DASH](https://github.com/FFmpeg/FFmpeg/commits/master/libavformat/dashdec.c),
[HLS](https://github.com/FFmpeg/FFmpeg/commits/master/libavformat/hls.c), and
[mpv lavf integration](https://github.com/mpv-player/mpv/commits/master/demux/demux_lavf.c).
Recent DASH work includes custom I/O callbacks, bounded refresh/retry paths and
end-of-input handling. Stable source inspection, patch replay and playback tests
determine whether any additional backport is needed; no floating source is built.

## Reproduce baseline

```sh
python3 experiments/streaming-modernization/prepare.py \
  --output build/modernization-attempt-01 --downloads /path/to/archive-cache
cd build/modernization-attempt-01
npm ci
python3 -m venv build/venv
build/venv/bin/pip install meson==1.7.2 Jinja2==3.1.6 MarkupSafe==3.0.2
DEMUXE_SDK=/absolute/path/to/emsdk-4.0.14 \
  bash scripts/build-beta-engines.sh --clean > build/baseline-build.log 2>&1
```

The SDK must already be installed. The build downloads only hash-pinned archives.
An optional cache is copied only when hashes match the upgraded lock. The root
`docs/RELEASE.md` describes the required fixture and browser suites, but these
snapshots are not clean tagged candidates and must not be published. Do not reuse
the former candidate's hashes or browser results for these binaries.

## Patch classification

The machine-readable inventory is `baseline/profile.json`. All original patches
remain in the release path. The staging profile rebases contexts and makes these
substantive decisions:

| Change | Baseline status |
| --- | --- |
| mpv browser AO registration / native AO | Retain; browser output and latency still need this seam |
| mpv attachment budget | Retain; no equivalent browser resource cap upstream |
| mpv nested AVIO bridge | Retain; native HTTP remains disabled |
| Optional WebCodecs selection / retained presenter | Retain; recompile against changed mpv decoder interfaces |
| DFPWM packet admission | Adapt context; retain keyframe admission behavior |
| Matroska RealAudio 14.4 mapping | Retain pending equivalent playback |
| FFmpeg H.264 SEI dependency | Upstream `itut_t35` selection supplies the helper; pristine minimal native H.264 build links without this patch |
| HLS/DASH browser protocol admission | Retain |
| DASH custom open/close callback routing | Already upstream; omit duplicate hunks |
| MOV fragment/sample reset | Already upstream; omit old backport in new profile |
| Finite HLS discontinuity timestamp mapping | Rebase; retain until integrated replacement passes |
| DFPWM seek reset | Retain |
| SWF audio duration | Adapt changed switch layout; retain calculation |
| NUT keyframe recovery and discard budget | Retain |
| Indexed WebVTT seek | Retain while existing subtitle adapter remains |
| FFmpeg libpostproc linkage | Obsolete in FFmpeg 9; remove explicit library/configuration references |
| Native SIMD wrappers | Adapt renamed H264DSPContext fields; initialize unused test dispatch slots before comparison; retain pixel/guard comparisons |
| Software filters/color and RGB rotation override | Retain; compiled capabilities and reference outputs require comparison |

No manifest adapter is removed in baseline restoration. Current track-switch probes do not yet qualify persistent quality switching,
automatic bitrate adaptation or standard live/DVR integration. Those stages require the new transport/engine contracts and
their own real playback evidence.

## Native characterization

The native probe deliberately bypasses all browser manifest adapters. Its packet
checks do not prove visible playback, audio continuity, ABR or mpv engine lifetime.
Use the exact profile's FFmpeg archive and record the native libxml2 environment:

```sh
python3 experiments/streaming-modernization/build-native-probe.py \
  --archive /path/to/verified/ffmpeg.tar.gz --output build/native-probe-01
python3 experiments/streaming-modernization/fixtures.py --output build/stream-fixtures-01
python3 experiments/streaming-modernization/probe-upstream.py \
  --ffprobe build/native-probe-01/build/ffprobe \
  --switch-probe build/native-probe-01/switch-probe \
  --fixtures build/stream-fixtures-01 --output build/native-probe-results-01
```

On macOS, point `PKG_CONFIG_PATH` at the installed libxml2 pkgconfig directory if
needed. Generated fixtures are original synthetic patterns and tones. Current
findings and their limits are in [STREAMING-UPSTREAM-FINDINGS.md](../../docs/STREAMING-UPSTREAM-FINDINGS.md).

Once all three upgraded engines build, run the existing exact-archive workloads:

```sh
python3 experiments/streaming-modernization/qualify-baseline.py \
  --work build/modernization-attempt-01 --output build/modernization-checks-01
```

Provide the existing generated qualification fixtures under that snapshot's
`build/fixtures/` and `build/routing-completion/`. The harness runs Chrome/Firefox
consumer and streaming suites, API/component/CLI/type checks, broader Chrome
compatibility cases and the archived range-reader deadline regression. It preserves
failures and always labels the result non-release. Clean build evidence and the
additional integration gates remain separate requirements.

## Experimental transport stage

`prepare.py --transport` overlays the incremental browser resource loader and
matching C/Wasm mailbox changes. It remains opt-in and release-tag packaging is
rejected. The manifest compatibility adapters are retained while transport is
qualified; no automatic adaptation or persistent quality switch is claimed.

```sh
node --test experiments/streaming-modernization/transport/transport.test.mjs
TRANSPORT_WEB=/absolute/path/to/prepared/web \
  node --test experiments/streaming-modernization/transport/resource-loader.test.mjs
TRANSPORT_WEB=/absolute/path/to/prepared/web OUT=/absolute/new/evidence/directory \
  node experiments/streaming-modernization/transport/mailbox-browser.mjs
# Repeat with BROWSER=firefox.
python3 experiments/streaming-modernization/large-segment.py \
  --output build/large-segment-attempt-01
BETA_ARCHIVE=/absolute/path/to/experimental.tgz \
  LARGE_FIXTURE=/absolute/path/to/large-segment-attempt-01 \
  OUT=/absolute/new/playback/evidence \
  node experiments/streaming-modernization/transport/browser.mjs
```

The unit tests inject Fetch streams and faults. Mailbox tests run real Fetch and
an I/O worker in Chrome/Firefox with a simulated native producer. Only the final
browser harness exercises actual mpv/Wasm playback and audio. Keep those evidence
classes distinct. The generated noisy fixture is synthetic and intentionally
larger than the previous 8 MiB per-resource limit.

Transport seeks are forward-only unless the server supplies a known length,
byte-range support and a strong validator. Range reopens send `If-Match`, validate
status/range/length/validator, and only then admit bytes. A stalled or expired
response can resume this way; sources without that proof fail rather than invent
seekability or successful EOF. Initial and resumed HTTP attempts have separate
absolute deadlines. No mid-body failure is converted into success.

Remaining transport gates include deadline/retry policy for non-range paused
resources, live-window retirement of identity records, expanded validation of
per-demux-session AVIO ownership, aggregate allocation measurements including
parsing scratch/mpv/frames/audio, and expanded source-replacement races. The
identity registry currently fails at a bounded 1024 records; it does not yet
provide long-running live retention policy. Do not ship this stage as completed
streaming integration.

### Session and seek ownership

Nested callbacks capture the source session in `demux_lavf`, and root URIs carry
that identity. The I/O worker waits for native session activation before touching
the shared mailbox. Native cancellation uses one atomic session/cancel identity;
a callback retained by an old demux cannot cancel a replacement source. Closing a
resource revalidates ownership after acquiring the mailbox lock. The new native
regression injects these interleavings under address/undefined-behavior sanitizers:

```sh
python3 experiments/streaming-modernization/transport/test-native-bridge.py \
  --work /absolute/prepared/snapshot --output /absolute/new/native-evidence
```

`0013-browser-resource-session.patch` binds nested AVIO. The separate
`0014-browser-accepted-seek-cancellation.patch` cancels a finite seekable source's
outstanding ticket only after mpv marks its result abandoned under the demux lock.
The I/O worker observes the native epoch independently while Fetch is pending.
Global source retirement can also abandon a claimed writer; the host must terminate
that worker before configuring the replacement mailbox. These native and browser
protocol tests do not replace actual post-seek playback-corruption tests.

### Manual-switch experiment

`prepare.py --switching` includes transport plus the independent
`0015-browser-paused-video-switch.patch`. It refreshes a paused video switch at
mpv's accepted presentation time while retaining queued user-seek priority.

```sh
BETA_ARCHIVE=/absolute/experimental.tgz STREAM_FIXTURES=/absolute/aligned-fixtures \
  OUT=/absolute/new/switch-evidence \
  node experiments/streaming-modernization/probe-mpv-switch.mjs
```

This characterization explicitly bypasses the compatibility adapter and instruments
the mpv creation boundary in the test server; the report hashes those overrides.
It is not an unmodified archive test. It records actual drawn Hybrid dimensions,
Software video parameters, settled paused-position changes, audio/selected tracks,
volume/rate, cache/A-V observations and worker cleanup. The public API continues
using the compatibility adapters and has no new quality policy yet.

### Experimental source correspondence

After all baseline workloads pass, archive the exact preferred source and verify
its correspondence to the tested runtime:

```sh
python3 experiments/streaming-modernization/package-source.py \
  --work /absolute/baseline --archive /absolute/checks/demuxe-0.3.0-beta.3.tgz \
  --build-log /absolute/clean-build.log --output /absolute/new/source-evidence
python3 experiments/streaming-modernization/verify-baseline.py \
  --checks /absolute/checks --source /absolute/source-evidence/demuxe-modernization-source.tar.gz \
  --output /absolute/new/verification-evidence
```

This verifier checks archive members, every runtime/source hash, all seven baseline
workloads, clean engine evidence, configurations and npm's dry-run inventory. It
always records `releaseQualified: false`. The tagged-release verifier and root
publication path are unchanged; these uncommitted snapshots cannot qualify a release.

### Incremental transport qualification

Prepare with `--transport` (or `--switching` for the separately recorded paused
track-switch experiment), build cleanly as above, and supply the same hashed
consumer fixtures/tooling used for the baseline. The root test harnesses require
`build/fixtures/tracks.mkv`, `build/fixtures/compatibility`,
`build/routing-completion/fixtures` and `build/public-api-tooling` in the snapshot.
Record reused fixture bytes; reusing inputs does not reuse test results.

```sh
python3 experiments/streaming-modernization/qualify-baseline.py \
  --transport --work /absolute/transport-snapshot --output /absolute/new/checks \
  --large-fixture /absolute/interleaved-large-segment-fixture \
  --streaming-fixture /absolute/bbb-stream.mp4
```

This gate replaces the former "never abort a packet read" assertion with accepted
native cancellation, forward-playback recovery and source replacement. It retains
deadline and destruction checks, and adds actual nested incremental startup and
replacement. It also runs consumers, API/component/CLI/types, compatibility and
the archived range-reader regression. All checks use the exact generated archive.

Run `transport/resource-errors-browser.mjs` once with `BROWSER=chrome` and once
with `BROWSER=firefox`, setting `BETA_ARCHIVE`, a fresh `OUT`, `SEGMENT_FIXTURE`
and `SINGLE_VIDEO_MPD`. `fixtures.py` generates the original ladder;
`probe-resource-errors.py` writes the single-video MPD while running its native
counterpart. These browser checks exercise truncated initialization/media in both
formats and decoder paths, and require worker cleanup.

After packaging the matching source companion, invoke `verify-baseline.py` with
`--transport` plus `--resource-errors /absolute/chrome-results` and
`--resource-errors /absolute/firefox-results`, along with `--checks`, `--source`
and a new `--output`. It verifies nine main workload groups, both eight-case
resource-error suites, source/build/runtime hashes and npm's archive inventory.
This remains transport-stage correspondence, not quality/ABR/live acceptance.

For an external JavaScript packaging fix that changes no compiled engine input,
`assemble-runtime.py --built /absolute/clean-engine-snapshot --snapshot /absolute/new-prepared-snapshot --runtime-file web/resource-loader.js`
can reuse the exact clean engine bytes. It rejects every unlisted preferred-source
change and verifies compiled inputs, configurations, source archives and artifacts.
It records `freshNativeBuild: false` and the original clean build's hash/origin.
Re-run all archive tests and use the original clean-build log for correspondence;
never describe this as a fresh engine build or reuse earlier archive test results.

The accepted transport-stage record is
`build/streaming-modernization/transport-verification-10/result.json`.
Its exact runtime and source hashes, browser results and remaining gates are in
[the evidence status](../../docs/STREAMING-MODERNIZATION-STATUS.md).
The verifier also accepts `--consumer-rechecks /absolute/consumer-rechecks.json`
to bind the two additional Firefox public-consumer runs to that same archive.
Worker close-protocol tests and real playback tests are separate evidence classes;
the close tests instrument pending asynchronous waits, while consumer rechecks use
the archive without those overrides.

### Native packet transition investigations

These experiments are **not connected to mpv**. They isolate packet ownership,
container continuity and candidate blocking before implementing a playback seam.

```sh
python3 experiments/streaming-modernization/integration/test-native-transition.py \
  --native /absolute/native-probe-build --output /absolute/new/transition-tests
python3 experiments/streaming-modernization/integration/probe-packet-transition.py \
  --native /absolute/native-probe-build --fixtures /absolute/aligned-fixtures \
  --output /absolute/new/packet-transition-evidence
```

Run the packet probe again with `--fixed` to distinguish a container/audio defect
from a quality transition defect. The DASH audio-gap investigation uses
`integration/files/patches/ffmpeg/0011-dash-continuous-fmp4.patch` on top of the
strict-resource patch in a separate `build-native-probe.py --patch ...` build.
Pass `--continuous-fmp4` to exercise that private, off-by-default native option.
It is not included in the qualified transport Wasm engines.

Finally pass `--candidate-delay 3` to exercise a slow candidate. The recorded
`passed` field in this probe covers decoded packets/timestamps only: its
`maxDemuxReadMs` also exposes a roughly three-second blocking parent read. That
result explicitly fails the independent-preparation/seamless-playback gate even
when all packet assertions pass. See the ADR's concurrency boundary before
attempting to wire this prototype into mpv.

## Combined streaming matrix

Generate new fixture directories before starting browser measurements. The ladder
uses synthetic patterns and tones; generators record their commands, host encoder
version and input/output hashes. The period fixture reuses encoded fragments to
exercise timestamp resets without needing another encoder run.

```sh
python3 experiments/streaming-modernization/fixtures.py --duration 120 \
  --output build/stream-ladder-01
python3 experiments/streaming-modernization/live/large-fixture.py \
  --fixtures build/stream-ladder-01 --output build/stream-large-01
python3 experiments/streaming-modernization/live/discontinuity/fixture.py \
  --fixtures build/stream-ladder-01 --output build/stream-discontinuity-01
python3 experiments/streaming-modernization/live/dash/fixture.py \
  --fixtures build/stream-ladder-01 --output build/stream-periods-01
python3 experiments/streaming-modernization/live/subtitles/fixture.py \
  --fixtures build/stream-ladder-01 --manifest build/stream-periods-01/manifest.mpd \
  --output build/stream-subtitles-01
python3 experiments/streaming-modernization/qualify-streaming.py \
  --archive /absolute/path/to/tested-candidate.tgz \
  --ladder build/stream-ladder-01 --large build/stream-large-01 \
  --discontinuity build/stream-discontinuity-01 --subtitles build/stream-subtitles-01 \
  --output build/stream-matrix-01
```

The driver runs 54 serial browser workloads and records each result, command,
log hash and archive identity. `--group` selects an independently reviewable stage;
a selected subset is explicitly not a complete matrix. It stops on failure by
default so the failing archive and evidence can be inspected before another run.
The matrix includes 300-second HLS/DASH endurance on both browsers and both decoder
paths, plus 120-second 12 → 2 → 8 Mbit/s ABR workloads. These are synthetic-source
browser measurements, not physical A/V or device qualification.

Run `unit-suite.py --archive ... --output ...` for injected module regressions on
the same extracted archive. Run the broad `qualify-baseline.py --integration`
gate separately for consumers, Native/direct/remux and compatibility playback,
CLI, TypeScript, component/API, cancellation and archived deadline regressions.
A complete feature gate requires all of these, matching clean engine evidence,
and the source companion verifier. No subset authorizes publication.

The final `verify-feature.py` gate also requires `--native-evidence` with a JSON
map named `bridge`, `read-errors`, `wait`, `order`, `control`, and `preroll`, each pointing to
its native result directory. It checks the corresponding source hashes, sanitizer
flags where applicable, terminal-error cases, bounded waiting, packet order and strict live/preroll boundaries.
These remain native/injected checks and are not labeled browser playback.

```sh
python3 experiments/streaming-modernization/verify-feature.py \
  --runtime /path/to/candidate.tgz --source /path/to/source.tar.gz \
  --baseline-verification /path/to/baseline-verification \
  --quality-verification /path/to/quality-verification \
  --units /path/to/units --native-evidence /path/to/native-map.json \
  --matrix /path/to/complete-streaming-matrix --output /path/to/final-verification
```

Repeat `--matrix` for separately run, nonoverlapping groups of the same complete
54-job matrix. Every result must use the same runtime archive. The verifier does
not authorize a release: uncommitted source has no release tag.
