# Provider bundles

The optional `@demuxe/bundler` build tool assembles installed modular packages.
Consumers choose which providers to include and how to deliver their runtime.
FFmpeg and mpv are supplied as finished packages; this tool never builds native
code. mpv remains an atomic provider.

The tool is currently a local package candidate. It has not been published to
npm. Install its verified archive alongside the matching modular core and
provider archives. The ordinary monolithic `demuxe copy-assets` installation
continues to work independently.

## Build configuration

Save `demuxe-bundle.json` in the application project:

```json
{
  "core": "node_modules/demuxe",
  "providers": "all",
  "providerDirectory": "node_modules/@demuxe",
  "delivery": "assets",
  "output": "public/demuxe"
}
```

```sh
npx demuxe-bundle demuxe-bundle.json
```

Paths are relative to the current working directory. `all` includes every
installed `@demuxe/provider-*` package in that directory. Install broad FFmpeg
and mpv to include the full existing playback services; install codec packages
to add those qualified implementations. `all` does not install packages or
mean every codec supported by upstream FFmpeg.

For a smaller deployment, replace `providers` with explicit package directories:

```json
"providers": [
  "node_modules/@demuxe/provider-ffmpeg-truehd-mlp-asyncify"
]
```

Provider versions must match the core exactly. Missing providers retain the
existing diagnosed availability behavior. Package selection does not add new
playback plans or qualify new codec profiles.

The output directory must be fresh. Validation, artifact hash checks and
compilation complete before output is created. `bundle-manifest.json` records
provider implementation identities and all input/output file hashes. Each
provider's license and manifest are retained separately under
`third_party/providers/` within the runtime data.

## Provider preferences

`PlayerOptions.providerPreferences` controls runtime selection independently of
which packages ship. Each rule names a capability and lists provider IDs in
preferred order (these are manifest IDs, not npm package names):

```js
const player = new Player(container, {
  assetBase,
  providerPreferences: [
    {
      capability: 'media.prepare.file',
      providers: ['ffmpeg-file-preparation-jspi', 'ffmpeg-file-preparation-asyncify'],
    },
    {
      capability: 'media.play.complete',
      providers: ['mpv-software', 'mpv-hybrid'],
    },
  ],
});
```

Listed providers precede unlisted providers. Earlier rules resolve conflicts
between capabilities; ties keep the existing order. Omit the option or pass
`[]` to keep the defaults. The player copies and freezes preferences at
construction. Duplicate capabilities/IDs, unknown capabilities, empty lists
and malformed values throw `INVALID_ARGUMENT`. Limits are 64 rules and 256 IDs
per rule. Unknown or absent provider IDs have no effect on admission.

Preferences apply to automatic runtime selection for broad engines and codec
slices, Native MP4 preparation versus FFmpeg, and
complete playback alternatives with identical capability/version/profile
requirements. Explicit `mode` and `remuxRuntime` policies remain authoritative.
For example, preferring `mpv-software` over `mpv-hybrid` changes their fallback
order; native direct playback still runs first when admitted. Providers for
different jobs do not compete. A capability with only one eligible provider
has no alternative to rank.

Deployment, source/profile, browser and composition qualification checks still
apply. Preferences never grant new codec support or combine unqualified
components. Codec-slice runtime preferences are reconsidered after source
inspection, and complete players still require a deployed inspection path.
Automatic recovery follows the preferred playback order while retaining failed
plan exclusions. Declared asset/integrity failures keep their existing error
handling. Preview providers retain their separate numeric `priority` API.

The explicit `demuxe/components` API accepts the same rules as the final
argument to `executeComponentBinding`:

```js
const preferences = [
  {capability: 'audio.decode.ac3', providers: ['audio-common', 'audio-ac3']},
];
const result = await executeComponentBinding(
  acquisition, recipe, evidence, scopeKey, 'fine', execute,
  undefined, // optional measured-cost inputs
  preferences,
);
```

For selection without acquisition, use
`selectComponentBinding(resolution, baseline, measurement, {recipe, providerPreferences})`.
The recipe must correspond to the resolution. Explicit preferences take
precedence over measured speed/CPU ranking, while measured resource exclusions
remain enforced, including after runtime-absence retries. A changed decision
reports `reason: 'provider-preference'`. Packet decoder/encoder rules apply to
these explicit component recipes and the Player's existing bounded component
path; they do not turn an integrated FFmpeg/mpv engine into interchangeable
packet decoders.

## Separate assets

With `delivery: "assets"`, serve the output directory intact:

```js
import {Player, assetBase} from '/demuxe/demuxe.mjs';
const player = new Player(container, {assetBase, preview: false});
await player.open(file);
await player.play();
// On teardown: await player.destroy();
```

The generated module exports the core API and `definePlayerElement`. Its
`assetBase` points to the adjacent assembled `assets/` tree. Application
bundlers that relocate the JavaScript entry must also preserve this tree or
provide its deployed URL explicitly. The Node API can run as a build hook:

```js
import {buildDemuxe} from '@demuxe/bundler';
await buildDemuxe(config);
```

