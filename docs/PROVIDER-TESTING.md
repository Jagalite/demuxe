# Testing a provider package

The provider conformance runner is part of the existing test suite. It reads an
assembled provider package, selects shared checks by the exact
`capability`, `version`, and `profile` tuple in its manifest, and tests the
candidate's verified implementation. Provider IDs and npm namespaces do not
select the tests. A replacement can use its own IDs and a custom ABI adapter.

```sh
npm ci --ignore-scripts
npm run test:provider-harness
npm run test:providers -- --provider /absolute/path/to/provider-package \
  --output build/provider-conformance/my-first-run
```

Supply a package directory containing `package.json`, `provider-manifest.json`,
and the manifest's `runtime/` artifacts. A source template or an archive must be
assembled or extracted first. Use Node 22.14 or later. Functional checks need native `ffmpeg` and
`ffprobe`; the runner records their versions. Native Wasm builds are separate
inputs and are not compiled by this command.

Use a fresh output directory for every invocation. An existing directory is
rejected, including a directory from a failed run. The default is a new directory
under `build/provider-conformance/`. Repeated `--provider` arguments test several
packages, `--core CORE_DIR` checks compatibility against that core's package
version, and `--timeout MS` bounds each contract's subprocess (default: 120000 ms).
The runner requires POSIX process groups (Linux/macOS). It terminates the
subprocess group on completion or timeout, including native reference-tool
children.

```sh
npm run test:providers -- --provider /absolute/path/to/provider-package --list
npm run test:providers -- --config provider-tests.json \
  --output build/provider-conformance/replacement-run-001
```

`--list` validates package inputs and records the selected checks without
executing them. Its report contains `planned` entries and does not establish a
passing conformance run.

## Compare against packaged Wasm FFmpeg

Use the assembled FFmpeg package as an explicit baseline in the same runner:

```sh
npx playwright install chromium
npm run test:providers -- --provider /absolute/path/to/candidate-package \
  --baseline /absolute/path/to/provider-ffmpeg-asyncify-package \
  --output build/provider-conformance/wasm-ffmpeg-comparison
```

`--baseline` also accepts the packaged JSPI provider when Chromium supports JSPI.
The runner verifies the baseline manifest, selected artifact closure, Wasm,
JavaScript bridge and implementation identity. It runs those exact assets in a
browser Worker through the packaged `rm_*` preparation API. Both paths receive
the same hashed source fixture. Host `ffmpeg` and `ffprobe` remain measurement
tools for the outputs; they are not substitutes for the Wasm baseline.

The baseline compares candidate Matroska packet output and fMP4 remux output
against packet-copy preparation. Decoder checks retain their actual PCM and
absolute sample timelines for comparison with FLAC24 preparation. FLAC encoder
checks prepare an immutable source WAV on the baseline and compare both decoded
outputs. Compression bytes need not match. Timestamp checks use the documented
FFmpeg mux bias (`1 - source start time`) and container tick tolerance; they never fit a shift to make
outputs agree.

The FFmpeg package exposes prepared files rather than raw PCM frames. Its FLAC24
path rounds higher precision inputs, so a supplementary PCM comparison cannot
establish original PCM32 or Float64 precision parity. Those raw precision
comparisons are explicitly blocked. The current baseline manifests do not offer
Opus preparation, so Opus encoder parity is also blocked. Missing profiles,
adapters and comparisons make the overall baseline run incomplete (exit 2);
they never silently fall back to a native-only pass. Existing independent native
precision checks still run.

For a collaborative or manually controlled browser, pass `--browser external`.
Open the printed local URL while the command remains running; comparisons start
automatically and the command writes the final report after the browser finishes.
The server binds only to loopback, serves verified test inputs, and shuts down on
completion or timeout. The default `--browser chromium` uses the suite's existing
Playwright dependency to run headless Chromium.

Config files accept `"baseline": "./installed/provider-ffmpeg-asyncify"` and
`"browser": "chromium"` (or `"external"`). Baseline results are in
`report.json` under `baseline`, with per-comparison status, identities, source and
output hashes, browser metadata, and checks. Completed browser runs also write
`ffmpeg-parity/parity.json`. Prepared-output equivalence does not grant playback,
seek, performance, release or routing qualification.

## Shared checks and scope

The initial registry supports these version 1 contracts:

