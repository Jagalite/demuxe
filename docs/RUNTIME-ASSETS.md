<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Runtime assets and package integration

The assetBase/copy-assets interfaces are implemented in this working candidate.
The project is not yet published to npm. Install the locally assembled archive:

```sh
npm run build
# First install verified private remux/adaptation builds; see REMUX-RUNTIME.md.
python3 scripts/package-beta.py --output build/my-candidate
# In a clean application:
npm install /absolute/path/to/demuxe-0.3.0-beta.4.tgz
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
base URL; HTTP(S) folders on the application origin or a CORS-enabled CDN are supported. The old static-directory installation
works without assetBase when generated modules retain their package paths.
Bundled applications should always provide assetBase. All inspector/worker entry
points, nested workers, engine modules/Wasm, AudioWorklet and fonts follow the
copied tree. Route-dependent loading is retained; core import and construction
perform no engine downloads. Import during SSR is safe; construction is browser-only.
The UI entry does not register anything until definePlayerElement is called.

copy-assets validates every package manifest hash before copying runtime assets,
font and notices. It writes demuxe-runtime.json with the selected asset set, version,
source manifest hash and hashes of exactly the copied files. Unrelated collisions
and symlink paths reject. Unmodified obsolete manifest-owned files are removed. Updates
may replace only previous manifest-owned unmodified assets. Retain the generated
manifest with the installation. Use core and runtime from the same archive; mixing
releases or experimental presenters is unsupported. Failed copies should be rerun
from an intact package; use a versioned destination for atomic application rollout.

The local beta runtime now includes both private JSPI/Asyncify remux and adaptation
engines for the default `remuxRuntime: 'auto'` policy. Assembly verifies their
installed manifests and hashes. When the optional private mpv service set is
installed, both standard and full copies also retain its four backend/profile
folders, host modules and MIT notice. The cooperative playback pair additionally
uses `web/engine-mpv-playback-{jspi,asyncify}/player.{mjs,wasm}` and each folder’s
manifest. Both deployment sets retain that pair when present. Partial or
hash-mismatched installations fail assembly. The playback pair’s production
qualification remains in progress. See [selection and current release boundary](REMUX-RUNTIME.md).

## Choose a deployment set and folder

One npm package contains the complete packaged runtime. The copy command controls
which files you deploy; it does not download or rebuild engines.

```sh
# Standard/lighter set, in any static folder:
npx demuxe copy-assets public/media-runtime/v1
# Complete set, including the additional RGB Software fallback:
npx demuxe copy-assets public/media-runtime/v1 --full
```

```js
const player = new Player(container, {assetBase: '/media-runtime/v1/'});
// Page-relative directories work too (resolved against document.baseURI):
const other = new Player(otherContainer, {assetBase: './runtime/'});
```

The standard set includes remux, Hybrid, selective audio, YUV Software, subtitles,
Shaka, workers, fonts and notices, plus optional engines present in the package.
It omits `web/engine-software-full/`. Use `--full` for explicit RGB Software playback
or its fallback when WebGL2 is unavailable. Both sets retain relative paths;
`assetBase` points to the directory **containing** `web/`, not to `web/` itself.
Switching sets uses the same safe update rules as upgrading a release.

## CDN hosting

```sh
npx demuxe copy-assets staging/runtime-v1 --full
# Upload the entire contents of staging/runtime-v1 to your CDN's runtime-v1 folder.
```

```js
const player = new Player(container, {
  assetBase: 'https://cdn.example.com/player/runtime-v1/'
});
```

Keep the copied tree and `demuxe-runtime.json` intact. Use a versioned CDN directory
and the matching npm package version. The manifest is a deployment integrity
record; browsers do not automatically verify its hashes on every fetch.

Configure the CDN to serve JS/mjs as `text/javascript`, Wasm as `application/wasm`,
and fonts as `font/ttf`. For public assets, send `Access-Control-Allow-Origin: *`
and `Cross-Origin-Resource-Policy: cross-origin` on assets, including nested module
imports, workers and fonts. Permit GET and HEAD requests. The application page
still needs COOP/COEP for the pthread routes described below.

CDN module workers use Blob entry points while imports and Wasm resolve against
the original CDN URLs. CSP must allow the CDN in `script-src` and `connect-src`,
`blob:` in `worker-src`, and the existing Wasm/AudioWorklet permissions. Shaka also
needs `blob:` in `script-src`. Apply these permissions to separately configured
`script-src-elem` policies as appropriate. Media CORS remains independent of asset
hosting. No proxy, fixed `/assets/demuxe/` path, or additional Player option is needed.

## Adaptive streaming runtime

`npm ci` installs the exact Shaka Player version in `package-lock.json`.
`npm run build` verifies its version, distribution hashes and retained notices,
then copies the unmodified non-UI player to `web/vendor/shaka-player.js` and its
optional transmux worker to `web/vendor/shaka-player.transmuxer-worker.js`.
These generated copies are ignored by Git. No CDN, npm resolution or Shaka UI
styles are required in the browser. `package-beta.py` includes both assets, and
`demuxe copy-assets` verifies and copies them with the rest of the runtime.

The `shaka-mse` backend loads Shaka only when selected. Ordinary file playback
does not fetch or parse this library. Asset URLs follow the configured
`assetBase`; source media must separately satisfy the browser's CORS policy.
The runtime download is shared between waiting players. Destroying a player
releases its wait immediately; destroying the last waiter aborts the download.
Successful initialization is cached for subsequent players. The loader fetches
the CORS-enabled asset and executes it through a temporary Blob script, then
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
Native Direct and Shaka can work without isolation. Remux and other pthread Wasm components require isolation; see [runtime requirements](NON-ISOLATED-REMUX.md). Media must satisfy CORS, range/identity
and source allowlist requirements. CSP must permit same-origin module scripts and
workers, Wasm compilation (wasm-unsafe-eval), same-origin worker-owner iframes,
AudioWorklet, fonts and authorized media/connect origins. Native local/remux media
needs media-src blob:. Deployments using Shaka also need same-origin `connect-src`
and `blob:` in `script-src` (or `script-src-elem` when that directive is separately
restricted). Shaka loading
does not require `unsafe-eval`. Component styles use a shadow style element; deployments
with strict style-src need an appropriate hash or policy for those shipped styles.
No consumer service worker is installed. The Pages isolation worker is demo-only.
Safari/mobile, PiP/casting and physical output fidelity remain separate qualification gates. See LICENSING.md and RELEASE.md for source
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


## Unified mpv subtitles

Embedded subtitles and external ASS/SSA, SRT, and rich WebVTT attachments use
`NativeMpvSubtitles` and `web/mpv-subtitle-worker.js`. The same service owns
track selection, timing, the canvas, fonts, seeks, and cleanup. Plain WebVTT
browser text tracks and Shaka manifest text retain their browser/Shaka owners.

The selected `remuxRuntime` chooses `web/engine-subtitles/service.{mjs,wasm}`
for pthread, or `web/engine-mpv-subtitles-{jspi,asyncify}/service.{mjs,wasm}`
for private memory. Only pthread requires cross-origin isolation. The private
services also require their hash-bound manifests. Install the default font and
notices with the runtime assets. The standalone `engine-ass` runtime and its
separate source companion are retired; subtitle sources now travel with the mpv
service's existing source/relink records.

Build pthread subtitles with `python3 scripts/build-subtitles.py`. For the
private services, use the existing private dependency build and link workflow
in [Private mpv in Player](PRIVATE-MPV-PLAYER.md), then install the rebuilt pair:

```sh
python3 scripts/install-private-mpv.py --subtitles-build /path/to/verified-build \
  --runtime-root . --replace