## Embedded runtime

Set `delivery: "embedded"` to emit one runtime JavaScript file. Only
`demuxe.mjs` is needed at playback time; the JSON manifest is retained build
evidence. All selected provider bytes and transformed runtime modules are
included in that file.

```js
import {createDemuxeRuntime} from './demuxe/demuxe.mjs';
const runtime = await createDemuxeRuntime();
const player = runtime.createPlayer(container, {preview: false});
await player.open(file);
await player.play();

// Stop every player using this runtime before disposing it.
await player.destroy();
runtime.dispose();
```

`runtime.api` exposes the core API. The custom element installer is available
as `runtime.definePlayerElement`; set its `asset-base` to `runtime.assetBase`.
Imports are safe during SSR; creating a runtime requires a browser.

The embedded loader uses a virtual HTTP base internally. Its compiled modules
route runtime imports, fetches, workers, synchronous worker XHR and AudioWorklet
modules to embedded data. It does not replace the application's global fetch or
Worker constructors. Missing embedded assets fail locally rather than making a
network request to the virtual base. Actual media URLs still use normal fetch.
Provider integrity verification reads original package bytes. Transformed
executable modules are separate build outputs and are covered by the emitted
bundle hash.

Worker realms share engine data through Blob backing stores. Runtime disposal
terminates owned workers, releases owned Blob URLs and unregisters its private
instance. Independent runtimes do not share lifecycle state.

### Hosting and size

Use HTTPS or localhost. Embedding does not remove the cross-origin isolation
requirements of pthread FFmpeg, Hybrid or Software playback. CSP must allow
Blob modules/workers and Wasm compilation; retain the permissions needed by
AudioWorklet, media Blob URLs and any selected services. This route has not been
qualified for opening the bundle directly from `file://`.

An embedded full bundle downloads all included engines even if playback uses
only one. HTTP compression can reduce the transfer; browsers still hold the
embedded source and runtime data. Separate assets retain per-engine downloads
and independent caching. Current broad FFmpeg + atomic mpv test output is about
154 MB before HTTP compression. Smaller provider selections reduce this.

## Verification

```sh
node --test tests/bundler.mjs
BROWSER=chrome node tests/bundler-browser.mjs
BROWSER=firefox node tests/bundler-browser.mjs
```

The focused browser suite checks queued messages, nested workers, query
parameters, Wasm compilation, worker XHR, AudioWorklet modules, Request options,
abort behavior, missing assets, independent instances, unchanged application
globals and disposal. CI runs this suite in Chromium and Firefox.

`tests/bundle-playback.mjs` additionally exercises installed native providers
through public Player playback and seeking. It accepts `BUNDLE_OUTPUT`,
`BROWSER`, `BUNDLE_CASES` and `BUNDLE_REPORT`, and retains exact bundle hashes and
browser retirement evidence. Embedded cases reject external runtime asset
requests. Codec preparation checks explicitly request controlled transport via
`nativeRemux: "always"`; this verifies delivery without depending on a browser's
changing claim about directly playing the original Matroska audio.

These bundle checks supplement each provider's existing codec and playback
qualification. They do not extend that qualification to new codecs, source
profiles or browser platforms. Native build/release CI remains a separate gate.

### Historical candidate results (superseded by review fixes)

The pre-review candidate passed nine Node contract tests and a fresh consumer
installation of the packed build tool. The installed CLI built all 15 supplied
provider packages together, including the broad FFmpeg and atomic mpv packages.

The pre-review Chromium 152 collaborative-browser checks passed 20 playback/seek cases: separate
assets, all six lossless fixture profiles through embedded Asyncify and JSPI,
Hybrid/Software playback with broad FFmpeg and mpv, and the combined 15-provider
deployment. Owned workers and Blob URLs reach zero after disposal. Embedded
cases request only their bundle and source media over HTTP. Focused current
loader checks also pass for nested workers, XHR, Wasm, AudioWorklet, Request
options, cancellation, independent instances and cleanup.

Earlier focused loader tests passed in Chrome and Firefox. Full current native
Firefox playback is not qualified by this campaign; the new CI loader matrix
has been configured but has not run remotely. No package has been published.

| Embedded selection | Runtime JS bytes before HTTP compression |
| --- | ---: |
| TrueHD/MLP Asyncify provider only | 10,404,934 |
| Eight lossless/container/preparation providers | 30,214,892 |
| Broad FFmpeg runtimes and atomic mpv (four packages) | 154,074,280 |
| All 15 installed providers | 183,292,357 |

Exact output hashes, installed-package manifests and local browser evidence are
retained under `build/bundle-flexibility/`. One attempt supplied an empty test
fixture; its failure is retained separately from the subsequent successful
checks. The harness now checks HTTP status and nonempty input before playback.

### Review fixes and native CI gate

Embedded element registrations now survive independent runtimes and disposal.
Calling `definePlayerElement(name)` binds future element connections to the most
recently registered live runtime from that bundle. Already connected players keep
their owner. Register the name with a live runtime before reconnecting after all
previous runtimes have been disposed. Foreign element definitions are rejected.