| Capability | Profiles | Shared checks |
| --- | --- | --- |
| `audio.decode.ac3`, `audio.decode.eac3` | `48khz-fltp` | Independent PCM reference, sample counts, timestamps, channel layout, owned output, reset, drain, disposal and cancellation |
| `audio.decode.dts` | `core-48khz-fltp`, `ma-48khz-s32p` | The same packet decoder checks, including exact integer PCM for MA |
| `audio.decode.truehd`, `audio.decode.mlp` | `48khz-integer` | Exact integer PCM and packet lifecycle checks |
| `audio.decode.aac` | `lc-48khz-stereo` | Configured packet decoder checks |
| `audio.decode.opus`, `audio.decode.vorbis`, `audio.decode.mp3`, `audio.decode.pcm` | `48khz-stereo` | Configured packet decoder checks and explicit trimming; PCM also checks integer/double precision when applicable |
| `audio.decode.flac`, `audio.decode.alac` | `48khz-integer` | Exact integer PCM and configured packet decoder checks |
| `audio.encode.flac` | `48khz-s24` | Independent exact round trip, packet timeline, partial final block, owned output and cancellation |
| `audio.encode.opus` | `48khz-mono-stereo` | Independent native decode quality, packet timeline, encoder delay/final trimming, partial blocks, owned output, cancellation and MP4 seek with 80 ms preroll |
| `container.read.matroska` | `finite-clear-av` | Packet bytes/PTS/track/key equivalence against ffprobe, ownership, cancellation, truncation and unsupported display metadata |
| `container.mux.fmp4` | `explicit-timeline-av` | AVC without reordered pictures plus AAC 48 kHz, packet/duration/display-aspect/decoded-output equivalence and backward timeline rejection |

Default packet decoder fixtures are short generated stereo tones. PCM uses
signed 16/24/32-bit and float32/64 fixtures. Native encoder availability can
prevent generation. DTS-HD needs an independently supplied fixture. FLAC
encoding checks mono/stereo/5.1/7.1 at 48 kHz. Opus encoding checks mono/stereo with short, complete and
partial blocks plus a longer fixture for native seek validation.

Decoder timestamps are compared against native FFprobe decoded frame timelines,
including priming and trimming. Reports record the native timing reference hash
and any tolerance required by the input container's timestamp ticks. Supplied
AC3, EAC3 and DTS-core fixtures can cover mono, stereo and 5.1 layouts.

The Matroska and fMP4 checks use bounded AVC/AAC fixtures. Their passing results
state that scope; they do not establish coverage of every codec, rate, layout,
large-file case, or feature represented by the logical contract. Supply additional
fixtures and extend shared checks for the coverage a provider needs.

The initial built-in registry does not run ISO BMFF reader, integrated
preparation, playback, browser presentation, subtitle, or gain checks.
Those offers are reported as `unsupported` until a corresponding suite is added
or configured. A recognized contract without the required adapter or fixture is
`blocked`. Both states make the overall run incomplete.

## Configuring candidates and fixtures

Paths inside a config file are relative to that file. This example binds a new
provider ID and module path to the existing Matroska checks:

```json
{
  "schema": 1,
  "timeout": 120000,
  "providers": [
    {
      "path": "./installed/provider-replacement",
      "adapter": {
        "module": "./adapters/replacement.mjs",
        "options": {"reader": "modules/reader.mjs"}
      },
      "containerFixture": "./fixtures/avc-aac.mkv"
    }
  ]
}
```

A provider can also have an `adapters` array. The first matching specification
wins; optional `providerId`, `capability`, and `profile` fields restrict its
selection. The provider's `adapter` is the fallback.

For audio, use a `fixtures` array containing `id`, `codec`, `sampleRate`,
`channels`, and `input`. The codec names follow the packet adapter, such as
`ac3`, `dts-core`, `dts-hd`, `truehd`, `pcm-s24le`, or `pcm-f64le`. Configured
codecs take extradata and stream configuration from ffprobe. Optional `reference`,
`integerReference`, and `doubleReference` paths supply raw interleaved f32le,
s32le, and f64le reference PCM. When fixtures are supplied, the runner selects
matching fixtures rather than generating substitutes for uncovered offers.
`muxFixture` supplies the bounded AVC/AAC input for mux checks.

Without a custom module, the built-in adapter recognizes the maintained
component layout. Its optional `options.reader`, `options.writer`,
`options.factory`, and `options.wasm` fields select paths within the candidate's
manifest closure. The audio factory must implement the maintained component
Wasm ABI. A writer-only candidate can use the harness reader to extract the
fixture; the writer under test still comes from the candidate package.

