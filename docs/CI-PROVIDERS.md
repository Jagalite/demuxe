<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Source-built provider CI

`Provider bundle loader` calls `Build tested providers from source`. The latter
can also be dispatched independently to produce candidate artifacts. It does not
publish npm packages, create releases, or alter the production qualification
registry.

## Build coverage

The explicit [catalog](../licensing/ci-slices.json) contains 30 slices: 23 audio
providers, the container provider, and JSPI/Asyncify preparation variants for
TrueHD/MLP, DTS-HD and AC-3/E-AC-3. Each entry binds a passing historical report
by hash. These reports justify including the implementation in build coverage;
they do not qualify newly compiled bytes or all configurations of a codec.

The matrix builds every native slice with locked upstream archives and
Emscripten 4.0.14. Opus encoding uses the dedicated libopus recipe. Preparation
builds use fresh scratch directories outside the checkout, as required by their
suspension bridge. The existing package and corresponding-source auditors inspect
each resulting archive. Audio jobs also load the packed Wasm and check its ABI,
allocation and encoder lifecycle in Node.

A separate clean native job builds standard/private engines and links unified
mpv from those fresh libraries. It assembles the four broad providers and retains
the pthread and private-playback source groups under the existing source auditor.
Each provider artifact includes its npm candidate, source companion, build
inventory and a receipt binding filenames, byte sizes, hashes and the Git revision.

The collector requires all 34 providers, verifies their receipts before use, and
builds the core from the same checkout. It generates the TrueHD fixture on the
runner and passes a hashed input inventory to Chromium/Firefox bundle jobs.
Every provider is included in both delivery forms. Playback checks exercise
TrueHD preparation and Hybrid/Software; this is not output qualification for
every slice offer. Broader pinned codec/WebM conformance workflows remain
separate and retain their existing fixture contracts.

Candidate native identities are admitted only into an installed test copy of the
core. Its before/after registry hashes are retained, and bundle manifests bind
the actual tested output. The packaged core and maintained qualification registry
are not changed by this admission. Candidate packages must not be treated as
release-qualified merely because compilation or this bounded browser matrix passes.

## Maintenance

Add a tested slice deliberately to `licensing/ci-slices.json`, with an exact
passing report and the appropriate existing build recipe. The catalog regression
test requires coverage of the current optional provider catalog, so adding a
provider requires an explicit CI coverage decision. Failed or changed evidence,
unknown recipes, missing provider artifacts and archive substitutions fail closed.

Run the orchestration checks with `python3 tests/ci-slices.py`. For a local native
build in a fresh checkout with dependencies and generated TypeScript installed:

```sh
python3 scripts/ci-slices.py matrix
python3 scripts/ci-slices.py build --target audio-flac --sdk /path/to/emsdk-4.0.14
node tests/ci-slice-native.mjs audio-flac
```

Build destinations must be fresh. Build logs and failed attempt directories are
retained; the script does not replace an existing native candidate. Automatic CI
uses no mutable native-output cache and needs no manually published input release.
