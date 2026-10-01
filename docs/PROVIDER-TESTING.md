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
