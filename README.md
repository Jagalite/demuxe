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

[Quick start](#quick-start) · [Custom UI](#build-your-own-ui) ·
[Deployment](#deployment-and-compatibility) · [Media comparison](#media-comparison) ·
[Documentation](#documentation)

## Quick start

The [asset integration guide](docs/RUNTIME-ASSETS.md) documents installation
from a locally assembled candidate. Build and verify an archive using the
[release recipe](docs/RELEASE.md), then install it in your application:

```sh
# Replace this path with your verified candidate archive.
npm install /absolute/path/to/demuxe-0.3.0-beta.4.tgz
npx demuxe copy-assets public/assets/demuxe
```

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

**Cross-origin isolation enables Hybrid, Software and pthread Wasm services.**
Serve the application with these headers, or an equivalent configuration that
makes `crossOriginIsolated` true:

```http
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

Browser-native and Shaka/MSE playback do not require isolation. With the matching
private runtime assets, `remuxRuntime: 'auto'` selects pthread when isolated,
otherwise JSPI when supported or Asyncify. Qualified non-isolated paths cover
file remuxing, FLAC24 audio transcoding, embedded subtitles and restricted
48 kHz stereo PCM16 audio. Hybrid and Software still require isolation. See
[runtime selection and qualification](docs/REMUX-RUNTIME.md) for exact limits;
these current-main paths require a matching verified build.

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
N/A means no demonstrated playback result for the stated scope.

| Media format | Native video | Demuxe (auto) | Demuxe JSPI | Demuxe Asyncify | Demuxe (software decode) | Movi 0.4.0 (default) | AVPlayer 1.3.1 (default) | MediaBunny (player example) | Video.js 8.24.1 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| H.264 + AAC / MP4 | 🟢 (Pass) · 11.7% CPU | 🟢 (Pass) · 13.0% CPU · native-direct | 🟢 (Pass) · 17.1% CPU · forced-remux ref | 🟢 (Pass) · 17.0% CPU · forced-remux ref | 🟢 (Pass) · 32.0% CPU | 🔴 (Fail) | 🟢 (Pass) · 32.4% CPU | 🟡 Screened · 34.6% CPU | 🟢 (Pass) · 24.0% CPU |
| H.264 + AAC / MKV | 🟢 (Pass) · 9.3% CPU | 🟢 (Pass) · 9.6% CPU · native-direct | 🟢 (Pass) · 16.5% CPU · forced-remux ref | 🟢 (Pass) · 17.1% CPU · forced-remux ref | 🟢 (Pass) · 27.4% CPU | 🔴 (Fail) | 🟢 (Pass) · 28.3% CPU | 🟡 Screened · 33.8% CPU | 🟢 (Pass) · 21.7% CPU |
| Dual-audio H.264 + AAC + AC-3 stereo / MKV | 🟢 (Pass) · 13.9% CPU · default AAC | 🟢 (Pass) · 14.0% CPU · native-direct; AC-3 switch: native-transcode (18.1% selected) | 🟢 (Pass) · 17.8% CPU · forced-remux ref | 🟢 (Pass) · 17.2% CPU · forced-remux ref | 🟢 (Pass) · 36.3% CPU | 🔴 (Fail) | 🟢 (Pass) · 32.8% CPU | 🟡 Screened · 35.3% CPU · primary track | 🟢 (Pass) · 23.5% CPU · default track |
| H.264 + PCM24 / MKV | 🟢 (Pass) · 9.6% CPU | 🟢 (Pass) · 14.0% CPU · native-direct | 🟢 (Pass) · 19.4% CPU · forced-remux ref | 🟢 (Pass) · 18.2% CPU · forced-remux ref | 🟢 (Pass) · 26.6% CPU | 🟢 (Pass) · CPU withheld | 🔴 (Fail) | 🟡 Screened · 32.5% CPU | 🟢 (Pass) · 17.2% CPU |
| H.264 + PCM24 / MKV + ASS | 🟢 (Pass) · CPU withheld · host libass | 🟢 (Pass) · 19.8% CPU · native-direct-ass | 🔴 (Fail) · forced-remux ref | 🔴 (Fail) · forced-remux ref | 🟢 (Pass) · 26.6% CPU | 🔴 (Fail) | 🔴 (Fail) | 🔴 (Fail) · external ASS unavailable | 🔴 (Fail) |
| H.264 + AAC 5.1 / MP4 | 🟢 (Pass)\* · 14.8% CPU | 🟢 (Pass)\* · 14.8% CPU · native-direct | 🟡 Screened* · 4.9% CPU · forced-remux ref | 🟡 Screened* · 4.9% CPU · forced-remux ref | 🟢 (Pass)* · 35.1% CPU | 🔴 (Fail) | 🟢 (Pass)\* · 33.4% CPU | 🟡 Screened* · 37.2% CPU | 🟡 Screened* · 6.1% CPU |
| H.264 + MP3 stereo / MP4 | 🟢 (Pass) · 13.3% CPU | 🟢 (Pass) · 14.3% CPU · native-direct | 🟢 (Pass) · 12.0% CPU · forced-remux ref | 🟢 (Pass) · 14.1% CPU · forced-remux ref | 🟢 (Pass) · 33.6% CPU | 🔴 (Fail) | 🟢 (Pass) · 34.2% CPU | 🟡 Screened · 34.7% CPU | 🟢 (Pass) · 9.0% CPU |
| H.264 + AC-3 5.1 / MKV | 🔴 (Fail) | 🟢 (Pass)\* · 17.5% CPU · native-transcode | 🟡 Screened* · 9.1% CPU · forced-remux ref | 🟡 Screened* · 12.5% CPU · forced-remux ref | 🟢 (Pass)* · 36.6% CPU | 🔴 (Fail) | 🟡 Screened* · 21.8% CPU | 🔴 (Fail) | 🔴 (Fail) |
| H.264 + E-AC-3 5.1 / MKV | 🔴 (Fail) | 🟢 (Pass)\* · 19.0% CPU · native-transcode | — Untested | — Untested | 🟢 (Pass)* · 35.8% CPU | 🔴 (Fail) | 🟢 (Pass)\* · 32.8% CPU | 🟡 Screened* · 35.9% CPU | — Untested |
| H.264 + DTS core 5.1 / MKV | 🔴 (Fail) | 🟢 (Pass)\* · 19.2% CPU · native-transcode | — Untested | — Untested | 🟢 (Pass)* · 37.4% CPU | 🔴 (Fail) | 🟢 (Pass)\* · 36.9% CPU | 🟡 Screened* · 38.5% CPU | — Untested |
| H.264 + AC-3 stereo / MKV | 🔴 (Fail) | 🟢 (Pass) · 17.9% CPU · native-transcode | 🟢 (Pass) · 17.8% CPU · native-transcode | 🟢 (Pass) · 18.7% CPU · native-transcode | 🟢 (Pass) · 34.3% CPU | 🔴 (Fail) | 🟢 (Pass) · 32.9% CPU | 🟡 Screened · 33.8% CPU | — Untested |
| H.264 + E-AC-3 stereo / MKV | 🔴 (Fail) | 🟢 (Pass) · 16.5% CPU · native-transcode | — Untested | — Untested | 🟢 (Pass) · 35.4% CPU | 🔴 (Fail) | 🟢 (Pass) · 33.6% CPU | 🟡 Screened · 34.4% CPU | — Untested |
| H.264 + DTS core stereo / MKV | 🔴 (Fail) | 🟢 (Pass) · 18.3% CPU · native-transcode | — Untested | — Untested | 🟢 (Pass) · 34.6% CPU | 🔴 (Fail) | 🟢 (Pass) · 37.8% CPU | 🟡 Screened · 35.5% CPU | — Untested |
| H.264 + FLAC stereo / MKV | 🟢 (Pass) · 13.2% CPU | 🟢 (Pass) · 13.7% CPU · native-direct | — Untested | — Untested | 🟢 (Pass) · 34.7% CPU | 🔴 (Fail) | 🟢 (Pass) · 33.7% CPU | 🟡 Screened · 33.1% CPU | — Untested |
| H.264 + FLAC 5.1 / MKV | 🟢 (Pass)\* · 14.0% CPU | 🟢 (Pass)\* · 14.3% CPU · native-direct | — Untested | — Untested | 🟢 (Pass)* · 35.2% CPU | 🔴 (Fail) | 🟢 (Pass)\* · 33.2% CPU | 🟡 Screened* · 33.7% CPU | — Untested |
| H.264 + Opus stereo / MKV | 🟢 (Pass) · 14.3% CPU | 🟢 (Pass) · 15.1% CPU · native-direct | — Untested | — Untested | 🟢 (Pass) · 35.0% CPU | 🟢 (Pass) · 30.2% CPU | 🟢 (Pass) · 35.3% CPU | 🟡 Screened · 35.2% CPU | — Untested |
| H.264 + PCM16 stereo / MKV | 🟢 (Pass) · 12.9% CPU | 🟢 (Pass) · 14.2% CPU · native-direct | — Untested | — Untested | 🟢 (Pass) · 34.8% CPU | 🟢 (Pass) · 33.2% CPU | 🔴 (Fail) | 🟡 Screened · 32.5% CPU | — Untested |
| H.264 + PCM24 5.1 / MKV | 🟢 (Pass)\* · 13.4% CPU | 🟢 (Pass)\* · 13.9% CPU · native-direct | — Untested | — Untested | 🟢 (Pass)* · 34.8% CPU | 🟢 (Pass)\* · 26.1% CPU | 🔴 (Fail) | 🟡 Screened* · 34.5% CPU | — Untested |
| HEVC Main 8-bit + AAC / MP4 (hvc1) | 🟢 (Pass) · 14.8% CPU | 🟢 (Pass) · 15.8% CPU · native-direct | — Untested | — Untested | 🟢 (Pass) · 35.1% CPU | 🔴 (Fail) | 🟢 (Pass) · 33.1% CPU | 🟡 Screened · 41.1% CPU | — Untested |
| HEVC Main 8-bit + AAC / MP4 (hev1) | 🟢 (Pass) · 14.7% CPU | 🟢 (Pass) · 15.1% CPU · native-direct | — Untested | — Untested | 🟢 (Pass) · 35.6% CPU | 🔴 (Fail) | 🟢 (Pass) · 34.4% CPU | 🟡 Screened · 41.6% CPU | — Untested |
| HEVC Main 10-bit SDR + AAC / MP4 | 🟢 (Pass) · 18.4% CPU | 🟢 (Pass) · 18.5% CPU · native-direct | — Untested | — Untested | 🟢 (Pass) · 37.2% CPU | 🔴 (Fail) | 🟢 (Pass) · 37.4% CPU | 🟡 Screened · 41.1% CPU | — Untested |
| HEVC Main 10 4:2:2 + AAC / MKV | 🟢 (Pass)\* · 17.8% CPU | 🟢 (Pass)\* · 18.6% CPU · native-direct | — Untested | — Untested | 🟢 (Pass)* · 37.2% CPU | 🟢 (Pass)* | 🟢 (Pass)* · 37.6% CPU | 🟡 Screened* · 41.4% CPU | — Untested |
| HEVC Main 10-bit SDR + AC-3 / MKV | 🔴 (Fail) | 🟢 (Pass) · 21.0% CPU · native-transcode | 🟢 (Pass) · CPU withheld: cadence/variance | 🟢 (Pass) · CPU withheld: cadence/variance | 🟢 (Pass) · 35.8% CPU | 🔴 (Fail) | 🟢 (Pass) · 36.8% CPU | 🟡 Screened · 40.6% CPU | — Untested |
| HEVC Main 10-bit SDR + E-AC-3 / MKV | 🔴 (Fail) | 🟢 (Pass) · 21.5% CPU · native-transcode | — Untested | — Untested | 🟢 (Pass) · 35.9% CPU | 🔴 (Fail) | 🟢 (Pass) · 36.9% CPU | 🟡 Screened · 42.0% CPU | — Untested |
| HEVC Main 10-bit SDR + DTS core / MKV | 🔴 (Fail) | 🟢 (Pass) · 21.6% CPU · native-transcode | — Untested | — Untested | 🟢 (Pass) | 🔴 (Fail) | 🟢 (Pass) | 🟡 Screened | — Untested |
| AV1 8-bit + AAC / MP4 | 🟢 (Pass) · 13.6% CPU | 🟢 (Pass) · 14.2% CPU · native-direct | — Untested | — Untested | 🟢 (Pass) · 36.7% CPU | 🔴 (Fail) | 🟢 (Pass) · 37.2% CPU | 🟡 Screened · 33.5% CPU | — Untested |
| AV1 10-bit SDR + Opus / MKV | 🟢 (Pass) · 18.0% CPU | 🟢 (Pass) · 17.8% CPU · native-direct | — Untested | — Untested | 🟢 (Pass) · 37.1% CPU | 🔴 (Fail) | 🟢 (Pass) · 38.5% CPU | 🟡 Screened · 36.3% CPU | — Untested |
| AV1 + Opus / WebM | 🟢 (Pass) · 14.6% CPU | 🟢 (Pass) · 15.3% CPU · native-direct | — Untested | — Untested | 🟢 (Pass) · 36.2% CPU | 🔴 (Fail) | 🟢 (Pass) · 38.3% CPU | 🟡 Screened · 34.9% CPU | — Untested |
| VP9 8-bit + Opus / WebM | 🟢 (Pass) · 14.0% CPU | 🟢 (Pass) · 14.1% CPU · native-direct | — Untested | — Untested | 🟢 (Pass) · 36.6% CPU | 🔴 (Fail) | 🟢 (Pass) · 34.9% CPU | 🟡 Screened · 34.2% CPU | — Untested |
| VP9 10-bit SDR + Opus / WebM | 🟢 (Pass) · 16.6% CPU | 🟢 (Pass) · 17.1% CPU · native-direct | — Untested | — Untested | 🟢 (Pass) · 36.4% CPU | 🔴 (Fail) | 🔴 (Fail) | 🟡 Screened · 34.7% CPU | — Untested |
| VP8 + Vorbis / WebM | 🟢 (Pass) · 13.4% CPU | 🟢 (Pass) · 14.7% CPU · native-direct | — Untested | — Untested | 🟢 (Pass) · 34.8% CPU | 🔴 (Fail) | 🟢 (Pass) · 35.6% CPU | 🟡 Screened · 32.8% CPU | — Untested |
| H.264 + AAC / MPEG-TS | 🔴 (Fail) | 🟢 (Pass) · 18.7% CPU · native-remux | 🟢 (Pass) · 17.9% CPU · native-remux | 🟢 (Pass) · 18.7% CPU · native-remux | 🟢 (Pass) · 36.8% CPU | 🔴 (Fail) | 🟢 (Pass) · 35.4% CPU | 🟡 Screened · 34.6% CPU | — Untested |
| MPEG-2 video + AC-3 / MPEG-TS | 🔴 (Fail) | 🟢 (Pass) · 33.7% CPU · software | — Untested | — Untested | 🟢 (Pass) · 33.9% CPU | 🟢 (Pass) · 30.1% CPU | 🟢 (Pass) · 34.7% CPU | 🔴 (Fail) | — Untested |
| Interlaced MPEG-2 + AC-3 stereo / MPEG-TS | 🔴 (Fail) | 🟢 (Pass)\* · 33.1% CPU · software · visible combing | — Untested | — Untested | 🟢 (Pass)* · 33.7% CPU | 🔴 (Fail) | 🟢 (Pass)\* · 33.6% CPU | 🔴 (Fail) | — Untested |
| MPEG-2 video + MP2 / MPEG-PS | 🔴 (Fail) | 🟢 (Pass)\* · 33.9% CPU · software | — Untested | — Untested | 🟢 (Pass) · 34.1% CPU | 🔴 (Fail) | 🔴 (Fail) | 🔴 (Fail) | — Untested |
| MPEG-4 Part 2 + MP3 / AVI | 🔴 (Fail) | 🟢 (Pass)\* · 33.7% CPU · software | — Untested | — Untested | 🟢 (Pass) · 34.5% CPU | 🔴 (Fail) | 🔴 (Fail) | 🔴 (Fail) | — Untested |
| ProRes + PCM / MOV | 🔴 (Fail) | 🟢 (Pass)\* · 36.9% CPU · software | — Untested | — Untested | 🟢 (Pass) · 36.4% CPU | 🔴 (Fail) | 🔴 (Fail) | 🟡 Screened* · 33.0% CPU | — Untested |
| H.264 + AAC / fragmented MP4 (single file) | 🟢 (Pass) · 13.6% CPU | 🟢 (Pass) · 14.0% CPU · native-direct | — Untested | — Untested | 🟢 (Pass) · 35.1% CPU | 🔴 (Fail) | 🔴 (Fail) | 🟡 Screened · 33.1% CPU | — Untested |
| H.264 video-only / MP4 | 🟢 (Pass) · 11.5% CPU | 🟢 (Pass) · 12.1% CPU · native-direct | — Untested | — Untested | 🟢 (Pass) · 31.9% CPU | 🟢 (Pass) · 32.1% CPU | 🟢 (Pass) · 25.5% CPU | 🟡 Screened · 31.8% CPU | — Untested |
| H.264 High 10 + AAC / MKV | 🟢 (Pass)\* · 17.4% CPU | 🟢 (Pass)\* · 17.6% CPU · native-direct | — Untested | — Untested | 🟢 (Pass)* · 36.3% CPU | 🔴 (Fail) | 🟢 (Pass)* · 35.4% CPU | 🟡 Screened* · 33.3% CPU | — Untested |
| MPEG-2 video-only / MPEG-TS | 🔴 (Fail) | 🟢 (Pass) · 31.6% CPU · software | — Untested | — Untested | 🟢 (Pass) · 31.2% CPU | 🟢 (Pass) · 30.6% CPU | 🟢 (Pass) · 25.7% CPU | 🔴 (Fail) | — Untested |
| H.264 + AAC + embedded SRT / MKV | 🔴 (Fail) | 🟢 (Pass) · 18.7% CPU · native-remux-mpv | — Untested | — Untested | 🟢 (Pass) · 37.2% CPU | 🔴 (Fail) | 🔴 (Fail) | 🔴 (Fail) | — Untested |
| H.264 + AAC + external WebVTT / MP4 | 🟢 (Pass) · 13.7% CPU | 🟢 (Pass) · 14.3% CPU · native-direct | — Untested | — Untested | 🟢 (Pass) · 35.8% CPU | 🔴 (Fail) | 🔴 (Fail) | 🔴 (Fail) | — Untested |
| H.264 + AAC + embedded mov_text / MP4 | 🔴 (Fail) | 🟢 (Pass) · 18.3% CPU · native-remux-mpv | — Untested | — Untested | 🟢 (Pass) · 35.5% CPU | 🔴 (Fail) | 🔴 (Fail) | 🔴 (Fail) | — Untested |
| H.264 + AAC + styled ASS / MKV | 🔴 (Fail) | 🟢 (Pass) · 18.1% CPU · native-remux-mpv | — Untested | — Untested | 🟢 (Pass) · 35.9% CPU | 🔴 (Fail) | 🔴 (Fail) | 🔴 (Fail) | — Untested |
| H.264 + AC-3 stereo + ASS / MKV | 🔴 (Fail) | 🟢 (Pass) · 19.7% CPU · native-transcode-mpv | — Untested | — Untested | 🟢 (Pass) · 35.3% CPU | 🔴 (Fail) | 🔴 (Fail) | 🔴 (Fail) | — Untested |
| HEVC + AC-3 + PGS / MKV | 🔴 (Fail) | 🟢 (Pass)\* · 21.2% CPU · native-transcode-mpv | — Untested | — Untested | 🟢 (Pass) · 36.4% CPU | 🔴 (Fail) | 🔴 (Fail) | 🔴 (Fail) | — Untested |
| H.264 + AC-3 + VobSub / MKV | 🔴 (Fail) | 🟢 (Pass)\* · 18.6% CPU · native-transcode-mpv | — Untested | — Untested | 🟢 (Pass) · 35.2% CPU | 🔴 (Fail) | 🔴 (Fail) | 🔴 (Fail) | — Untested |
| H.264 + AAC + PGS / MKV (subtitle isolation) | 🔴 (Fail) | 🟢 (Pass) · 18.5% CPU · native-remux-mpv | — Untested | — Untested | 🟢 (Pass) · 36.0% CPU | 🔴 (Fail) | 🔴 (Fail) | 🔴 (Fail) | — Untested |
| H.264 + AAC + VobSub / MKV (subtitle isolation) | 🔴 (Fail) | 🟢 (Pass) · 18.6% CPU · native-remux-mpv | — Untested | — Untested | 🟢 (Pass)* · 35.9% CPU | 🔴 (Fail) | 🔴 (Fail) | 🔴 (Fail) | — Untested |
| AAC audio-only / M4A | 🟢 (Pass) · 2.4% CPU | 🟢 (Pass) · 3.2% CPU · native-direct | — Untested | — Untested | 🟢 (Pass) · 10.6% CPU | 🟢 (Pass) | 🟢 (Pass) · 9.9% CPU | 🟡 Screened · 45.4% CPU | — Untested |
| MP3 audio-only / MP3 | 🟢 (Pass) · 0.9% CPU | 🟢 (Pass) · 1.3% CPU · native-direct | — Untested | — Untested | 🟢 (Pass) · 2.8% CPU | 🟢 (Pass) | 🔴 (Fail) | 🟡 Screened · 10.1% CPU | — Untested |
| FLAC audio-only / FLAC | 🟢 (Pass) · 2.1% CPU | 🟢 (Pass) · 3.0% CPU · native-direct | — Untested | — Untested | 🟢 (Pass) · 10.4% CPU | 🟢 (Pass) | 🟢 (Pass) · 8.0% CPU | 🟡 Screened · 42.9% CPU | — Untested |
| Opus audio-only / Ogg | 🟢 (Pass) · 3.4% CPU | 🟢 (Pass) · 4.2% CPU · native-direct | — Untested | — Untested | 🟢 (Pass) · 11.7% CPU | 🟢 (Pass) | 🔴 (Fail) | 🟡 Screened · 45.8% CPU | — Untested |
| Vorbis audio-only / Ogg | 🟢 (Pass) | 🟢 (Pass) · 3.3% CPU · native-direct | — Untested | — Untested | 🟢 (Pass) | 🔴 (Fail) | 🔴 (Fail) | 🟡 Screened | — Untested |
| PCM16 audio-only / WAV | 🟠 | 🟢 (Pass) · 3.1% CPU · native-direct | — Untested | — Untested | 🟢 | 🟢 (Pass) | 🔴 (Fail) | — | — Untested |
| PCM24 audio-only / WAV | 🟠 | 🟢 (Pass) · 3.4% CPU · native-direct | — Untested | — Untested | 🟢 | 🟢 (Pass) | 🔴 (Fail) | — | — Untested |
| HEVC Main 10 + E-AC-3 / MKV (HDR10) | 🔴 (Fail) | 🟡 (Screened)\* · 19.7% CPU · native-transcode | — Untested | — Untested | 🟢 (Pass)* | 🔴 (Fail) | 🟢 (Pass)\* | — | — Untested |
| HEVC Main 10 + AAC / MP4 (HLG) | 🟢 (Pass)\* | 🟡 (Screened)\* · 16.8% CPU · native-direct | — Untested | — Untested | 🟢 (Pass)* | 🔴 (Fail) | 🟢 (Pass)\* | — | — Untested |
| AV1 10-bit + Opus / WebM (HDR10) | 🟢 (Pass)\* | 🟡 (Screened)\* · 18.9% CPU · native-direct | — Untested | — Untested | 🟢 (Pass)* | 🔴 (Fail) | 🟢 (Pass)\* | — | — Untested |
| HEVC + TrueHD 7.1 / MKV | 🔴 (Fail) | 🟡 (Screened)\* · native-transcode · CPU withheld: frame drops | — Untested | — Untested | 🟢 (Pass)* | 🔴 (Fail) | 🔴 (Fail) | — | — Untested |
| HEVC + DTS-HD MA 7.1 / MKV | 🔴 (Fail) | 🟡 (Screened)\* · native-transcode | — Untested | — Untested | 🟢 (Pass)* | 🔴 (Fail) | 🟡 (Screened)\* | — | — Untested |
| HEVC + E-AC-3 with Atmos metadata / MP4 | 🔴 (Fail) | 🟡 (Screened)\* · native-transcode | — Untested | — Untested | 🟢 (Pass)* | 🔴 (Fail) | 🔴 (Fail) | — | — Untested |
| Dolby Vision profile 5 HEVC + E-AC-3 / MP4 | 🔴 (Fail) | 🟡 (Screened)\* · software | — Untested | — Untested | 🟢 (Pass)* | 🔴 (Fail) | 🔴 (Fail) | — | — Untested |
| Dolby Vision profile 8.1 HEVC + E-AC-3 / MKV | 🔴 (Fail) | 🟡 (Screened)\* · software | — Untested | — Untested | 🟢 (Pass)* | 🔴 (Fail) | 🟡 (Screened)\* | — | — Untested |
| H.264 + AAC / HLS VOD (TS segments) | 🟢 (Pass) | 🟢 (Pass) · 15.0% CPU · native-direct | — Untested | — Untested | 🟢 | 🟢 (Pass) | 🟢 (Pass) | — | — Untested |
| H.264 + AAC / HLS VOD (fMP4 segments) | 🟢 (Pass) | 🟢 (Pass) · 15.6% CPU · native-direct | — Untested | — Untested | 🟢 | 🟢 (Pass) | 🟢 (Pass) | — | — Untested |
| HEVC + AAC / HLS VOD (fMP4 segments) | 🟢 (Pass) | 🟢 (Pass) · 14.9% CPU · native-direct | — Untested | — Untested | 🟢 | 🟢 (Pass) | 🟢 (Pass) | — | — Untested |
| H.264 + AAC / DASH VOD (fMP4 segments) | 🔴 (Fail) | 🟢 (Pass) · 17.9% CPU · shaka-mse | — Untested | — Untested | 🟢 | 🟢 (Pass) | 🟢 (Pass) | — | — Untested |
| AV1 + Opus / DASH VOD (WebM segments) | 🔴 (Fail) | 🟢 (Pass) · 17.7% CPU · shaka-mse | — Untested | — Untested | 🟢 | 🟢 (Pass) | 🔴 (Fail) | — | — Untested |
| H.264 + AAC / HLS live (sliding window) | 🔴 (Fail) | 🟢 (Pass) · 18.9% CPU · shaka-mse | — Untested | — Untested | 🟢 (Pass)* | 🟢 (Pass) | 🔴 (Fail) | — | — Untested |
| HEVC Main 10 + AAC / MKV | 🟢 (Pass)\* | 🟡 (Screened)\* · 19.2% CPU · native-direct | — Untested | — Untested | 🟢 (Pass)* | 🟢 (Pass)\* | 🟢 (Pass)\* | — | — Untested |
| HEVC Main 10 + FLAC / MKV | 🟢 (Pass)\* | 🟡 (Screened)\* · 17.4% CPU · native-direct | — Untested | — Untested | 🟢 (Pass)* | 🔴 (Fail) | 🟢 (Pass)\* | — | — Untested |
| HEVC Main 10 + Opus / MKV | 🟢 (Pass)\* | 🟡 (Screened)\* · 19.8% CPU · native-direct | — Untested | — Untested | 🟢 (Pass)* | 🔴 (Fail) | 🟡 (Screened)\* | — | — Untested |
| HEVC Main 10 + FLAC + ASS / MKV | 🔴 (Fail) | 🟡 (Screened)\* · 22.5% CPU · native-remux-mpv | — Untested | — Untested | 🟢 (Pass)* | 🔴 (Fail) | 🔴 (Fail) | — | — Untested |
| HEVC Main 10 + Opus + ASS / MKV | 🔴 (Fail) | 🟡 (Screened)\* · 23.1% CPU · native-remux-mpv | — Untested | — Untested | 🟢 (Pass)* | 🔴 (Fail) | 🔴 (Fail) | — | — Untested |
| HEVC Main 10 HDR10 + TrueHD 7.1 + PGS / MKV | — Untested | 🟡 (Screened)\* · native-transcode-mpv | — Untested | — Untested | 🟡 (Screened)\* · software | — Untested | — Untested | — Untested | — Untested |
| HEVC Main 10 HDR10 + DTS-HD MA 7.1 + PGS / MKV | — Untested | 🟡 (Screened)\* · native-transcode-mpv | — Untested | — Untested | 🟡 (Screened)\* · software | — Untested | — Untested | — Untested | — Untested |
| Dolby Vision profile 5 + E-AC-3/Atmos + ASS / MKV | — Untested | 🟡 (Screened)\* · software | — Untested | — Untested | 🟡 (Screened)\* · software | — Untested | — Untested | — Untested | — Untested |
| Dolby Vision profile 8.1 + E-AC-3/Atmos + ASS / MKV | — Untested | 🟡 (Screened)\* · software | — Untested | — Untested | 🟡 (Screened)\* · software | — Untested | — Untested | — Untested | — Untested |

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
