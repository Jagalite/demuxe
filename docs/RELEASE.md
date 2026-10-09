<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Traceable beta release

A release candidate is one archive from a clean tagged revision, built and tested
as recorded below. A deterministic tar command alone is not an engine build test.
One clean build of the baseline, Software, Hybrid, Remux and subtitle-service
engines is required for this candidate. Universal
bit-for-bit reproducibility and the historical Linux baseline are separate claims.

The publication gate requires functional browser and installed-package checks,
the complete correctness catalogue comparison, and source/package integrity
verification for the exact candidate. Performance benchmarks and endurance
campaigns are optional investigations outside this gate. Run them when a change
warrants measurement, such as changes to decoding throughput, scheduling or
long-running resource ownership. Record their scope and results separately;
missing campaign results do not block publication or imply measured performance
or endurance. The required functional checks remain in force for changed archives.

## Prerequisites

Install native Python 3, CMake, Ninja, pkg-config, Git, curl and Node.js/npm. On the
reference macOS host, install the pinned Python build dependencies in the checkout:

```sh
python3 -m venv build/venv
build/venv/bin/python -m pip install meson==1.7.2 Jinja2==3.1.6 MarkupSafe==3.0.2
npm ci
python3 scripts/fetch-sources.py
cp -R build/sources/emsdk build/emsdk-4.0.14
build/emsdk-4.0.14/emsdk install 4.0.14
build/emsdk-4.0.14/emsdk activate 4.0.14
```

The installer archive and all library archives are verified against
`sources.lock.json`. The SDK installs the platform's 4.0.14 compiler tools. This
macOS recipe does not claim that the historical Linux `toolchain.lock.json` is a
macOS package lock. The new build record captures actual host tool versions and
hashes; retain it. `prepare-beta-toolchain.py` generates absolute SDK paths and a
fresh compiler cache, without inheriting an edited SDK configuration.

For a clean build use a new checkout of the reviewed tag, e.g. a fresh clone with
`git checkout --detach <tag>`. Install npm/Python dependencies there as above. An
already installed SDK and verified download archive cache may be shared with that
checkout, but never share extracted library sources, objects, prefixes or the
Emscripten cache. Do not run `fetch-sources.py` in that checkout before `--clean`;
use the prerequisite installation checkout to provision the SDK first.

```sh
DEMUXE_SDK=/absolute/path/to/installed/emsdk-4.0.14 npm run check:build-portability
DEMUXE_SDK=/absolute/path/to/installed/emsdk-4.0.14 \
  bash scripts/build-beta-engines.sh --clean > build/clean-build.log 2>&1
```

The portability preflight exercises filename preprocessing and libxml2's catalog
configuration from the actual cooperative build recipes. It also verifies that
removing either safeguard reproduces the host-path leak. It does not compile media
libraries or replace the final archive's binary path, hash and browser checks.

Create `build/` before redirecting the log. The clean flag rejects existing engine
outputs, extracted sources, dependency prefixes, objects or compiler cache. The
build verifies locked archives, applies the complete patch series, builds all
static dependencies and all five engines, and records actual configuration,
linker maps and input/output hashes in `build/beta-build.json` and
`build/lgpl-closure.json`. Compiler file-prefix maps and
normalized generated configuration headers use `/demuxe/` as a virtual build root;
the npm packager rejects leaked host paths in any runtime file, including Wasm.
Full host paths remain only in build evidence and the source companion. Inputs may not change during the
build. Generated tracked bindings must match the tag; otherwise fix the source,
review and make a new candidate revision.

The native input record excludes the archive-only scripts `package-beta.py`,
`package-beta-source.py` and `generated-runtime-files.mjs`; those scripts are
bound by the reviewed tag and source companion. Packaging-only changes therefore
do not change compiler provenance. Native sources, compiler recipes and the
build-record implementation remain recorded inputs and require a fresh build
when changed.

## Assemble, test and identify the same bytes