Playback reports now record SHA256 and byte counts for every served output and
SHA256 of the manifest before loading the runtime. The automated server serves an
immutable verified snapshot. Evidence validation rejects missing bindings, changed
outputs, and rebuilt manifests. The historical 20-case reports have no browser
artifact binding and cannot qualify the current source or newly rebuilt outputs.

The automatic CI native matrix now consumes packages built from the same
revision by [the source provider workflow](../.github/workflows/ci-providers.yml).
That workflow compiles the 30 explicitly tested slices plus the four broad
providers, audits packages and corresponding sources, and assembles a fresh
candidate core. Chromium and Firefox exercise TrueHD Asyncify preparation,
Hybrid and atomic mpv Software playback and seeking in assets and embedded
forms. Loader contract tests remain a separate job.

The complete target inventory and every cross-job artifact hash are verified.
The inventory digest is passed through the producing job output. Missing builds,
wrong revisions, duplicate targets and changed bytes fail the job. Automatic CI
no longer requires `BUNDLE_NATIVE_TAG` or `BUNDLE_NATIVE_INVENTORY_SHA256`.

Fresh native identities receive explicit admission only in the installed CI test
copy of the core, with before/after hashes retained. This does not update the
production qualification registry or publish packages. Historical artifact replay
remains available through `scripts/prepare-bundle-ci.mjs` with its schema-1 pinned
inventory. See [source CI coverage and limits](CI-PROVIDERS.md).

Current review-fix evidence is in
`results/media-components/bundling/review-fixes.json`: 11 Node tests and six
Chromium 152 playback/seek cases across both rebuilt delivery modes. Embedded
cases also test element registration across live and disposed runtimes. All
owned workers and Blob URLs reach zero after disposal. The focused current
loader check passes nested workers, Wasm, XHR, AudioWorklet, cancellation and
instance isolation. These are local correctness checks, not performance or
Firefox qualification.

Validate the current artifact-bound report with:

```sh
node scripts/verify-bundle-evidence.mjs results/media-components/bundling/review-fixes.json
```

### Consolidated mpv candidate

The local unified mpv candidate shares one Wasm engine across Hybrid, selective
audio, RGB Software and YUV Software. Small adapters select the rendering mode
for each engine instance. These remain the existing playback plans; mpv is still
one atomic provider, with no codec splits.

| Candidate selection | Bytes before HTTP compression |
| --- | ---: |
| Unified mpv Wasm | 22,574,902 |
| Unified mpv provider runtime assets | 23,580,992 |
| Primary FFmpeg + unified mpv embedded JS | 39,795,511 |
| Same two providers with four previous mpv engines | 128,551,229 |

Build a local candidate with existing native dependencies, then assemble both
asset and embedded deliveries in a fresh output directory:

```sh
python3 scripts/build-unified-mpv.py \
  --native-root /path/to/native-checkout \
  --sdk /path/to/emsdk-4.0.14 \
  --output build/mpv-unified/NEW
node scripts/prepare-unified-mpv-candidate.mjs \
  build/mpv-unified/NEW build/bundle-flexibility/mpv-unified-NEW
```

Assembly uses the installed baseline packages in `build/bundle-ci-consumer` and
current compiled `web/generated/internal/provider-runtime.js`. It checks native
output hashes against the build record. The cloned packages are private and use
local test admission; the production qualification registry is unchanged.

Local Chromium checks passed all four modes in both deliveries, including
pause/resume, forward/backward seek and embedded worker/URL disposal. The selective
case explicitly enables remux to exercise that plan: automatic Native Direct
selection for the AC3 fixture failed before the selective engine was loaded.
Nine rotation/subtitle image comparisons also passed as local diagnostics.

The evidence, including failed attempts, is retained in
`results/media-components/bundling/unified-mpv.json`. Verify the playback bundle
and fixture hashes with `node scripts/verify-unified-mpv.mjs`. Image comparisons
were not bound to browser artifact hashes and are not release qualification.

This candidate does not change the default configuration. A matching source
companion, release packaging integration, and remote Chromium/Firefox native
qualification are still required before shipping it. Its source-companion
metadata explicitly records that gap rather than attributing the new engine to
the previous four-engine source archive.

#### Consolidation review fixes

The rebuilt candidate preserves the union of the four original engines' license
attributions. The strengthened playback test checks paused seek arrival within
250 ms, subsequent progression, and nonzero audio at destination-bound Web Audio
nodes before and after both seeks. Audio sampling starts after 100 ms of media
progression to exclude residual analyser samples from the previous position.

Current evidence is `results/media-components/bundling/unified-mpv-review.json`;
`unified-mpv.json` retains the earlier, weaker checks. Run
`node scripts/verify-unified-mpv.mjs` and
`node --test tests/unified-mpv-evidence.mjs` to verify the current report and its
negative controls for ignored seeks, silent audio, and stopped playback clocks.
The nine image comparisons remain historical local diagnostics from the previous
bundle; they have not been rerun or promoted to release evidence.