## Adapting another ABI

Custom adapters export `createAdapter(context)`. The context contains
`providerId`, `implementationIdentity`, `offers`, `options`, `outputDirectory`,
`importArtifact(path)`, and `readArtifact(path)`. Artifact paths are relative to
`runtime/`, without that prefix, and must belong to the selected provider's
verified asset closure.

```js
export async function createAdapter(context) {
  const {Reader} = await context.importArtifact(context.options.reader);
  return {
    openReader(blob, signal) {
      return Reader.open(blob, signal);
    },
    async dispose() {
      // Release any adapter-owned resources.
    }
  };
}
```

The built-in checks expect these adapter methods:

- `openReader(blob, signal)` returns the maintained reader contract: `tracks`
  and an async `packets()` iterator.
- `createWriter(tracks)` returns `initialization()` and
  `fragment(trackId, samples)` methods with explicit DTS, PTS and duration.
- `createDecoder(fixture, signal)` returns `decode(packet, pts)`, `flush()`,
  `reset()` and `dispose()`, with the owned packet-audio frame contract.
- `createEncoder({channels, sampleRate}, signal)` returns the FLAC packet
  encoder contract: `blockSize`, `header`, `encode(pcm)`, `flush()` and `dispose()`.
- `createOpusEncoder({channels, sampleRate}, signal)` returns the Opus encoder
  contract with those methods plus `preSkip`. The Opus check also accepts
  `createEncoder` when no dedicated Opus factory exists, and needs `createWriter`
  or a separate harness `fixtureWriter` to package its output for native decode.

Methods may return promises. Adapter glue must expose the candidate's behavior;
replacing its media implementation with a harness implementation would invalidate
the comparison. Custom adapters and suites are executable test code supplied by
the caller, not package declarations.

To add checks for another exact tuple, register a suite in the config:

```json
{
  "schema": 1,
  "providers": [{"path": "./installed/provider-replacement", "adapter": {"module": "./adapters/replacement.mjs"}}],
  "suites": [{
    "capability": "container.read.isobmff",
    "version": 1,
    "profile": "finite-clear-av",
    "module": "./checks/isobmff.mjs"
  }]
}
```

The suite exports `runChecks({adapter, offer, outputDirectory, fixtures})`.
It must return an object with `passed: true` and a nonempty `scope` after its
assertions pass. A configured suite takes precedence for its exact tuple.
Custom adapter and suite source graphs use Node's native import/require resolution
before import and are hashed, including transitive code and package metadata.
Computed imports that cannot be enumerated are rejected; use concrete module
specifiers. `createRequire` bases must be `import.meta.url`, `__filename`, or a
literal absolute path/file URL. Shared maintained checks
belong under `tests/provider-conformance/` and should
be registered in `registry.mjs` as coverage grows.

A custom suite can also return `parityJobs` to use the packaged FFmpeg baseline.
Each job needs an absolute immutable `input`, a declared preparation `profile`,
and actual candidate output evidence. Use `kind: "prepared-file"` with a
`candidate` media path and `profile: "packet-copy"`, or `kind: "prepared-audio"`
with a `candidate` audio path and `profile: "flac24"`. Set `target: "mp4"` for
the maintained output container. The suite must produce that output through its
verified candidate adapter. The runner adds the candidate/baseline identities,
checks input integrity, prepares the same source through Wasm FFmpeg, and compares
the outputs. Return `{kind, profile, status: "blocked", reason}` when the desired
comparison is unavailable. A custom suite without parity jobs remains blocked
for baseline comparison even when its independent checks pass.

## Reports and qualification

Each output has `report.json`, with package input hashes and implementation
identities, per-offer results, fixture hashes, adapter/harness hashes, tool
versions, check scope, failures and cleanup errors. Worker outputs include their
fixture and check evidence. Candidate runtime modules are staged from the
verified closure before import, and inputs are checked for changes during the
run. Unsupported tuples are never silently counted as passes.

| Exit code | Meaning |
| --- | --- |
| `0` | Every offered contract and requested baseline comparison passed; or `--list` completed successfully |
| `1` | Input validation, a check, cleanup, or execution failed |
| `2` | The run is incomplete because an offered contract is unsupported or blocked |

Passing this runner does not update the runtime qualification registry, add a
production playback route, seal a release, or establish performance/browser
qualification. Existing installed-player, browser, composition, performance and
release gates retain their own evidence requirements. The report always records
`qualification: "not-granted"`.

