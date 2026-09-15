# Traceable beta release

A release candidate is one archive from a clean tagged revision, built and tested
as recorded below. A deterministic tar command alone is not an engine build test.
One clean build of all three engines is required for this developer beta. Universal
bit-for-bit reproducibility and the historical Linux baseline are separate claims.

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
DEMUXE_SDK=/absolute/path/to/installed/emsdk-4.0.14 \
  bash scripts/build-beta-engines.sh --clean > build/clean-build.log 2>&1
```

Create `build/` before redirecting the log. The clean flag rejects existing engine
outputs, extracted sources, dependency prefixes, objects or compiler cache. The
build verifies locked archives, applies the complete patch series, builds all
static dependencies and all three engines, and records actual configuration and
input/output hashes in `build/beta-build.json`. Compiler file-prefix maps and
normalized generated configuration headers use `/demuxe/` as a virtual build root;
the npm packager rejects leaked host paths in any runtime file, including Wasm.
Full host paths remain only in build evidence and the source companion. Inputs may not change during the
build. Generated tracked bindings must match the tag; otherwise fix the source,
review and make a new candidate revision.

## Assemble, test and identify the same bytes

Resolve the original-code license and inspect `docs/LICENSING.md` before tagging.
Use a new version/tag for changed candidate bytes. The release packaging option
requires a clean tagged revision, clean-build evidence, the original license and
matching input/configuration/engine hashes. It also produces the source companion.

```sh
python3 scripts/package-beta.py --release-tag <tag> --output build/release
BETA_ARCHIVE=/absolute/path/to/build/release/demuxe-<version>.tgz \
  node tests/beta-consumer.mjs
BROWSER=firefox BETA_ARCHIVE=/absolute/path/to/build/release/demuxe-<version>.tgz \
  node tests/beta-consumer.mjs
BETA_ARCHIVE=/absolute/path/to/build/release/demuxe-<version>.tgz \
  node tests/beta-streaming.mjs
BROWSER=firefox BETA_ARCHIVE=/absolute/path/to/build/release/demuxe-<version>.tgz \
  node tests/beta-streaming.mjs
```

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
  --consumer <chrome-consumer-result.json> <firefox-consumer-result.json> \
  --streaming <chrome-streaming-result.json> <firefox-streaming-result.json> \
  --extra <release-extra-result.json>
```

A changed runtime hash, source companion, tagged test harness, failed test, filtered
suite, or missing browser result prevents verification. Archive assembly does not
publish anything; distribute the verified files without running the packager again.

## Current component and npm consumer qualification

After the four archive suites above, run the full additional qualification against
that same archive. This installs into an empty project, invokes the npm executable,
checks package metadata and imports without a DOM, records npm's pack inventory,
and runs CLI collision/hash checks, TypeScript/static/bundled consumers, public API,
component, and menu regressions. The UI/API test server serves runtime code strictly
from the installed archive; only test pages and media come from the tagged source.

```sh
BETA_ARCHIVE="$PWD/build/release/demuxe-0.3.0-beta.3.tgz" node tests/release-extra.mjs
```

Pass `--extra <release-extra-result.json>` to `verify-beta-release.py`, in addition
to its archive/source/consumer/streaming arguments. It requires all extra cases and
checks their harness hashes against the source companion. Provision esbuild 0.28.2
in `build/public-api-tooling` for the bundled consumer checks. Component fixtures
use `fixtures/example.mp4`; the menu suite also runs in automated WebKit without
claiming Safari or physical mobile qualification.

## First npm publication

The root `package.json` deliberately remains `private: true`. Never publish from
the source root. Publish only the runtime archive identified by `verification.json`;
do not rebuild or repack it after qualification. Keep the source companion,
`SHA256SUMS`, clean build record and verification record with the public release.
Before npm publication, make the matching source companion downloadable from the
GitHub release for the recorded tag; the npm package alone is not that source offer.

1. Confirm `npm whoami`, account publishing access/2FA, and `demuxe` name
   availability or ownership (`npm view demuxe name version maintainers`).
2. Check archive metadata and `SHA256SUMS` against `verification.json`.
3. Run `npm publish ./build/release/demuxe-0.3.0-beta.3.tgz --tag beta --access public --dry-run`.
4. Only after all verification gates pass, explicitly publish:

```sh
npm publish ./build/release/demuxe-0.3.0-beta.3.tgz --tag beta --access public
```

Do not use `latest` for this beta. After publication, install `demuxe@beta` into
a brand-new temporary project, run `npx demuxe copy-assets public/assets/demuxe`,
import both `demuxe` and `demuxe/player`, and smoke-test one Native direct source
and one Hybrid/Software or Native-remux source using the installed runtime assets.
Check `npm view demuxe@beta version dist` and download the registry tarball to
compare its bytes/hash to the qualified archive. Once this first version exists,
configure npm trusted publishing for the exact GitHub workflow used for later releases.
