<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Runtime assets and package integration

The assetBase/copy-assets interfaces are implemented in this working candidate.
The project is not yet published to npm. Install the locally assembled archive:

```sh
npm run build
python3 scripts/package-beta.py --output build/my-candidate
# In a clean application:
npm install /absolute/path/to/demuxe-0.3.0-beta.3.tgz
npx demuxe copy-assets public/assets/demuxe
```

```js
import {Player} from 'demuxe';
const player = new Player(container, {assetBase:'/assets/demuxe/'});
// Optional, separate UI entry:
import {definePlayerElement} from 'demuxe/player';
definePlayerElement();
```

```html
<demuxe-player controls asset-base="/assets/demuxe/"></demuxe-player>
```

assetBase is the package runtime root containing web/, fixtures/, third_party/
and LICENSE. Its trailing slash is normalized. It is resolved against the page
base URL; same-origin HTTP(S) is required. The old static-directory installation
works without assetBase when generated modules retain their package paths.
Bundled applications should always provide assetBase. All inspector/worker entry
points, nested workers, engine modules/Wasm, AudioWorklet and fonts follow the
copied tree. Route-dependent loading is retained; core import and construction
perform no engine downloads. Import during SSR is safe; construction is browser-only.
The UI entry does not register anything until definePlayerElement is called.

copy-assets validates every package manifest hash before copying runtime assets,
font and notices. It writes demuxe-runtime.json with version and hashes. It never
deletes destination files; unrelated collisions and symlink paths reject. Updates
may replace only previous manifest-owned unmodified assets. Retain the generated
manifest with the installation. Use core and runtime from the same archive; mixing
releases or experimental presenters is unsupported. Failed copies should be rerun
from an intact package; use a versioned destination for atomic application rollout.

## Adaptive streaming runtime

`npm ci` installs the exact Shaka Player version in `package-lock.json`.
`npm run build` verifies its version, distribution hashes and retained notices,
then copies the unmodified non-UI player to `web/vendor/shaka-player.js` and its
optional transmux worker to `web/vendor/shaka-player.transmuxer-worker.js`.
These generated copies are ignored by Git. No CDN, npm resolution or Shaka UI
styles are required in the browser. `package-beta.py` includes both assets, and
`demuxe copy-assets` verifies and copies them with the rest of the runtime.

The `shaka-mse` backend loads Shaka only when selected. Ordinary file playback
does not fetch or parse this library. Asset URLs follow the same-origin
`assetBase`; source media must separately satisfy the browser's CORS policy.
The runtime download is shared between waiting players. Destroying a player
releases its wait immediately; destroying the last waiter aborts the download.
Successful initialization is cached for subsequent players. The loader fetches
the same-origin asset and executes it through a temporary Blob script, then
removes the script, handlers and Blob URL. This makes initial loading cancellable
without relying on removal of a network script element to stop its download.
Shaka owns adaptive manifests, buffering, segment scheduling and MSE; Demuxe
owns selection, public state, source policy and fallback. Worker use is configured
by the backend and must satisfy the application's `worker-src` policy.

Pinned 5.2.11 distribution cost (gzip level 9, not a network measurement):

| Asset | Raw bytes | Gzip bytes |
| --- | ---: | ---: |
| Non-UI player | 829,754 | 272,773 |
| Optional transmux worker | 98,070 | 32,108 |

`third_party/shaka-player.json` records exact versions, hashes, sizes and notice
provenance. Upgrade the npm pin and this reviewed inventory together. The release
archive is self-contained and does not declare a runtime npm dependency on Shaka.

`BETA_ARCHIVE=<candidate.tgz> node tests/shaka-package.mjs` installs the archive
offline in a clean consumer, type-checks its public API, copies its runtime, and
tests direct MP4 plus H.264/AAC HLS TS, HLS fMP4 and DASH fMP4 playback, pause,
seek and destruction. Use `BROWSER=firefox` for the second required browser.
`verify-beta-release.py --shaka <chrome-result.json> <firefox-result.json>` binds
these results to the exact archive and tagged harness. This smoke gate supplements
the broader streaming and release gates; it does not establish live, DRM,
cross-browser codec coverage or performance by itself.