CI runs the harness contracts and an installed container package check on changes
to the harness or relevant provider sources. Native provider packages can be
passed to the same runner as exact external inputs; the automatic harness job
does not provide the full native/browser matrix.

## Predictive packet audio fixtures

The maintained registry includes the exact `configured-integer` decoder offers
for `adpcm-ima-qt`, `adpcm-g726` and `adpcm-g726le`. These require explicit
retained fixtures; missing matching fixtures remain blocked. Raw G726 is never
sniffed, and an unqualified original packing declaration cannot pass.

Each provider's configuration supplies `fixtures` with the maintained packet
manifest metadata plus these absolute paths and exact SHA256 fields:

| Path | Required hash |
| --- | --- |
| `input` | `inputSHA256` |
| `packetFile` (retained packet JSON) | `packetSHA256` |
| `reference` (full interleaved Float32 PCM) | `referenceF32SHA256` |
| `integerReference` (full left-justified Int32 PCM) | `referenceSHA256` |

IMA-QT requires original MOV block framing, 34 bytes per channel, 64 decoded
samples per block, 44.1/48 kHz mono/stereo, and a restart/discard seek contract.
Packet references retain every decoded block sample; the independently declared
MOV presentation tail belongs to container/conversion tests and must not replace
those full packet references. G726 requires 8 kHz mono, explicit codec, 2/3/4/5
coded bits, matching bitrate and packing, complete byte/code groups, qualified
origin packing, and an exact source sample clock. WAV `fact` trimming and raw
presentation counts remain separate from full predictive packet decoding.

The generic decoder suite compares exact integers and original packet clocks,
replays from stream origin for three discard targets, and checks owned buffers,
reset, shifted timestamps, cancellation, disposal, invalid configuration,
incomplete coded groups and unsafe end clocks. It does not qualify opening a
fresh predictive decoder at a later packet. Package artifacts and the complete
adapter compilation closure are hashed separately; a transient package check
establishes no source-companion, release or installed browser qualification.

AAC `he-stereo48`, `he-v2-stereo44100` and `usac-mono48` also require retained
packet and native PCM references. Set explicit `aacProfile` (`he`, `he-v2`,
`usac`), exact rate/layout, and `timingFile` with `timingSHA256`. The timing JSON
contains independently decoded `{segments:[{pts,samples}],toleranceSamples:0}`;
its segments describe presented PCM in original sample units. Supply
`initialSkipSamples` and `finalDiscardSamples` explicitly. USAC's admitted
priming is 2,220 samples and its final trim comes from the original movie endpoint.
A host lacking the fixture decoder must use retained independent references;
the runner does not regenerate extension timing or PCM. Extension fixtures cannot
satisfy a default LC offer. Supply LC fixtures separately when a package offers
both LC and extensions.

## Installed codec cohorts and CI

`node scripts/test-codec-expansion-providers.mjs` reads the current
`build/codec-expansion/installed.json`, verifies every installed package file
against its pinned assembly archive/record, and runs every declared provider
offer. Decoder/encoder ABI wrappers and fixture readers/writers come from the installed
container package. The runner requires its audited packet, FLAC, and Opus wrapper
files and never substitutes checkout files for a missing installed wrapper. Unsupported tuples or missing
fixtures leave an incomplete report and a nonzero exit status. An installed file
mutation invalidates qualification even after successful contract checks.

Consumer setup persists exact selected targets and baseline/packet fixture
metadata. `CODEC_EXPANSION_CONFORMANCE=/absolute/manifest.json` adds explicit AAC
native timing descriptors and container inputs (`kind: "container"`, with the
maintained `container` tag). Canonical archive and block reader profiles need
retained sources; native-only packet dumps without the maintained stream metadata
cannot substitute for the normalized packet fixture manifest. Use the maintained
browser packet manifests as the shared source of framing/clock/reference facts.

Portable export rewrites and pins these media, packet, scalar PCM, timing and
fixture-manifest paths into the reviewed inventory. Browser cohorts retain the
existing size limits; split large selections across pinned cohorts. The workflow
runs installed provider conformance before browser playback qualification and
retains both reports. Registered suites cover every maintained optional audio and
container offer; a catalog coverage contract catches newly added offers without
an explicit suite. Registration alone is not successful runtime qualification.