Run `npm run check:licenses`, `python3 tests/lgpl-closure.py`, and inspect
`docs/LICENSING.md` before tagging. The package metadata grants Apache-2.0
to original Demuxe code; the rebuilt mpv and FFmpeg engines remain
LGPL-2.1-or-later, and reports retain CC BY 4.0. Include the license texts,
boundary manifest and per-file license map in the exact archive being verified.
Use a new version/tag for changed candidate bytes. The release packaging option
requires a clean tagged revision, clean-build LGPL closure evidence and matching
input/configuration/engine hashes. It also produces the source companion with
the exact relinking instructions. The [migration report](LGPL-MIGRATION-REPORT.md)
must record the full current catalogue comparison before recommending this
configuration as the next release default. Matched performance measurements may
support performance claims, but are not a publication prerequisite.

```sh
python3 scripts/package-beta.py --release-tag <tag> --output build/release \
  --adaptation-build <clean-adaptation-engine-directory>
BETA_ARCHIVE=/absolute/path/to/build/release/demuxe-<version>.tgz \
  node tests/beta-consumer.mjs
BROWSER=firefox BETA_ARCHIVE=/absolute/path/to/build/release/demuxe-<version>.tgz \
  node tests/beta-consumer.mjs
BETA_ARCHIVE=/absolute/path/to/build/release/demuxe-<version>.tgz \
  node tests/beta-streaming.mjs
BROWSER=firefox BETA_ARCHIVE=/absolute/path/to/build/release/demuxe-<version>.tgz \
  node tests/beta-streaming.mjs
```

Rerun all current README Demuxe auto cases (80 in this revision) in `tests/head-to-head/run.mjs` against
separate GPL baseline and LGPL candidate asset snapshots made with
`tests/head-to-head/setup.py --fixtures-from <same-complete-fixture-snapshot>`.
Pass `--optional-archive` with the published GPL archive for the baseline and
the new candidate archive for the LGPL lane, so both use their exact packaged
Native ASS and FLAC/Opus assets.
Use `--catalogue --cases demuxe` for each run. Preserve both summary files and
classify their exact routes, acceptance results and first failure stages:

```sh
python3 scripts/compare-lgpl-catalogue.py \
  --baseline <gpl-correctness>/summary.json \
  --candidate <lgpl-correctness>/summary.json \
  --output <complete-readme-comparison.json>
```

The verifier below recomputes that comparison, requires every current README row to be
rerun, retains every baseline bounded pass, and rejects a changed first failure
stage or reason for any pre-existing blocked/failed row. It ties the candidate
engine hashes to the runtime archive. Record separate representative Native, Hybrid and Software matched
CPU/memory observations and investigate any decoder, filter, threading,
synchronization or rendering change before release.