Serve JS/mjs as text/javascript, Wasm as application/wasm and fonts with font/ttf.
Worker routes require a secure context. Pthread engines require COOP: same-origin plus COEP: require-corp.
Native Direct, Shaka, and the scoped [JSPI remux route](NON-ISOLATED-REMUX.md) can work without isolation. Media must satisfy CORS, range/identity
and source allowlist requirements. CSP must permit same-origin module scripts and
workers, Wasm compilation (wasm-unsafe-eval), same-origin worker-owner iframes,
AudioWorklet, fonts and authorized media/connect origins. Native local/remux media
needs media-src blob:. Deployments using Shaka also need same-origin `connect-src`
and `blob:` in `script-src` (or `script-src-elem` when that directive is separately
restricted). Shaka loading
does not require `unsafe-eval`. Component styles use a shadow style element; deployments
with strict style-src need an appropriate hash or policy for those shipped styles.
No consumer service worker is installed. The Pages isolation worker is demo-only.
Arbitrary CDN worker roots, Safari/mobile, PiP/casting and physical output fidelity
remain separate qualification gates. See LICENSING.md and RELEASE.md for source
and clean-engine-build obligations; this integration does not close them.

## Optional experimental audio preparation

Local candidates built with `scripts/package-beta.py --adaptation-build <versioned-engine-dir>`
include `web/engine-adaptation/remux.mjs`, its matching `remux.wasm`, and a hash/inputs
manifest. The standard asset-copy CLI validates and copies them with the rest of
the runtime. Default packages omit these assets; ordinary Native playback does not
load them. A separately hashed `demuxe-audio-adaptation-source.tar.gz` accompanies
that candidate. This profile follows the saved FFmpeg modernization pins and does
not reuse the historical scratch LibAV binary. Preparation ABI 2 requires matching
worker, JavaScript and Wasm; mixing earlier optional binaries is rejected. Release
verification requires clean source correspondence and exact-archive optional tests;
see [current profiles, qualification and source limitations](OPTIMIZATION-COMPLETION.md).
Opus-enabled builds declare that profile in their manifest; Player still requires
explicit lossy permission. No package option enables automatic adaptation.


## Optional external Native ASS

Pass `--ass-build <versioned-ass-dir>` for the pinned libass wrapper and matching
`web/engine-ass/subtitles.mjs` / `subtitles.wasm`. The worker is lazy, and the same
asset-copy CLI copies and verifies its manifest, default font and notices. The
separate `demuxe-native-ass-source.tar.gz` contains wrapper/build inputs and preferred
library sources. Both optional source companions are listed in SHA256SUMS when
packaged together. Their presence alone is not proof of source correspondence. Packaging verifies the
clean library/source record, and release verification requires the exact-archive
optional matrix plus all existing clean tagged-source and standard release gates. See the current optimization coverage report.

### Isolated Native ASS build

`scripts/build-native-ass.py` builds only the four pinned subtitle libraries and
links the optional worker in a fresh output directory. It verifies the input
archives against `sources.lock.json`, uses a private Emscripten cache and prefix,
and records commands, source/library hashes and host tool identities. Existing
checkouts and library archives are read-only inputs; no playback engine is rebuilt.

```sh
python3 scripts/build-native-ass.py --sdk /path/to/emsdk-4.0.14 \
  --archives /path/to/verified-downloads --meson /path/to/meson \
  --output build/native-ass-clean
python3 scripts/verify-native-ass-build.py build/native-ass-clean/runtime
python3 scripts/package-beta.py --output build/optional-candidate \
  --ass-build build/native-ass-clean/runtime
python3 tests/native-ass-source-build.py
```

The archive directory must contain `freetype.tar.gz`, `fribidi.tar.gz`,
`harfbuzz.tar.gz`, and `libass.tar.gz` matching the unchanged source lock. The
builder refuses an existing output directory. Use a second fresh output to compare
runtime and library hashes. The historical Linux toolchain lock is not evidence
for a macOS build; the source-build record declares that distinction.

For clean builds, packaging verifies the source-build record before copying assets
and includes it and the isolated builder in the source companion. Installed asset
tests verify the companion's preferred sources and wrapper against those hashes.
A passing local correspondence check does not authorize release packaging; the
existing tagged-source, full-consumer and streaming release gates still apply.

## Exact-archive optional qualification

Run `scripts/qualify-optional-runtime.py --archive <candidate.tgz>
--ass-build <clean-ass/runtime> --adaptation-build <clean-preparation/engine>
--output <fresh-directory>`. It verifies matching source builds and tests installed
assets, consumers, automatic admission, subtitles, filters/gain, FLAC/Opus fidelity,
lifecycle and the documented unequal-tail browser policy. Failed runs are retained.

The standard `scripts/verify-beta-release.py` requires `--optional
<qualification.json>` whenever either optional engine is packaged. It checks the
archive, runtime inventory, required Chrome/Firefox matrix, tagged harness hashes,
log hashes and source-companion hashes. This adds a gate; it does not replace clean
source/tag, engine build, streaming, consumer or extra release requirements. No
qualification script creates tags or publishes. See the current closeout evidence.