```

Replacement verifies the existing installed hashes before updating either
runtime. New workers require attachment ABI version 1; old service binaries
fail with a matching-assets diagnostic. Rebuild/repackage all three subtitle
services together. Existing clean-source and exact-archive release gates still
apply; local playback checks do not qualify a release.

## Exact-archive optional qualification

Run `scripts/qualify-optional-runtime.py --archive <candidate.tgz>
--adaptation-build <clean-preparation/engine>
--output <fresh-directory>`. It verifies matching source builds and tests installed
assets, consumers, automatic admission, subtitles, filters/gain, FLAC/Opus fidelity,
lifecycle and the documented unequal-tail browser policy. Failed runs are retained.

The standard `scripts/verify-beta-release.py` requires `--optional
<qualification.json>` whenever either optional engine is packaged. It checks the
archive, runtime inventory, required Chrome/Firefox matrix, tagged harness hashes,
log hashes and source-companion hashes. This adds a gate; it does not replace clean
source/tag, engine build, streaming, consumer or extra release requirements. No
qualification script creates tags or publishes. See the current closeout evidence.

When updating an existing copied runtime, `copy-assets` removes obsolete files only when their bytes still match the previous runtime manifest. Modified or unrelated files are preserved; unsafe obsolete paths are rejected. Empty directories are retained.

## Default selected-audio transcoding

The FLAC24 default fallback requires the preparation engine built with
`--transcode --opus --flac-level 0`. Supply its engine directory through
`package-beta.py --adaptation-build` to include the verified binaries and source
companion. An installation without preparation assets retains mpv/AudioWorklet.
See [audio transcoding](AUDIO-TRANSCODING.md) for precision and deployment details.