Browser engine builds follow the exact Playwright pin in `package-lock.json`.
The current pin is 1.64.0. Record each browser's actual version with its receipts.
The older 1.58.2 Firefox 146.0.1 build repeatedly crashed during active navigation;
two unchanged-runtime replays on Firefox 157.0 completed 80 cycles each plus the
public API and component suites ([diagnostic run](https://github.com/Jagalite/demuxe/actions/runs/37940178415)).
This updates the test browser; it does not establish a production workaround for
Firefox 146 or replace exact installed-archive qualification. Playwright WebKit
results cover that engine build, not native Safari on macOS or iOS.

The browser tests require Playwright's Firefox and local Chrome, and repository
fixtures created by the documented fixture generators. The focused streaming test
uses `build/fixtures/playback-performance/bbb-stream.mp4` by default, or
`STREAMING_FIXTURE` pointing to a seekable H.264/AAC MP4 longer than 500 seconds.
It records that fixture's hash. Keep fixture-generation/source provenance with the
results. Tests use only the extracted runtime archive, and verify all manifest
hashes before running. Consumer results include the archive's SHA-256.

Extract that same archive and run the deterministic timeout regressions against it:

```sh
mkdir -p build/release/extracted
tar -xzf build/release/demuxe-<version>.tgz -C build/release/extracted
RANGE_READER_MODULE="$PWD/build/release/extracted/package/web/range-reader.js" \
  node --test tests/range-reader-deadline.mjs
```

Record result paths and archive hashes in the release verification record. Recheck
both archive hashes immediately before distribution. Publish the tested runtime,
matching source companion, SHA256SUMS and verification record together. Packaging
creates a candidate; publication still requires the test results to pass and the
actual distribution/license arrangement to be settled. Never rebuild an archive
after testing and reuse the earlier test results for it.

Use the verifier to require both complete browser suites and run the deadline tests
against the archived reader, then write the final verification record:

```sh
python3 scripts/verify-beta-release.py \
  --archive build/release/demuxe-<version>.tgz \
  --source build/release/demuxe-<version>-source.tar.gz \
  --lgpl-catalogue <complete-readme-comparison.json> \
  --consumer <chrome-consumer-result.json> <firefox-consumer-result.json> \
  --streaming <chrome-streaming-result.json> <firefox-streaming-result.json> \
  --shaka <chrome-shaka-result.json> <firefox-shaka-result.json> \
  --optional <optional-qualification-directory>/qualification.json \
  --extra <release-extra-result.json>
```

A changed runtime hash, source companion, tagged test harness, failed test, filtered
suite, or missing browser result prevents verification. Archive assembly does not
publish anything; distribute the verified files without running the packager again.

## Optional preparation and ASS runtimes

Earlier archives included a separate Native ASS runtime. Current releases use
the mpv subtitle service for embedded and external subtitles. Rebuild pthread,
JSPI and Asyncify subtitle assets from the tagged sources and include their
existing mpv source/relink records. Pass audio preparation with
`--adaptation-build <engine-directory>`; keep its optional source companion and
hash alongside the standard source companion. The standalone `--ass-build`
option and separate ASS source companion are retired. See
[Runtime assets](RUNTIME-ASSETS.md) for the current build and asset-copy contract.
The adaptation build must retain the published FLAC and explicit Opus profiles
(`--opus`, 0.5-second first fragments, FLAC level 5); compare its manifest with
the prior archive before release. Both current FFmpeg source entries pin n9.0.2
in `sources.lock.json`; adaptation uses its separate
`patches/ffmpeg-adaptation/` patch series. The earlier published preparation
engine used n9.0.1, so retain the optional profile and output checks across this
upgrade.

Run the optional matrix against the immutable tagged archive:

```sh
python3 scripts/qualify-optional-runtime.py \
  --archive <tagged-runtime.tgz> \
  --adaptation-build <engine-directory> \
  --output <fresh-qualification-directory>
```

Supply `--optional <fresh-qualification-directory>/qualification.json` to
`verify-beta-release.py`, alongside all standard consumer, transport and extra
results. Optional evidence from an earlier untagged archive cannot qualify a new
release archive. Qualification preserves the documented browser and source gates;
it does not admit Firefox Native long unequal tails or staged streaming adaptation.

## Current component and npm consumer qualification

After the four archive suites above, run the full additional qualification against
that same archive. This installs into an empty project, invokes the npm executable,
checks package metadata and imports without a DOM, records npm's pack inventory,
and runs CLI collision/hash checks, TypeScript/static/bundled consumers, public API,
component, and menu regressions. The UI/API test server serves runtime code strictly
from the installed archive; only test pages and media come from the tagged source.

```sh
BETA_ARCHIVE="$PWD/build/release/demuxe-0.3.0-beta.4.tgz" node tests/release-extra.mjs
```

Pass `--extra <release-extra-result.json>` to `verify-beta-release.py`, in addition
to its archive/source/consumer/streaming arguments. It requires all extra cases and
checks their harness hashes against the source companion. Provision esbuild 0.28.2
in `build/public-api-tooling` for the bundled consumer checks. Component fixtures
use `fixtures/example.mp4`; the menu suite also runs in automated WebKit without
claiming Safari or physical mobile qualification.

## Publishing a qualified beta

The [tag pipeline](TAG-RELEASE.md) builds and qualifies the exact runtime and
source archives, creates a GitHub Release with those files, deploys Pages, and
stages npm. Approve the pending version in npm’s Staged Packages UI with 2FA to
make it public. The following commands are the manual staging procedure.

The root `package.json` deliberately remains `private: true`. Never publish from
the source root. Publish only the runtime archive identified by `verification.json`;
do not rebuild or repack it after qualification. Keep the source companion,
`SHA256SUMS`, clean build record and verification record with the public release.
Before npm publication, make the matching source companion downloadable from the
GitHub release for the recorded tag; the npm package alone is not that source offer.

1. Confirm `npm whoami`, account publishing access/2FA, and package ownership
   (`npm view demuxe name version maintainers`). Check that the candidate version
   is not already present with `npm view demuxe versions --json`.
2. Check archive metadata and `SHA256SUMS` against `verification.json`.
3. With npm 11.15.0 or newer, run `npm stage publish ./build/release/demuxe-0.3.0-beta.4.tgz --tag latest --access public --ignore-scripts --dry-run`.
4. Only after all verification gates pass, stage the archive:

```sh
npm stage publish ./build/release/demuxe-0.3.0-beta.4.tgz --tag latest --access public --ignore-scripts
```

Review the staged entry in npm’s UI, click **Approve**, and complete 2FA.
The archive is not publicly available until approved.

The staged release explicitly targets `latest`, including beta versions. Approval
updates the default `npm install demuxe` version; staging alone does not move the tag.
The existing `beta` alias is independent and is not advanced by this workflow.
After publication, install `demuxe@latest` into
a brand-new temporary project, run `npx demuxe copy-assets public/assets/demuxe`,
import both `demuxe` and `demuxe/player`, and smoke-test one Native direct source
and one Hybrid/Software or Native-remux source using the installed runtime assets.
Check `npm view demuxe@latest version dist` and download the registry tarball to
compare its bytes/hash to the qualified archive. Configure npm trusted publishing
for the exact GitHub workflow if later releases use automated publication.

## Non-isolated remux release gate

The clean engine build ships pthread and private JSPI/Asyncify remux/transcode engines, plus the restricted private mpv subtitle and PCM16 audio services. `build-private-release.py` builds fresh dependencies and caches from the candidate revision and records the source, configuration and artifact bindings in `beta-build.json`. Its external build directory is recorded in `build/private-runtime-materials/location.json`; preserve it with the clean-build log. The source companion includes the pinned archives, build recipes, transformed inputs and link/configuration evidence.

The installed-archive consumer suite requires runtime selection with and without isolation, private subtitles and audio under auto and explicit Asyncify, composed playback, cancellation of pending service reads, and mismatched Wasm rejection. Both Chrome and Firefox must pass against the exact archive. See [runtime requirements](NON-ISOLATED-REMUX.md).

### Catalogue correctness gate

Tag releases run the full correctness catalogue for Demuxe Auto against both
the published baseline and candidate. Coverage follows the README media table
(80 rows currently), not a fixed case count. Missing or duplicate fixtures fail
qualification. Cases include output, seeking, pause/resume, rate, EOF and cleanup
as applicable; live media uses its bounded progression checks. No CPU benchmark
rounds, warmup windows or performance measurement windows run in release CI.
See [tag release workflow](TAG-RELEASE.md).

Tagged releases also require a macOS WebKit job against the exact installed archive before GitHub publication or Pages deployment. It runs all 21 public API checks, 61 component checks, 19 live boundary checks, 10 worker containment trials, and the full mobile player suite. Linux WebKit remains in the boundary, worker, and mobile media tests; its GStreamer media backend can fail Blob and local File playback even in a plain HTML video element. Apple WebKit is qualified separately because macOS uses a different native media backend. Playwright WebKit is not a manual Safari or iOS Safari qualification.

The default test SDK remains Playwright 1.64.0. Linux release boundary, containment, menu, and mobile media checks explicitly use a separate Playwright 1.58.2 installation (WebKit 26); current Apple WebKit uses the default SDK on macOS. Receipts record both SDK versions. Linux WebKit 27 failed local-file reopen/seek in two live boundary cases and native seek in the mobile suite, and remains unqualified for those operations; it passed the software/hybrid switch stress and worker containment checks. No production browser routing is changed by this test-only selection.
