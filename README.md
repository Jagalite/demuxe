<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Demuxe

Browser media playback with native decoding, remuxing and WebAssembly media
engines behind one API. Use the ready-made player or build your own interface
for local files, remote media and HLS/DASH streams.

Demuxe prefers browser playback and adapts or decodes media when needed. It
handles playback-path selection, track changes, subtitles and fallback. Local
files stay in the browser; the runtime never uploads them.

**Developer beta.** This README describes the source candidate. Features and
qualification depend on the exact runtime archive; Chrome and Firefox have
representative coverage, with broader browser and device support still unqualified.
Cooperative non-isolated Hybrid/Software playback is included in this source
candidate and requires matching, verified runtime assets.

[Live player demo](https://jagalite.github.io/demuxe/) · [Capabilities](#what-you-can-build) ·
[Technologies](#technologies) · [Non-isolated playback](#playback-without-cross-origin-isolation) ·
[Tested coverage](#what-has-been-tested) · [Quick start](#quick-start) ·
[Custom UI](#build-your-own-ui) · [Deployment](#deployment-and-compatibility) ·
[Demo builds](docs/PAGES.md) · [Media comparison](#media-comparison) · [Documentation](#documentation)

## What you can build

- **A complete media player or your own UI.** Use the `<demuxe-player>` web
  component with a file queue, track selection, subtitles and keyboard controls,
  or drive the same playback system through the `Player` API.
- **Local-file, remote-file and streaming playback.** Open files and URLs, play
  HLS/DASH VOD and bounded live streams, and let Demuxe select an eligible route.
  Local media processing stays in the browser.
- **Browser video with broader container and audio support.** Remux compatible
  compressed packets without re-encoding video, or convert selected audio to
  FLAC while retaining browser video decoding. Exact codec, precision and
  container contracts determine which combinations are available.
- **Hybrid and full software decoding.** Use WebCodecs-assisted video or
  FFmpeg/mpv software decoding for sources that need it, including tested
  MPEG-2, MPEG-4 Part 2 and ProRes fixtures. Threaded engines use isolation;
  tested cooperative JSPI/Asyncify engines support qualified finite files without
  isolation.
- **Text, styled and bitmap subtitles.** Qualified routes handle external and
  embedded captions, including WebVTT, SRT, ASS/SSA, mov_text, PGS and VobSub.
  Subtitle support is checked together with the selected audio/video route.
- **Timeline previews and diagnostics.** Request thumbnails independently of
  playback, pre-generate previews, inspect selected routes and runtime state,
  and manage playback through one API. See [previews](docs/PREVIEWS.md) and the
  [public API](docs/PUBLIC-API.md).
- **Selectable runtime packages.** Choose codec slices, broad FFmpeg providers
  and the atomic mpv provider; deliver separate assets or embedded runtime
  JavaScript. Engines load on demand. See [bundling](docs/BUNDLING.md) and the
  [slice inventory](docs/CODEC-SLICE-INVENTORY.md) for local candidate status.

## Technologies

| Technology | What Demuxe uses it for |
| --- | --- |
| HTML media elements and Media Source Extensions (MSE) | Browser decoding and presentation of original or prepared media, including packet-copy remux output. |
| Shaka Player | HLS/DASH manifest handling and adaptive playback through the Shaka/MSE route. |
| WebCodecs | Video decoding in Hybrid mode when the browser accepts the exact codec configuration. Hardware acceleration depends on the browser and device. |
| FFmpeg and mpv compiled to WebAssembly | Inspection, demuxing, remuxing, selected-audio conversion, software decoding, timing and subtitle services. |
| WebAssembly pthreads, JSPI and Asyncify | Isolated threaded engines, non-isolated file preparation and subtitle/audio services, plus tested cooperative Hybrid/Software playback. |
| AudioWorklet and Web Audio | PCM audio output and browser audio processing; private services transfer PCM without shared memory. |
| WebGL2 | YUV presentation for qualified 8-bit SDR software frames, with RGB fallback for other frames. See [presentation limits](docs/SOFTWARE-YUV-PRESENTER.md). |
| TypeScript and web components | A typed playback API, ready-made controls and application-owned interfaces. |

## Playback without cross-origin isolation

**Native playback, Shaka/MSE and qualified JSPI/Asyncify services work without
COOP/COEP headers.** Non-isolated deployment can keep video decoding in the
browser while Demuxe prepares the file or supplies subtitles and selected audio.

Cooperative Hybrid and full Software playback also
run without isolation using matching JSPI/Asyncify playback assets. The finite-file
coverage includes audio resampling/downmixing, subtitles, custom fonts and filters.
Hybrid retains browser video decoding; Software decodes video in Wasm. Use the matching playback package; qualification remains scoped to the exact
fixtures, browsers and archives below.

| Capability | Without isolation | With isolation |
| --- | --- | --- |
| Browser-native and Shaka/MSE playback | Available, subject to browser/source support | Available |
| Finite-file remux and qualified FLAC24 audio conversion | JSPI or Asyncify assets | Pthread by default; JSPI/Asyncify can be selected |
| Qualified embedded and external subtitle services | Private mpv JSPI/Asyncify assets | Pthread or selected private services |
| Browser video with private mpv PCM audio | One 48 kHz stereo PCM16 stream; can compose with subtitles | Private profile or separately qualified pthread audio routes |
| Hybrid and full Software playback | Tested cooperative JSPI/Asyncify engines for qualified finite files | Pthread engines; cooperative engines can also be selected |

The default `remuxRuntime: 'auto'` chooses pthread when isolated, otherwise JSPI
when its browser APIs are present, then Asyncify. These are runtime choices;
they do not expand codec or output guarantees. Matching assets, HTTPS/localhost,
and applicable CORS/range permissions are still required. See
[runtime selection](docs/REMUX-RUNTIME.md) and
[private subtitle/audio contracts](docs/PRIVATE-MPV-PLAYER.md).

## What has been tested

The repository retains playback, output, seek, lifecycle and CPU evidence with
fixture, browser and build identities. **Recorded passes apply to those exact
combinations; they do not qualify every feature together or every newer build.**

| Area | Recorded coverage and limits |
| --- | --- |
| Complete-file playback | The [media comparison](#media-comparison) records Auto, forced Software, JSPI and Asyncify results across video, audio, containers and subtitles, including failures and pending measurements. |
| Non-isolated services | The [private mpv Player campaign](docs/PRIVATE-MPV-PLAYER.md) records 31 playback, 18 lifecycle and 12 route-extension passes on a frozen Chrome/macOS runtime. Selected exact-archive consumer checks also cover Firefox; the full matrix is not a Firefox/Safari qualification. |
| Non-isolated Hybrid/Software | 99 exact-package browser checks passed across Chromium and Firefox, followed by 21 checks on a separate review-fix archive (14 Chromium, 7 Firefox). Coverage includes codecs, consumed PCM, subtitles, controls, seeking, lifecycle and verified provider assets; see the scope below. |
| HLS/DASH | [Streaming qualification](docs/STREAMING-QUALIFICATION.md) records six passing automatic-route fixtures, including bounded live HLS. Forced-route failures and long-duration limits remain documented. |
| Modular codecs and bundles | The [slice inventory](docs/CODEC-SLICE-INVENTORY.md) separates historical package qualification, exact installed Chromium campaigns and native packet/output tests. Coverage is finite; current Firefox/Linux and release gates remain open. |
| Browser and device coverage | Representative Chrome/macOS and selected Firefox checks exist. Safari/mobile, physical HDR and surround output, PiP/casting and broad device/performance coverage remain unqualified. |

The [completion record](docs/NONISOLATED-PLAYBACK-COMPLETION.md) preserves the
original branch evidence. Its original 99 checks bind to source
`13643784d3863fd0d8f57cf85710397378303ef8`; the 21 review checks bind to
`ef838b4f501166ccc95b159c7deba21eececa7ad`. The latter are a focused follow-up,
not a rerun of all 99 checks. Runtime/source correspondence and unchanged isolated
engine binaries were verified. Full CPU benchmarks were outside this campaign;
continuous 4K qualification is limited to 5 fps, and forced Hybrid HEVC remains
unsupported in the tested Firefox configuration. These results do not relabel the
historical comparison rows or qualify a merged build or published release.

Playback success alone does not establish lossless output, discrete surround,
Atmos object rendering or Dolby Vision/HDR fidelity. See the
[capability reference](docs/CAPABILITIES.md) for implemented contracts and the
[comparison evidence guide](docs/MEDIA-COMPARISON-EVIDENCE.md) for measured scope.

## Quick start

The [asset integration guide](docs/RUNTIME-ASSETS.md) documents installation
from a locally assembled candidate. Build and verify an archive using the
[release recipe](docs/RELEASE.md), then install it in your application:

```sh
# Replace this path with your verified candidate archive.
npm install /absolute/path/to/demuxe-0.3.0-beta.4.tgz
npx demuxe copy-assets public/assets/demuxe
```

For modular packages, the optional [provider bundling guide](docs/BUNDLING.md)
shows how to choose codec slices, broad FFmpeg providers and the atomic mpv
provider in your build config. Deliver your selection as separate assets or one
embedded runtime JavaScript file; Demuxe loads the providers needed for playback.
An explicit provider list controls what ships, while `all` includes every
installed provider, including both broad builds and slices. The guide includes
CLI and JavaScript examples, runtime cleanup and testing status. The bundler is
currently a local package candidate and has not been published to npm.
See the [codec slice inventory and prioritized backlog](docs/CODEC-SLICE-INVENTORY.md)
for the maintained slice packages, their testing status, and the remaining codec and release work.
Use the [provider testing guide](docs/PROVIDER-TESTING.md) to run the shared
conformance checks against a candidate package, compare it with packaged Wasm
FFmpeg using `--baseline`, or adapt a replacement provider.

The optional provider architecture has **30 slices** (23 audio, one container and six full-file preparation packages), alongside four broad providers. The implemented finite P2 offers pass **87 standard conformance contracts**, **1,172 installed Chromium component API cases** across assets and embedded delivery, and the merged ordinary-core atomic mpv public Player passes **30 cases**. See [the slice inventory](docs/CODEC-SLICE-INVENTORY.md) for exact provider identities, receipts, supported configurations and exclusions. Broader WMA configurations remain fixture-blocked P2 work; current Firefox/Linux, clean-build, device/performance and release gates remain separate. These component results do not automatically admit every codec to the default Player.

Serve the copied directory at `/assets/demuxe/`. In your application's JavaScript
entry point, register the player:

```js
import { definePlayerElement } from 'demuxe/player';

definePlayerElement();
```

Add it to your page:

```html
<demuxe-player controls asset-base="/assets/demuxe/"></demuxe-player>
```

Use the player's file picker or URL field to open media, then press Play. The
component includes a file queue, subtitles, track selection, keyboard shortcuts
and optional diagnostics. See [component customization](docs/PLAYER-COMPONENT.md)
for styling and application integration, and the [deployment requirements](#deployment-and-compatibility)
for enabling the available playback paths.

## Build your own UI

Use `Player` directly when your application supplies the controls:

```html
<div id="player"></div>
<button id="play">Play</button>
```

```js
import { Player } from 'demuxe';

const player = new Player(document.querySelector('#player'), {
  assetBase: '/assets/demuxe/'
});

await player.open('/media/example.mp4'); // Replace with your URL or a File.
document.querySelector('#play').addEventListener('click', () => {
  player.play().catch(console.error);
});
// On application teardown: await player.destroy();
```

The [public API](docs/PUBLIC-API.md) covers playback, tracks, events, state and
cleanup. The [application extensions](docs/API-EXTENSIONS.md) cover custom
sources, resume, metadata and presentation. Engines load on demand; optional
[asset preparation](docs/PLAYBACK-TIER-POLICY.md) can fetch and compile them ahead
of use.

## How playback works

Automatic selection considers the source, browser, selected tracks and requested
features. The three public modes are:

- **Native** — browser playback, with remuxing or selected-audio adaptation when
  needed. HLS/DASH can use the Shaka/MSE backend; compatible HLS VOD can play
  directly. Qualified subtitle and audio services can accompany browser video.
- **Hybrid** — WebCodecs-assisted playback with mpv/FFmpeg services.
- **Software** — FFmpeg/mpv software decoding when the other paths cannot satisfy
  the request. Decode quality defaults to `exact`; lossy shortcuts are opt-in.

Demuxe owns selection, state and fallback. Available paths depend on runtime
assets and deployment requirements. See [capabilities](docs/CAPABILITIES.md),
[route policy](docs/PLAYBACK-TIER-POLICY.md) and [streaming](docs/STREAMING.md)
for supported combinations and their limits.

## Deployment and compatibility

Use HTTPS or localhost. Keep the copied asset tree intact and use the same
archive for the JavaScript package and runtime assets. `assetBase` can point to
a different static folder or a CORS-enabled CDN. Add `--full` to `copy-assets`
for the additional RGB Software fallback engine; see [asset deployment](docs/RUNTIME-ASSETS.md)
for MIME types, CDN headers and CSP.

**Pthread Wasm engines require cross-origin isolation.**
For pthread playback, serve these headers or an equivalent configuration that
makes `crossOriginIsolated` true:

```http
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

Browser-native and Shaka/MSE playback do not require isolation. With the matching
private runtime assets, `remuxRuntime: 'auto'` selects pthread when isolated,
otherwise JSPI when supported or Asyncify. Qualified non-isolated paths cover
file remuxing, FLAC24 audio transcoding, embedded subtitles and restricted
48 kHz stereo PCM16 audio. Cooperative Hybrid/Software extends non-isolated
playback to qualified finite files with matching full playback assets. See
[tested coverage](#what-has-been-tested) for exact package evidence and limits,
and [runtime selection and qualification](docs/REMUX-RUNTIME.md). Always use
the matching verified package and runtime assets.

Remote media needs the CORS permissions and range support required by its path.
Support depends on the browser, codec, source and requested features. Safari,
mobile, physical HDR/surround, PiP/casting and broad device/performance
qualification remain follow-up work. The [capability reference](docs/CAPABILITIES.md)
separates implementation from tested coverage.

<a id="representative-head-to-head-media-evidence-default-routes-plus-forced-software"></a>

## Media comparison

These are bounded complete-file playback tests. Each cell retains its own fixture,
browser, route and campaign scope; this is not an exhaustive compatibility matrix.
CPU is expressed as a percentage of one core. Values from separate campaigns are
not matched performance comparisons, and blank CPU values indicate a qualification
gap. See the [evidence guide](docs/MEDIA-COMPARISON-EVIDENCE.md#current-table-evidence)
for row notes, measurements and limitations.

- 🟢 **Pass:** bounded playback passed. `*` indicates a fidelity, profile or duration limit.
- 🟣 **Configured pass:** a named alternative passed where the default failed.
- 🟠 **Plays:** initial playback passed but a later check failed.
- 🔴 **Fail:** a playback check failed; this does not establish an unsupported codec.
- 🟡 **Screened:** a bounded specialist check with stated fidelity limits.
- **— Unqualified:** the exact source fixture or reference output is unavailable.
- **— Untested:** no playback or CPU measurements for that cell.

Auto records automatic selection; Software pins software decoding. JSPI and
Asyncify cells cover measured file remux/transcode playback without COOP/COEP;
their matched controls are in the [runtime CPU report](docs/JSPI-ASYNCIFY-PLAYER-CPU.md).
`N/A · native-direct bypass` means configured playback passed but did not exercise
the requested remux runtime. `forced-remux ref` uses `nativeRemux: 'always'`
to exercise the requested runtime; its CPU is a configured reference, not Auto-policy CPU.
Fresh gaps are tested in [row order](docs/README-BACKLOG-RESULTS.md).
MediaBunny uses its official player example with local File input, while the
maintained-player comparison uses local URLs; its screened results do not qualify
1.25× playback or independent cleanup. A bare `—` means no test for that exact row;
N/A means the tested integration has no applicable playback result for that scope.
For HLS/DASH playlist rows, JSPI and Asyncify are N/A because these columns measure
file remux/transcode runtimes; the MediaBunny example is N/A because its local
File chooser cannot supply the playlist URL and segment requests.

The [October 2026 row refresh](docs/README-REFRESH-20261001.md) identifies the current captured player source, browser and per-row evidence. Other cells retain their historical campaigns; nonisolated Hybrid/Software observations are reported separately.

| Media format | Native video | Demuxe (auto) | Demuxe JSPI | Demuxe Asyncify | Demuxe (software decode) | Movi 0.4.0 (default) | AVPlayer 1.3.1 (default) | MediaBunny (player example) | Video.js 8.24.1 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| H.264 + AAC / MP4 | 🟢 (Pass) · 11.7% CPU | 🟢 (Pass) · 13.5% CPU | 🟢 (Pass) · 15.4% CPU · forced-remux ref | 🟢 (Pass) · 16.0% CPU · forced-remux ref | 🟢 (Pass) · 35.0% CPU | 🔴 (Fail) | 🟢 (Pass) · 32.4% CPU | 🟡 Screened · 34.6% CPU | 🟢 (Pass) · 24.0% CPU |
| H.264 + AAC / MKV | 🟢 (Pass) · 9.3% CPU | 🟢 (Pass) · 14.1% CPU | 🟢 (Pass) · 16.3% CPU · forced-remux ref | 🟢 (Pass) · 15.9% CPU · forced-remux ref | 🟢 (Pass) · 34.0% CPU | 🔴 (Fail) | 🟢 (Pass) · 28.3% CPU | 🟡 Screened · 33.8% CPU | 🟢 (Pass) · 21.7% CPU |
| Dual-audio H.264 + AAC + AC-3 stereo / MKV | 🟢 (Pass) · 13.9% CPU · default AAC | 🟢 (Pass) · 13.5% CPU · initial AAC | 🟢 (Pass) · 16.3% CPU · initial AAC · forced-remux ref | 🟢 (Pass) · 16.9% CPU · initial AAC · forced-remux ref | 🟢 (Pass) · 35.2% CPU · initial AAC | 🔴 (Fail) | 🟢 (Pass) · 32.8% CPU | 🟡 Screened · 35.3% CPU · primary track | 🟢 (Pass) · 23.5% CPU · default track |
| H.264 + PCM24 / MKV | 🟢 (Pass) · 9.6% CPU | 🟢 (Pass) · 13.2% CPU | 🟢 (Pass) · 18.0% CPU · forced-remux ref | 🟢 (Pass) · 19.2% CPU · forced-remux ref | 🟢 (Pass) · 33.6% CPU | 🟢 (Pass) · CPU withheld | 🔴 (Fail) | 🟡 Screened · 32.5% CPU | 🟢 (Pass) · 17.2% CPU |
| H.264 + PCM24 / MKV + ASS | 🟢 (Pass) · CPU withheld · host libass | 🟢 (Pass) · 16.2% CPU | 🟢 (Pass) · 18.3% CPU · forced-remux ref | 🟢 (Pass) · 7.5% CPU · forced-remux ref | 🟢 (Pass) · 26.0% CPU | 🔴 (Fail) | 🔴 (Fail) | 🔴 (Fail) · external ASS unavailable | 🔴 (Fail) |
| H.264 + AAC 5.1 / MP4 | 🟢 (Pass)\* · 14.8% CPU | 🟡 Screened* · 13.6% CPU | 🟡 Screened* · 17.4% CPU · forced-remux ref | 🟡 Screened* · 17.2% CPU · forced-remux ref | 🟡 Screened* · 36.3% CPU | 🔴 (Fail) | 🟢 (Pass)\* · 33.4% CPU | 🟡 Screened* · 37.2% CPU | 🟡 Screened* · 6.1% CPU |
| H.264 + MP3 stereo / MP4 | 🟢 (Pass) · 13.3% CPU | 🟢 (Pass) · 13.5% CPU | 🟢 (Pass) · 17.7% CPU · forced-remux ref | 🟢 (Pass) · 17.2% CPU · forced-remux ref | 🟢 (Pass) · 35.8% CPU | 🔴 (Fail) | 🟢 (Pass) · 34.2% CPU | 🟡 Screened · 34.7% CPU | 🟢 (Pass) · 9.0% CPU |
| H.264 + AC-3 5.1 / MKV | 🔴 (Fail) | 🟡 Screened* · 19.5% CPU | 🟡 Screened* · 17.6% CPU · forced-remux ref | 🟡 Screened* · 18.3% CPU · forced-remux ref | 🟡 Screened* · 33.9% CPU | 🔴 (Fail) | 🟡 Screened* · 21.8% CPU | 🟡 Screened* · 35.5% CPU | 🔴 (Fail) |
| H.264 + E-AC-3 5.1 / MKV | 🔴 (Fail) | 🟡 Screened* · CPU withheld | 🟡 Screened* · 13.5% CPU · forced-remux ref | 🟡 Screened* · 14.9% CPU · forced-remux ref | 🟡 Screened* · 13.5% CPU | 🔴 (Fail) | 🟢 (Pass)\* · 32.8% CPU | 🟡 Screened* · 35.9% CPU | 🔴 (Fail) |
| H.264 + DTS core 5.1 / MKV | 🔴 (Fail) | 🟡 Screened* · 20.4% CPU | 🟡 Screened* · 20.4% CPU · forced-remux ref | 🟡 Screened* · 20.7% CPU · forced-remux ref | 🟡 Screened* · 38.2% CPU | 🔴 (Fail) | 🟢 (Pass)\* · 36.9% CPU | 🟡 Screened* · 38.5% CPU | 🔴 (Fail) |
| H.264 + AC-3 stereo / MKV | 🔴 (Fail) | 🟢 (Pass) · 17.6% CPU | 🟢 (Pass) · 17.7% CPU · forced-remux ref | 🟢 (Pass) · 17.2% CPU · forced-remux ref | 🟢 (Pass) · 35.2% CPU | 🔴 (Fail) | 🟢 (Pass) · 32.9% CPU | 🟡 Screened · 33.8% CPU | 🔴 (Fail) |
| H.264 + E-AC-3 stereo / MKV | 🔴 (Fail) | 🟢 (Pass) · 17.8% CPU | 🟢 (Pass) · 16.9% CPU · forced-remux ref | 🟢 (Pass) · 17.7% CPU · forced-remux ref | 🟢 (Pass) · 33.8% CPU | 🔴 (Fail) | 🟢 (Pass) · 33.6% CPU | 🟡 Screened · 34.4% CPU | 🔴 (Fail) |
| H.264 + DTS core stereo / MKV | 🔴 (Fail) | 🟢 (Pass) · 18.2% CPU | 🟢 (Pass) · 18.1% CPU · forced-remux ref | 🟢 (Pass) · 18.4% CPU · forced-remux ref | 🟢 (Pass) · 36.9% CPU | 🔴 (Fail) | 🟢 (Pass) · 37.8% CPU | 🟡 Screened · 35.5% CPU | 🔴 (Fail) |
| H.264 + FLAC stereo / MKV | 🟢 (Pass) · 13.2% CPU | 🟢 (Pass) · 13.7% CPU · native-direct | 🟢 (Pass) · 18.0% CPU · forced-remux ref | 🟢 (Pass) · 18.6% CPU · forced-remux ref | 🟢 (Pass) · 34.7% CPU | 🔴 (Fail) | 🟢 (Pass) · 33.7% CPU | 🟡 Screened · 33.1% CPU | 🟢 (Pass) · CPU withheld |
| H.264 + FLAC 5.1 / MKV | 🟢 (Pass)\* · 14.0% CPU | 🟢 (Pass)\* · 14.3% CPU · native-direct | 🟡 Screened* · 19.0% CPU · forced-remux ref | 🟡 Screened* · 18.2% CPU · forced-remux ref | 🟢 (Pass)* · 35.2% CPU | 🔴 (Fail) | 🟢 (Pass)\* · 33.2% CPU | 🟡 Screened* · 33.7% CPU | 🟡 Screened* · 23.5% CPU |
| H.264 + Opus stereo / MKV | 🟢 (Pass) · 14.3% CPU | 🟢 (Pass) · 15.1% CPU · native-direct | 🟢 (Pass) · 16.5% CPU · forced-remux ref | 🟢 (Pass) · 17.6% CPU · forced-remux ref | 🟢 (Pass) · 35.0% CPU | 🟢 (Pass) · 30.2% CPU | 🟢 (Pass) · 35.3% CPU | 🟡 Screened · 35.2% CPU | 🟢 (Pass) · 25.0% CPU |
| H.264 + PCM16 stereo / MKV | 🟢 (Pass) · 12.9% CPU | 🟢 (Pass) · 14.2% CPU · native-direct | 🟢 (Pass) · 17.5% CPU · forced-remux ref | 🟢 (Pass) · 18.7% CPU · forced-remux ref | 🟢 (Pass) · 34.8% CPU | 🟢 (Pass) · 33.2% CPU | 🔴 (Fail) | 🟡 Screened · 32.5% CPU | 🟢 (Pass) · 21.5% CPU |
| H.264 + PCM24 5.1 / MKV | 🟢 (Pass)\* · 13.4% CPU | 🟢 (Pass)\* · 13.9% CPU · native-direct | 🔴 (Fail) · forced-remux ref | 🔴 (Fail) · forced-remux ref | 🟢 (Pass)* · 34.8% CPU | 🟢 (Pass)\* · 26.1% CPU | 🔴 (Fail) | 🟡 Screened* · 34.5% CPU | 🟡 Screened* · 22.9% CPU |
| HEVC Main 8-bit + AAC / MP4 (hvc1) | 🟢 (Pass) · 14.8% CPU | 🟢 (Pass) · 15.8% CPU · native-direct | 🟢 (Pass) · 16.0% CPU · forced-remux ref | 🟢 (Pass) · 17.2% CPU · forced-remux ref | 🟢 (Pass) · 35.1% CPU | 🔴 (Fail) | 🟢 (Pass) · 33.1% CPU | 🟡 Screened · 41.1% CPU | 🟢 (Pass) · CPU withheld |
| HEVC Main 8-bit + AAC / MP4 (hev1) | 🟢 (Pass) · 14.7% CPU | 🟢 (Pass) · 15.1% CPU · native-direct | 🟢 (Pass) · 17.4% CPU · forced-remux ref | 🟢 (Pass) · 15.9% CPU · forced-remux ref | 🟢 (Pass) · 35.6% CPU | 🔴 (Fail) | 🟢 (Pass) · 34.4% CPU | 🟡 Screened · 41.6% CPU | 🟢 (Pass) · 23.0% CPU |
| HEVC Main 10-bit SDR + AAC / MP4 | 🟢 (Pass) · 18.4% CPU | 🟢 (Pass) · 18.5% CPU · native-direct | 🟢 (Pass) · 18.5% CPU · forced-remux ref | 🟢 (Pass) · 18.9% CPU · forced-remux ref | 🟢 (Pass) · 37.2% CPU | 🔴 (Fail) | 🟢 (Pass) · 37.4% CPU | 🟡 Screened · 41.1% CPU | 🟢 (Pass) · 25.1% CPU |
| HEVC Main 10 4:2:2 + AAC / MKV | 🟢 (Pass)\* · 17.8% CPU | 🟢 (Pass)\* · 18.6% CPU · native-direct | 🟢 (Pass) · 19.0% CPU · forced-remux ref | 🟢 (Pass) · 19.2% CPU · forced-remux ref | 🟢 (Pass)* · 37.2% CPU | 🟢 (Pass) · CPU withheld | 🟢 (Pass)* · 37.6% CPU | 🟡 Screened* · 41.4% CPU | 🟢 (Pass) · 25.2% CPU |
| HEVC Main 10-bit SDR + AC-3 / MKV | 🔴 (Fail) | 🟢 (Pass) · 21.0% CPU · native-transcode | 🟢 (Pass) · 20.5% CPU · forced-remux ref | 🟢 (Pass) · 19.7% CPU · forced-remux ref | 🟢 (Pass) · 35.8% CPU | 🔴 (Fail) | 🟢 (Pass) · 36.8% CPU | 🟡 Screened · 40.6% CPU | 🔴 (Fail) |
| HEVC Main 10-bit SDR + E-AC-3 / MKV | 🔴 (Fail) | 🟢 (Pass) · 21.5% CPU · native-transcode | 🟢 (Pass) · 20.9% CPU · forced-remux ref | 🟢 (Pass) · 19.9% CPU · forced-remux ref | 🟢 (Pass) · 35.9% CPU | 🔴 (Fail) | 🟢 (Pass) · 36.9% CPU | 🟡 Screened · 42.0% CPU | 🔴 (Fail) |
| HEVC Main 10-bit SDR + DTS core / MKV | 🔴 (Fail) | 🟢 (Pass) · 21.6% CPU · native-transcode | 🟢 (Pass) · 20.1% CPU · forced-remux ref | 🟢 (Pass) · 21.0% CPU · forced-remux ref | 🟢 (Pass) · 34.5% CPU | 🔴 (Fail) | 🟢 (Pass) · 41.4% CPU | 🟡 Screened* · 44.1% CPU | 🔴 (Fail) |
| AV1 8-bit + AAC / MP4 | 🟢 (Pass) · 13.6% CPU | 🟢 (Pass) · 14.2% CPU · native-direct | 🟢 (Pass) · 14.0% CPU · forced-remux ref | 🟢 (Pass) · 15.3% CPU · forced-remux ref | 🟢 (Pass) · 36.7% CPU | 🔴 (Fail) | 🟢 (Pass) · 37.2% CPU | 🟡 Screened · 33.5% CPU | 🟢 (Pass) · 21.8% CPU |
| AV1 10-bit SDR + Opus / MKV | 🟢 (Pass) · 18.0% CPU | 🟢 (Pass) · 17.8% CPU · native-direct | 🟢 (Pass) · 18.6% CPU · forced-remux ref | 🟢 (Pass) · 18.6% CPU · forced-remux ref | 🟢 (Pass) · 37.1% CPU | 🔴 (Fail) | 🟢 (Pass) · 38.5% CPU | 🟡 Screened · 36.3% CPU | 🟢 (Pass) · 25.3% CPU |
| AV1 + Opus / WebM | 🟢 (Pass) · 14.6% CPU | 🟢 (Pass) · 15.3% CPU · native-direct | 🟢 (Pass) · 16.4% CPU · forced-remux ref | 🟢 (Pass) · 15.6% CPU · forced-remux ref | 🟢 (Pass) · 36.2% CPU | 🔴 (Fail) | 🟢 (Pass) · 38.3% CPU | 🟡 Screened · 34.9% CPU | 🟢 (Pass) · 24.0% CPU |
| VP9 8-bit + Opus / WebM | 🟢 (Pass) · 14.0% CPU | 🟢 (Pass) · 14.1% CPU · native-direct | 🟢 (Pass) · 17.5% CPU · forced-remux ref | 🟢 (Pass) · 17.5% CPU · forced-remux ref | 🟢 (Pass) · 36.6% CPU | 🔴 (Fail) | 🟢 (Pass) · 34.9% CPU | 🟡 Screened · 34.2% CPU | 🟢 (Pass) · 22.6% CPU |
| VP9 10-bit SDR + Opus / WebM | 🟢 (Pass) · 16.6% CPU | 🟢 (Pass) · 17.1% CPU · native-direct | 🟢 (Pass) · 19.6% CPU · forced-remux ref | 🟢 (Pass) · 20.3% CPU · forced-remux ref | 🟢 (Pass) · 36.4% CPU | 🔴 (Fail) | 🔴 (Fail) | 🟡 Screened · 34.7% CPU | 🟢 (Pass) · 25.5% CPU |
| VP8 + Vorbis / WebM | 🟢 (Pass) · 13.4% CPU | 🟢 (Pass) · 14.7% CPU · native-direct | 🟢 (Pass) · 14.0% CPU · forced-remux ref | 🟢 (Pass) · 14.0% CPU · forced-remux ref | 🟢 (Pass) · 34.8% CPU | 🔴 (Fail) | 🟢 (Pass) · 35.6% CPU | 🟡 Screened · 32.8% CPU | 🟢 (Pass) · 22.1% CPU |
| H.264 + AAC / MPEG-TS | 🔴 (Fail) | 🟢 (Pass) · 18.7% CPU · native-remux | 🟢 (Pass) · 17.9% CPU · native-remux | 🟢 (Pass) · 18.7% CPU · native-remux | 🟢 (Pass) · 36.8% CPU | 🔴 (Fail) | 🟢 (Pass) · 35.4% CPU | 🟡 Screened · 34.6% CPU | 🔴 (Fail) |
| MPEG-2 video + AC-3 / MPEG-TS | 🔴 (Fail) | 🟢 (Pass) · 33.7% CPU · software | 🔴 (Fail) · forced-remux ref | 🔴 (Fail) · forced-remux ref | 🟢 (Pass) · 33.9% CPU | 🟢 (Pass) · 30.1% CPU | 🟢 (Pass) · 34.7% CPU | 🔴 (Fail) | 🔴 (Fail) |
| Interlaced MPEG-2 + AC-3 stereo / MPEG-TS | 🔴 (Fail) | 🟢 (Pass)\* · 33.1% CPU · software · visible combing | 🔴 (Fail) · forced-remux ref | 🔴 (Fail) · forced-remux ref | 🟢 (Pass)* · 33.7% CPU | 🔴 (Fail) | 🟢 (Pass)\* · 33.6% CPU | 🔴 (Fail) | 🔴 (Fail) |
| MPEG-2 video + MP2 / MPEG-PS | 🔴 (Fail) | 🟢 (Pass)\* · 33.9% CPU · software | 🔴 (Fail) · forced-remux ref | 🔴 (Fail) · forced-remux ref | 🟢 (Pass) · 34.1% CPU | 🔴 (Fail) | 🔴 (Fail) | 🔴 (Fail) | 🔴 (Fail) |
| MPEG-4 Part 2 + MP3 / AVI | 🔴 (Fail) | 🟢 (Pass)\* · 33.7% CPU · software | 🔴 (Fail) · forced-remux ref | 🔴 (Fail) · forced-remux ref | 🟢 (Pass) · 34.5% CPU | 🔴 (Fail) | 🔴 (Fail) | 🔴 (Fail) | 🔴 (Fail) |
| ProRes + PCM / MOV | 🔴 (Fail) | 🟢 (Pass)\* · 36.9% CPU · software | 🔴 (Fail) · forced-remux ref | 🔴 (Fail) · forced-remux ref | 🟢 (Pass) · 36.4% CPU | 🔴 (Fail) | 🔴 (Fail) | 🟡 Screened* · 33.0% CPU | 🔴 (Fail) |
| H.264 + AAC / fragmented MP4 (single file) | 🟢 (Pass) · 13.6% CPU | 🟢 (Pass) · 14.0% CPU · native-direct | 🟢 (Pass) · 14.9% CPU · forced-remux ref | 🟢 (Pass) · 16.8% CPU · forced-remux ref | 🟢 (Pass) · 35.1% CPU | 🔴 (Fail) | 🔴 (Fail) | 🟡 Screened · 33.1% CPU | 🟢 (Pass) · 23.9% CPU |
| H.264 video-only / MP4 | 🟢 (Pass) · 11.5% CPU | 🟢 (Pass) · 12.1% CPU · native-direct | 🟢 (Pass) · 14.7% CPU · forced-remux ref | 🟢 (Pass) · 14.0% CPU · forced-remux ref | 🟢 (Pass) · 31.9% CPU | 🟢 (Pass) · 32.1% CPU | 🟢 (Pass) · 25.5% CPU | 🟡 Screened · 31.8% CPU | 🟢 (Pass) · 18.9% CPU |
| H.264 High 10 + AAC / MKV | 🟢 (Pass)\* · 17.4% CPU | 🟢 (Pass)\* · 17.6% CPU · native-direct | 🟢 (Pass) · 17.4% CPU · forced-remux ref | 🟢 (Pass) · 16.1% CPU · forced-remux ref | 🟢 (Pass)* · 36.3% CPU | 🔴 (Fail) | 🟢 (Pass)* · 35.4% CPU | 🟡 Screened* · 33.3% CPU | 🟢 (Pass) · 26.5% CPU |
| MPEG-2 video-only / MPEG-TS | 🔴 (Fail) | 🟢 (Pass) · 31.6% CPU · software | 🔴 (Fail) · forced-remux ref | 🔴 (Fail) · forced-remux ref | 🟢 (Pass) · 31.2% CPU | 🟢 (Pass) · 30.6% CPU | 🟢 (Pass) · 25.7% CPU | 🔴 (Fail) | 🔴 (Fail) |
| H.264 + AAC + embedded SRT / MKV | 🔴 (Fail) | 🟢 (Pass) · 18.7% CPU · native-remux-mpv | 🟢 (Pass) · 5.9% CPU · forced-remux ref | 🟢 (Pass) · 8.6% CPU · forced-remux ref | 🟢 (Pass) · 37.2% CPU | 🔴 (Fail) | 🔴 (Fail) | 🔴 (Fail) | 🔴 (Fail) |
| H.264 + AAC + external WebVTT / MP4 | 🟢 (Pass) · 13.7% CPU | 🟢 (Pass) · 14.3% CPU · native-direct | 🟢 (Pass) · 17.1% CPU · forced-remux ref | 🟢 (Pass) · 4.6% CPU · forced-remux ref | 🟢 (Pass) · 35.8% CPU | 🔴 (Fail) | 🔴 (Fail) | 🔴 (Fail) | 🟢 (Pass) · 11.1% CPU |
| H.264 + AAC + embedded mov_text / MP4 | 🔴 (Fail) | 🟢 (Pass) · 18.3% CPU · native-remux-mpv | 🟢 (Pass) · 5.3% CPU · forced-remux ref | 🟢 (Pass) · 5.7% CPU · forced-remux ref | 🟢 (Pass) · 35.5% CPU | 🔴 (Fail) | 🔴 (Fail) | 🔴 (Fail) | 🔴 (Fail) |
| H.264 + AAC + styled ASS / MKV | 🔴 (Fail) | 🟢 (Pass) · 18.1% CPU · native-remux-mpv | 🟢 (Pass) · 13.5% CPU · forced-remux ref | 🟢 (Pass) · 17.1% CPU · forced-remux ref | 🟢 (Pass) · 35.9% CPU | 🔴 (Fail) | 🔴 (Fail) | 🔴 (Fail) | 🔴 (Fail) |
| H.264 + AC-3 stereo + ASS / MKV | 🔴 (Fail) | 🟢 (Pass) · 19.7% CPU · native-transcode-mpv | 🟢 (Pass) · CPU withheld · forced-remux ref | 🟢 (Pass) · CPU withheld · forced-remux ref | 🟢 (Pass) · 35.3% CPU | 🔴 (Fail) | 🔴 (Fail) | 🔴 (Fail) | 🔴 (Fail) |
| HEVC + AC-3 + PGS / MKV | 🔴 (Fail) | 🟢 (Pass)\* · 21.2% CPU · native-transcode-mpv | 🟢 (Pass) · 6.1% CPU · forced-remux ref | 🟢 (Pass) · 7.0% CPU · forced-remux ref | 🟢 (Pass) · 36.4% CPU | 🔴 (Fail) | 🔴 (Fail) | 🔴 (Fail) | 🔴 (Fail) |
| H.264 + AC-3 + VobSub / MKV | 🔴 (Fail) | 🟢 (Pass)\* · 18.6% CPU · native-transcode-mpv | 🟢 (Pass) · CPU withheld · forced-remux ref | 🟢 (Pass) · 6.4% CPU · forced-remux ref | 🟢 (Pass) · 35.2% CPU | 🔴 (Fail) | 🔴 (Fail) | 🔴 (Fail) | 🔴 (Fail) |
| H.264 + AAC + PGS / MKV (subtitle isolation) | 🔴 (Fail) | 🟢 (Pass) · 18.5% CPU · native-remux-mpv | 🟢 (Pass) · 17.5% CPU · forced-remux ref | 🟢 (Pass) · 19.8% CPU · forced-remux ref | 🟢 (Pass) · 35.0% CPU | 🔴 (Fail) | 🔴 (Fail) | 🔴 (Fail) | 🔴 (Fail) |
| H.264 + AAC + VobSub / MKV (subtitle isolation) | 🔴 (Fail) | 🟢 (Pass) · 18.6% CPU · native-remux-mpv | 🟢 (Pass) · 18.2% CPU · forced-remux ref | 🟢 (Pass) · 19.7% CPU · forced-remux ref | 🟢 (Pass)* · 35.9% CPU | 🔴 (Fail) | 🔴 (Fail) | 🔴 (Fail) | 🔴 (Fail) |
| AAC audio-only / M4A | 🟢 (Pass) · 2.4% CPU | 🟢 (Pass) · 3.2% CPU · native-direct | 🟢 (Pass) · 5.8% CPU · forced-remux ref | 🟢 (Pass) · 5.9% CPU · forced-remux ref | 🟢 (Pass) · 10.6% CPU | 🟢 (Pass) · CPU withheld | 🟢 (Pass) · 9.9% CPU | 🟡 Screened · 45.4% CPU | 🟢 (Pass) · 11.3% CPU |
| MP3 audio-only / MP3 | 🟢 (Pass) · 0.9% CPU | 🟢 (Pass) · 1.3% CPU · native-direct | 🔴 (Fail) · forced-remux ref | 🔴 (Fail) · forced-remux ref | 🟢 (Pass) · 2.8% CPU | 🟢 (Pass) · CPU withheld | 🔴 (Fail) | 🟡 Screened · 10.1% CPU | 🟢 (Pass) · 11.5% CPU |
| FLAC audio-only / FLAC | 🟢 (Pass) · 2.1% CPU | 🟢 (Pass) · 3.0% CPU · native-direct | 🟢 (Pass) · 7.4% CPU · forced-remux ref | 🟢 (Pass) · 8.1% CPU · forced-remux ref | 🟢 (Pass) · 10.4% CPU | 🟢 (Pass) · CPU withheld | 🟢 (Pass) · 8.0% CPU | 🟡 Screened · 42.9% CPU | 🟢 (Pass) · 10.1% CPU |
| Opus audio-only / Ogg | 🟢 (Pass) · 3.4% CPU | 🟢 (Pass) · 4.2% CPU · native-direct | 🟢 (Pass) · 6.4% CPU · forced-remux ref | 🟢 (Pass) · 6.4% CPU · forced-remux ref | 🟢 (Pass) · 11.7% CPU | 🟢 (Pass) · CPU withheld | 🔴 (Fail) | 🟡 Screened · 45.8% CPU | 🟢 (Pass) · 12.7% CPU |
| Vorbis audio-only / Ogg | 🟢 (Pass) · 2.3% CPU | 🟢 (Pass) · 3.3% CPU · native-direct | 🟢 (Pass) · 5.7% CPU · forced-remux ref | 🟢 (Pass) · 5.6% CPU · forced-remux ref | 🟢 (Pass) · 10.1% CPU | 🔴 (Fail) | 🔴 (Fail) | 🟡 Screened* · 45.9% CPU | 🟢 (Pass) · 11.1% CPU |
| PCM16 audio-only / WAV | 🟠 | 🟢 (Pass) · 3.1% CPU · native-direct | 🔴 (Fail) · forced-remux ref | 🔴 (Fail) · forced-remux ref | 🟢 (Pass) · 8.7% CPU | 🟢 (Pass) · CPU withheld | 🔴 (Fail) | 🟡 Screened* · 11.1% CPU | 🟢 (Pass) · 11.1% CPU |
| PCM24 audio-only / WAV | 🟠 | 🟢 (Pass) · 3.4% CPU · native-direct | 🔴 (Fail) · forced-remux ref | 🔴 (Fail) · forced-remux ref | 🟢 (Pass) · 9.1% CPU | 🟢 (Pass) · CPU withheld | 🔴 (Fail) | 🟡 Screened* · 44.6% CPU | 🟢 (Pass) · 10.7% CPU |
| HEVC Main 10 + E-AC-3 / MKV (HDR10) | 🔴 (Fail) | 🟡 (Screened)\* · 19.7% CPU · native-transcode | 🟡 Screened* · 20.6% CPU · forced-remux ref | 🟡 Screened* · 20.3% CPU · forced-remux ref | 🟡 Screened* · 35.7% CPU | 🔴 (Fail) | 🟡 Screened* · 35.0% CPU | 🟡 Screened* · 41.4% CPU | 🔴 (Fail) |
| HEVC Main 10 + AAC / MP4 (HLG) | 🟡 Screened* · 18.1% CPU | 🟡 (Screened)\* · 16.8% CPU · native-direct | 🟡 Screened* · 18.8% CPU · forced-remux ref | 🟡 Screened* · 20.6% CPU · forced-remux ref | 🟡 Screened* · 35.5% CPU | 🔴 (Fail) | 🟡 Screened* · 36.0% CPU | 🟡 Screened* · 41.0% CPU | 🟡 Screened* · 26.0% CPU |
| AV1 10-bit + Opus / WebM (HDR10) | 🟡 Screened* · 17.0% CPU | 🟡 (Screened)\* · 18.9% CPU · native-direct | 🟡 Screened* · 19.3% CPU · forced-remux ref | 🟡 Screened* · 18.4% CPU · forced-remux ref | 🟡 Screened* · 37.3% CPU | 🔴 (Fail) | 🟡 Screened* · 37.6% CPU | 🟡 Screened* · 35.3% CPU | 🟡 Screened* · 23.8% CPU |
| HEVC + TrueHD 7.1 / MKV | 🔴 (Fail) | 🟡 Screened* · CPU withheld | 🟡 Screened* · 23.7% CPU · forced-remux ref | 🟡 Screened* · 23.4% CPU · forced-remux ref | 🟡 Screened* · 39.6% CPU | 🔴 (Fail) | 🔴 (Fail) | 🔴 (Fail) | 🔴 (Fail) |
| HEVC + DTS-HD MA 7.1 / MKV | 🔴 (Fail) | 🟡 Screened* · CPU pending | 🟡 Screened* · CPU pending · forced-remux ref | 🟡 Screened* · CPU pending · forced-remux ref | 🟡 Screened* · CPU pending | 🔴 (Fail) | 🟡 Screened* · CPU pending | 🟡 Screened* · CPU pending | 🔴 (Fail) |
| HEVC + E-AC-3 with Atmos metadata / MP4 | 🔴 (Fail) | 🟡 Screened* · CPU pending | 🟡 Screened* · CPU pending · forced-remux ref | 🟡 Screened* · CPU pending · forced-remux ref | 🟡 Screened* · CPU pending | 🔴 (Fail) | 🔴 (Fail) | 🔴 (Fail) | 🔴 (Fail) |
| Dolby Vision profile 5 HEVC + E-AC-3 / MP4 | 🔴 (Fail) | 🟡 Screened* · CPU pending | 🔴 (Fail) · forced-remux ref | 🔴 (Fail) · forced-remux ref | 🟡 Screened* · CPU pending | 🔴 (Fail) | 🟡 Screened* · CPU pending | 🔴 (Fail) | 🔴 (Fail) |
| Dolby Vision profile 8.1 HEVC + E-AC-3 / MKV | 🔴 (Fail) | 🟡 Screened* · CPU pending | 🔴 (Fail) · forced-remux ref | 🔴 (Fail) · forced-remux ref | 🟡 Screened* · CPU pending | 🔴 (Fail) | 🟡 Screened* · CPU pending | 🔴 (Fail) | 🔴 (Fail) |
| H.264 + AAC / HLS VOD (TS segments) | 🟢 (Pass) | 🟢 (Pass) · 15.0% CPU · native-direct | N/A · file runtime | N/A · file runtime | 🟢 (Pass) · CPU pending | 🟢 (Pass) | 🟢 (Pass) | N/A · File example | 🟢 (Pass) · CPU pending |
| H.264 + AAC / HLS VOD (fMP4 segments) | 🟢 (Pass) | 🟢 (Pass) · 15.6% CPU · native-direct | N/A · file runtime | N/A · file runtime | 🟢 (Pass) · CPU pending | 🟢 (Pass) | 🟢 (Pass) | N/A · File example | 🟢 (Pass) · CPU pending |
| HEVC + AAC / HLS VOD (fMP4 segments) | 🟢 (Pass) | 🟢 (Pass) · 14.9% CPU · native-direct | N/A · file runtime | N/A · file runtime | 🟢 (Pass) · CPU pending | 🟢 (Pass) | 🟢 (Pass) | N/A · File example | 🔴 (Fail) |
| H.264 + AAC / DASH VOD (fMP4 segments) | 🔴 (Fail) | 🟢 (Pass) · 17.9% CPU · shaka-mse | N/A · file runtime | N/A · file runtime | 🟢 (Pass) · CPU pending | 🟢 (Pass) | 🟢 (Pass) | N/A · File example | 🟢 (Pass) · CPU pending |
| AV1 + Opus / DASH VOD (WebM segments) | 🔴 (Fail) | 🟢 (Pass) · 17.7% CPU · shaka-mse | N/A · file runtime | N/A · file runtime | 🟢 (Pass) · CPU pending | 🟢 (Pass) | 🔴 (Fail) | N/A · File example | 🔴 (Fail) |
| H.264 + AAC / HLS live (sliding window) | 🔴 (Fail) | 🟢 (Pass) · 18.9% CPU · shaka-mse | N/A · file runtime | N/A · file runtime | 🟢 (Pass) · CPU pending | 🟢 (Pass) | 🔴 (Fail) | N/A · File example | 🟢 (Pass) · CPU pending |
| HEVC Main 10 + AAC / MKV | 🟢 (Pass)\* | 🟡 Screened* · CPU pending | 🟡 Screened* · CPU pending · forced-remux ref | 🟡 Screened* · CPU pending · forced-remux ref | 🟡 Screened* · CPU pending | 🟢 (Pass)\* | 🟢 (Pass)\* | 🟡 Screened* · CPU pending | 🟡 Screened* · CPU pending |
| HEVC Main 10 + FLAC / MKV | 🟢 (Pass)\* | 🟡 Screened* · CPU pending | 🟡 Screened* · CPU pending · forced-remux ref | 🟡 Screened* · CPU pending · forced-remux ref | 🟡 Screened* · CPU pending | 🔴 (Fail) | 🟢 (Pass)\* | 🟡 Screened* · CPU pending | 🟡 Screened* · CPU pending |
| HEVC Main 10 + Opus / MKV | 🟢 (Pass)\* | 🟡 Screened* · CPU pending | 🟡 Screened* · CPU pending · forced-remux ref | 🟡 Screened* · CPU pending · forced-remux ref | 🟡 Screened* · CPU pending | 🔴 (Fail) | 🟡 (Screened)\* | 🟡 Screened* · CPU pending | 🟡 Screened* · CPU pending |
| HEVC Main 10 + FLAC + ASS / MKV | 🔴 (Fail) | 🟡 Screened* · CPU pending | 🟡 Screened* · CPU pending · forced-remux ref | 🟡 Screened* · CPU pending · forced-remux ref | 🟡 Screened* · CPU pending | 🔴 (Fail) | 🔴 (Fail) | 🔴 (Fail) | 🔴 (Fail) |
| HEVC Main 10 + Opus + ASS / MKV | 🔴 (Fail) | 🟡 Screened* · CPU pending | 🟡 Screened* · CPU pending · forced-remux ref | 🟡 Screened* · CPU pending · forced-remux ref | 🟡 Screened* · CPU pending | 🔴 (Fail) | 🔴 (Fail) | 🔴 (Fail) | 🔴 (Fail) |
| HEVC Main 10 HDR10 + TrueHD 7.1 + PGS / MKV | 🔴 (Fail) | 🟡 Screened* · CPU pending | 🟡 Screened* · CPU pending · forced-remux ref | 🟡 Screened* · CPU pending · forced-remux ref | 🟡 Screened* · CPU pending | 🔴 (Fail) | 🔴 (Fail) | 🔴 (Fail) | 🔴 (Fail) |
| HEVC Main 10 HDR10 + DTS-HD MA 7.1 + PGS / MKV | 🔴 (Fail) | 🟡 Screened* · CPU pending | 🟡 Screened* · CPU pending · forced-remux ref | 🟡 Screened* · CPU pending · forced-remux ref | 🟡 Screened* · CPU pending | 🔴 (Fail) | 🔴 (Fail) | 🔴 (Fail) | 🔴 (Fail) |
| Dolby Vision profile 5 + E-AC-3/Atmos + ASS / MKV | 🔴 (Fail) | 🟡 Screened* · CPU pending | 🔴 (Fail) · forced-remux ref | 🔴 (Fail) · forced-remux ref | 🟡 Screened* · CPU pending | 🔴 (Fail) | 🔴 (Fail) | 🔴 (Fail) | 🔴 (Fail) |
| Dolby Vision profile 8.1 + E-AC-3/Atmos + ASS / MKV | 🔴 (Fail) | 🟡 Screened* · CPU pending | 🔴 (Fail) · forced-remux ref | 🔴 (Fail) · forced-remux ref | 🟡 Screened* · CPU pending | 🔴 (Fail) | 🔴 (Fail) | 🔴 (Fail) | 🔴 (Fail) |

[Complete-file catalogue](docs/HEAD-TO-HEAD-CATALOGUE.md) ·
[Row refresh index](docs/CPU-ROW-REFRESH.md) ·
[Measurement protocol](docs/BENCHMARK-PROTOCOL.md) ·
[Historical CPU snapshot](docs/HEAD-TO-HEAD-CPU-HISTORICAL-20260925.md)

<a id="private-mpv-player-campaign"></a>

The separate [private mpv Player campaign](docs/MEDIA-COMPARISON-EVIDENCE.md#private-mpv-player-campaign)
covers non-isolated embedded ASS and PCM16 services with its own fixtures and
matched controls.

## Documentation

| Topic | Guides |
| --- | --- |
| Integration | [Public API](docs/PUBLIC-API.md), [player component](docs/PLAYER-COMPONENT.md), [migration](docs/API-MIGRATION.md) |
| Codec packages | [Production codec contracts and evidence](docs/CODEC-SPLIT-PRODUCTION.md), [provider distribution](docs/PROVIDER-DISTRIBUTION-DRAFT.md) |
| Provider bundles | [Provider selection, separate assets and embedded JS](docs/BUNDLING.md) |
| Deployment | [Runtime assets](docs/RUNTIME-ASSETS.md), [runtime selection](docs/REMUX-RUNTIME.md), [engine-free core package](packages/core/README.md) |
| Playback | [Capabilities](docs/CAPABILITIES.md), [route policy](docs/PLAYBACK-TIER-POLICY.md), [production pipeline](docs/PRODUCTION-PIPELINE.md), [streaming](docs/STREAMING.md) |
| Advanced options | [Audio transcoding and precision](docs/AUDIO-TRANSCODING.md), [decode quality](docs/DECODE-QUALITY-POLICY.md), [Software presentation](docs/SOFTWARE-YUV-PRESENTER.md), [fast inspection](docs/FAST-PROBE.md), [previews](docs/PREVIEWS.md) |
| Evidence | [Comparison guide](docs/MEDIA-COMPARISON-EVIDENCE.md), [rerun guide](docs/HEAD-TO-HEAD.md), [research index](research/README.md), [research process](research/PROCESS.md) |

## Development

From the source checkout, install dependencies with `npm ci` and build the
engines using the [release recipe](docs/RELEASE.md). Then run:

```sh
npm run build
npm run dev
```

Open http://127.0.0.1:4179/. Source and issues are at
[Jagalite/demuxe](https://github.com/Jagalite/demuxe).

The repository root is `private: true`. `scripts/package-beta.py` assembles the
installable package; release qualification applies to the exact verified archive.
See the [release procedure](docs/RELEASE.md) for packaging and publication gates.

## Licensing

Original Demuxe application, runtime, router, API and UI code is **Apache-2.0**.
Bundled modified mpv and FFmpeg engines in the next qualified build are
**LGPL-2.1-or-later**, with separate upstream notices and relinking materials.
Original reports and result data are **CC BY 4.0**; other dependencies retain
their own terms. Previously published GPL releases and binaries retain their
original grants.

Preserve the licenses, dependency notices and matching source companion when
distributing the runtime. See [license boundaries](LICENSING.md),
[distribution requirements](docs/LICENSING.md) and [LGPL relinking](docs/LGPL-RELINK.md).