The `lower-rate-pcm` MP2/WMA profiles require
`seekContract: "restart-from-start-and-discard"` and an independently pinned
`timingFile`/`timingSHA256`. The runner checks the first complete decode clock
and three fresh predictor restarts against retained PCM. WMA timing remains
exact; MP2 permits only half the original container clock tick, derived from
the pinned packet stream `time_base`. Caller-selected alignment and clock
tolerances cannot replace that derivation.

Speex `ogg-mono-cbr` fixtures retain their original signed Ogg packet/frame
timestamps, complete coded PCM padding, and zero native frame duration. The
standard gate pins original timing, scalar reference build and binary inputs;
it checks three predictor restart/discard windows with the unchanged
`7e-5` maximum error and SNR above 80. A hidden timestamp offset cannot satisfy
this profile. Existing FLV Speex and AMR profile limits remain separate.

### Assembly campaigns

`scripts/qualify-codec-expansion.mjs` drives the existing corresponding-source
sealer, audited package assemblers, npm installation, installed conformance and
portable exports. It never builds native codecs, publishes, or changes the
production provider registry. Start sealing after application/native sources
are frozen.

A reviewed schema-1 plan declares `id`, `catalogSHA256`, all optional audio
package `targets` plus `core`/`container`, and these inputs:

| Field | Contents |
| --- | --- |
| `sources` | `{id,profile,targets,record:{path,sha256},recovered:{path,sha256},buildRoot}` for every native target; shared engine groups seal once |
| `applicationSnapshot` | `{path,sha256}` for the exact pre-seal application inventory; rediscovered membership and hashes must remain identical |
| `baselineManifest` | `{path,sha256}` for baseline fixtures |
| `packetManifests` | Array of pinned normalized packet manifests |
| `conformanceManifests` | Array of pinned retained AAC/native timing descriptors |
| `containerManifests` | Array of pinned maintained container fixture descriptors |
| `cohorts` | `{id,targets,packetManifests:[indices],conformanceManifests:[indices],containerManifests:[indices],supplemental?:{path,sha256}}` |

Every browser cohort keeps the mandatory nine targets. Historical AC3/DTS/common
packages participate in the complete installed standard gate independently of
the browser cohort target list. Every other target must appear in a cohort.
Exports enforce the existing 256 MiB file and 2 GiB unique blob budgets; an
oversized cohort fails and must be split. Fixture/reference policies are not
weakened to fit those budgets.

```sh
python3 scripts/package-provider-source.py --application-inventory > build/codec-expansion/application-snapshot.json
# Record that file pin in the reviewed plan before starting the campaign.
export CODEC_EXPANSION_PLAN_SHA256='<reviewed plan SHA256>'
node scripts/qualify-codec-expansion.mjs validate build/codec-expansion/plan.json
node scripts/qualify-codec-expansion.mjs seal build/codec-expansion/plan.json
node scripts/qualify-codec-expansion.mjs assemble build/codec-expansion/plan.json
node scripts/qualify-codec-expansion.mjs install build/codec-expansion/plan.json
node scripts/qualify-codec-expansion.mjs conformance build/codec-expansion/plan.json
node scripts/qualify-codec-expansion.mjs export build/codec-expansion/plan.json
```

Outputs live under `build/codec-expansion/campaigns/<id>` and bind the plan pin.
Existing source/package/install/report outputs are preserved: choose a new
campaign identity for a changed plan. Export refreshes local assembly aliases
and writes each exact inventory pin/budget report; browser runs and isolated
portable preparation remain additional gates.

Explicit AAC AV references use `referenceContract: "independent-scalar-aac-presentation"`,
`referenceInputSHA256` matching the movie pin, and pinned F32, scalar build/binary
and presentation timing files. The host validator decodes the converted audio
and copied video independently while reading this pinned source PCM. Missing or
changed evidence fails; the host AAC decoder cannot substitute for it. Timing
starts at zero, advances by each segment's sample count, and uses the original
`1/sampleRate` clock.

### Real AAC syntax negatives

Retained LC stereo source and ADTS packet descriptors may declare
`negativeContract: "real-lc-stereo-leading-syntax"`, with the exact
`PROVIDER_PROFILE_MISMATCH` code and
`Unqualified AAC stereo single-channel element or leading syntax` message.
These descriptors pin the original input and packet JSON, require a valid
44.1 kHz stereo LC decoder configuration, and exercise the original packet
sequence with fresh owners and resets before replay. The syntax exception
releases its owner; subsequent reset/decode must report disposal. The suite
never reads PCM from these unsupported sources. At least one positive fixture
must pass for the offered LC profile; negative-only evidence cannot qualify it.
