<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Demuxe

Demuxe is a browser media playback runtime that automatically chooses the least
expensive correct playback path: native browser playback, progressive remuxing,
Shaka/MSE adaptive streaming, WebCodecs-assisted hybrid playback, or FFmpeg/mpv
software decoding.

The three public modes are **native**, **hybrid**, and **software**. Remuxing is
part of Native. Shaka is an explicit Native execution backend, not a fourth public
mode. Demuxe owns source classification, plan selection, state and fallback; Shaka
owns HLS/DASH parsing, segment scheduling, ABR, buffering, live/DVR and MSE.
Simple browser-supported HLS VOD can retain Native Direct when its source and
track policies permit it and actual output passes verification. Ordinary files
keep their existing Direct/Remux/Hybrid/Software paths. Qualified local files
with browser-presentable video and selected AC-3 or DTS stereo audio can use
the separate `native-video-mpv-audio` plan: the browser owns video, while mpv
decodes audio into the PCM AudioWorklet. Unsupported combinations retain Hybrid
and Software fallback. Current admission is deliberately narrow; see the
[route policy](docs/PLAYBACK-TIER-POLICY.md#native-video-with-mpv-audio).
Shaka loads only when its plan is needed. See [streaming architecture](docs/STREAMING.md).
The [matched integrated selective-route report](results/selective-production/REPORT.md)
records H.264/AC-3, H.264/DTS and HEVC Main10/AC-3 CPU and lifecycle results.
The [historical comparison table](docs/HEAD-TO-HEAD-CPU-HISTORICAL-20260925.md)
retains the earlier CPU figures and their mixed campaign provenance.

Within Software, the production presenter uses YUV/WebGL2 only for decoded
SDR 8-bit planar YUV420P frames meeting the [exact frame and color admission
contract](docs/SOFTWARE-YUV-PRESENTER.md). Other frames use mpv RGB conversion
and an RGBA WebGL upload; the explicit RGB override uses the legacy 2D canvas
path. Matched paused-frame checks cover the bounded RGB fallback cases.
Diagnostics report the active presenter and any YUV rejection reason. The
`softwarePresenter: 'rgb'` override remains available for comparisons. The
historical CPU columns may predate this presenter change; the [matched
production YUV comparison](results/software-yuv-integration/PRODUCTION-YUV-2026-09-23.md)
is a separate campaign and must not be mixed with older numbers.

Software decode fidelity is controlled by `decodeQuality: 'exact' | 'balanced' |
'performance'` (default `exact`). Balanced admits non-reference deblocking
omission for H.264 and HEVC. Performance additionally omits AV1 film-grain
synthesis when libdav1d is used; unqualified codecs remain exact.
`adaptiveFrameDrop: true` (default `false`) separately permits a
sustained-overload controller to omit non-reference pictures on qualified
MPEG-2, H.264 and HEVC streams. mpv reinitializes the video decoder and seeks
when this mode changes. `player.diagnostics.backend.decodePolicy` reports the
active codec, effective quality, shortcuts, thread count and adaptive state;
`adaptiveReason` reports why the state changed. See
[the focused qualification](docs/DECODE-QUALITY-POLICY.md).

This is a developer beta with representative
Chrome/Firefox evidence, not a promise of universal codec or browser support.

**[Component capability reference](docs/CAPABILITIES.md)** — codecs/profiles,
demuxing, subtitles, pixel formats, HDR, audio output, streaming and playback
features, with route eligibility, fallbacks and qualification limits.

## Install

```sh
npm install demuxe@beta
npx demuxe copy-assets public/assets/demuxe
```

Serve the copied directory at `/assets/demuxe/`, preserving its relative tree.
Hybrid, Software, selective mpv audio, audio adaptation, and the pthread Native remux runtime require cross-origin isolation headers:

```http
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

Browser-native playback remains available without these headers. Advanced pthread Wasm routes require this or another configuration producing `crossOriginIsolated === true`. See [runtime requirements and research disposition](docs/NON-ISOLATED-REMUX.md).

See [production playback paths](docs/PRODUCTION-PIPELINE.md) for worker-owned MSE, selected-track MP4 views, bounded separate-buffer delivery, and their qualification limits.

Native Direct and Shaka/MSE playback do not require Wasm or isolation. Remote sources need
appropriate CORS and range support. See [runtime assets](docs/RUNTIME-ASSETS.md).

## Player runtime

```js
import { Player } from 'demuxe';

const player = new Player(container, { assetBase: '/assets/demuxe/' });
await player.open(source); // File, ArrayBuffer, URL, or supported remote source
await player.play();
// When finished: await player.destroy();
```

Optionally prepare engine assets before the user chooses media:

```js
const player = new Player(container, { prepare: 'all' });
// Or: { prepare: ['inspector', 'software'] }
const report = await player.preparationReady;
// Preparation can also be requested during playback: await player.prepare(['hybrid']);
```

Preparation downloads and compiles the selected Wasm components and loads the
fallback font when Hybrid or Software is selected. It does not open media,
initialize playback engines, create workers, or activate audio. Omit `prepare`
or pass `[]` for lazy loading. Playback shares any in-flight preparation for
its required components, and failed preparation falls back to normal loading; inspect `report.assets` for each asset's status, bytes, and
elapsed milliseconds. `destroy()` aborts preparation and releases cached assets.
The `all` option covers the inspector, Hybrid, and Software; browser-native
playback needs no Wasm preparation. Codec decoders still initialize after opening
media. Preparation can increase initial bandwidth and memory use.

## Ready-made player

```js
import { definePlayerElement } from 'demuxe/player';
definePlayerElement();
```

```html
<demuxe-player controls asset-base="/assets/demuxe/"></demuxe-player>
```

Set `prepare="all"` or `prepare="inspector software"` on the element before it
connects to opt into startup preparation. Its core player exposes
`preparationReady` through `await element.ready`.

The component includes local-file and URL opening, subtitles, playback controls,
keyboard shortcuts, and optional session diagnostics. Local files stay in the
browser. The runtime never uploads them.

See [the public API](docs/PUBLIC-API.md), [component contract](docs/PLAYER-COMPONENT.md),
[migration notes](docs/API-MIGRATION.md), [previews](docs/PREVIEWS.md), and [beta limits](docs/BETA.md).

## Representative head-to-head media evidence (default routes plus forced Software)

These are bounded complete-file playback tests, not an exhaustive compatibility
matrix. See [component capabilities](docs/CAPABILITIES.md) for supported paths and
[the complete-file catalogue](docs/HEAD-TO-HEAD-CATALOGUE.md) for exact evidence.

**CPU figures are being refreshed row by row under the current protocol.**
Unmeasured rows retain the historical bounded playback statuses and route labels.
Previous numbers are preserved in the
[historical CPU snapshot](docs/HEAD-TO-HEAD-CPU-HISTORICAL-20260925.md).
See the [row refresh index](docs/CPU-ROW-REFRESH.md) for completed measurements.
New one-browser-per-row results use three correlated rounds; their ranges and
idle trends are in each row report.

- 🟢 Pass: bounded playback passed. `*` indicates a fidelity, profile or duration limit.
- 🟣 Configured pass: a named alternative passed where the default failed.
- 🟠 Plays: initial playback passed but a later check failed. 🔴 Fail: a playback check failed; this does not establish an unsupported codec.
- 🟡 Screened: a bounded specialist check; its stated fidelity limits remain.
- Blank CPU figures are pending remeasurement. N/A means no demonstrated playback result for this scope.

See the [media comparison evidence guide](docs/MEDIA-COMPARISON-EVIDENCE.md) for
campaign provenance, fixture and route differences, qualification limits, and raw
reports. The [current measurement protocol](docs/BENCHMARK-PROTOCOL.md) governs new runs.

| Media format | Demuxe (software decode) | Native video | Demuxe (auto) | Movi 0.4.0 (default) | AVPlayer 1.3.1 (default) | MediaBunny (player example) |
| --- | --- | --- | --- | --- | --- | --- |
| H.264 + AAC / MP4 | 🟢 (Pass) · 32.0% CPU | 🟢 (Pass) · 11.7% CPU | 🟢 (Pass) · 13.0% CPU · native-direct | 🔴 (Fail) | 🟢 (Pass) · 32.4% CPU | 🟡 Screened · 34.6% CPU |
| H.264 + AAC / MKV | 🟢 (Pass) · 27.4% CPU | 🟢 (Pass) · 9.3% CPU | 🟢 (Pass) · 9.6% CPU · native-direct | 🔴 (Fail) | 🟢 (Pass) · 28.3% CPU | 🟡 Screened · 33.8% CPU |
| Dual-audio H.264 + AAC + AC-3 stereo / MKV | 🟢 (Pass) · 36.3% CPU | 🟢 (Pass) · 13.9% CPU · default AAC | 🟢 (Pass) · 11.3% CPU · native-direct · AC-3 switch: hybrid | 🔴 (Fail) | 🟢 (Pass) · 32.8% CPU | 🟡 Screened · 35.3% CPU · primary track |
| H.264 + PCM24 / MKV | 🟢 (Pass) · 26.6% CPU | 🟢 (Pass) · 9.6% CPU | 🟢 (Pass) · 14.0% CPU · native-direct | 🟢 (Pass) | 🔴 (Fail) | 🟡 Screened · 32.5% CPU |
| H.264 + PCM24 / MKV + ASS | 🟢 | 🟢 | 🟢 (Pass) · hybrid | 🔴 (Fail) | 🔴 (Fail) | 🔴 (Fail) · external ASS unavailable |
| H.264 + AAC 5.1 / MP4 | 🟢 (Pass)* · 35.1% CPU | 🟢 (Pass)\* · 14.8% CPU | 🟢 (Pass)\* · 14.8% CPU · native-direct | 🔴 (Fail) | 🟢 (Pass)\* · 33.4% CPU | 🟡 Screened* · 37.2% CPU |
| H.264 + MP3 stereo / MP4 | 🟢 (Pass) · 33.6% CPU | 🟢 (Pass) · 13.3% CPU | 🟢 (Pass) · 14.3% CPU · native-direct | 🔴 (Fail) | 🟢 (Pass) · 34.2% CPU | 🟡 Screened · 34.7% CPU |
| H.264 + AC-3 5.1 / MKV | 🟢 (Pass)* · 36.6% CPU | 🔴 (Fail) | 🟢 (Pass)\* · 36.6% CPU · hybrid | 🔴 (Fail) | 🟢 (Pass)* | 🟡 Screened* |
| H.264 + E-AC-3 5.1 / MKV | 🟢 (Pass)* · 35.8% CPU | 🔴 (Fail) | 🟢 (Pass)\* · 34.0% CPU · hybrid | 🔴 (Fail) | 🟢 (Pass)\* · 32.8% CPU | 🟡 Screened* · 35.9% CPU |
| H.264 + DTS core 5.1 / MKV | 🟢 (Pass)* · 37.4% CPU | 🔴 (Fail) | 🟢 (Pass)\* · 37.1% CPU · hybrid | 🔴 (Fail) | 🟢 (Pass)\* · 36.9% CPU | 🟡 Screened* · 38.5% CPU |
| H.264 + AC-3 stereo / MKV | 🟢 (Pass) · 34.3% CPU | 🔴 (Fail) | 🟢 (Pass) · 36.5% CPU · hybrid (URL) | 🔴 (Fail) | 🟢 (Pass) · 32.9% CPU | 🟡 Screened · 33.8% CPU |
| H.264 + E-AC-3 stereo / MKV | 🟢 (Pass) · 35.4% CPU | 🔴 (Fail) | 🟢 (Pass) · 35.0% CPU · hybrid | 🔴 (Fail) | 🟢 (Pass) · 33.6% CPU | 🟡 Screened · 34.4% CPU |
| H.264 + DTS core stereo / MKV | 🟢 (Pass) · 34.6% CPU | 🔴 (Fail) | 🟢 (Pass) · 38.2% CPU · hybrid (URL) | 🔴 (Fail) | 🟢 (Pass) · 37.8% CPU | 🟡 Screened · 35.5% CPU |
| H.264 + FLAC stereo / MKV | 🟢 (Pass) · 34.7% CPU | 🟢 (Pass) · 13.2% CPU | 🟢 (Pass) · 13.7% CPU · native-direct | 🔴 (Fail) | 🟢 (Pass) · 33.7% CPU | 🟡 Screened · 33.1% CPU |
| H.264 + FLAC 5.1 / MKV | 🟢 (Pass)* · 35.2% CPU | 🟢 (Pass)\* · 14.0% CPU | 🟢 (Pass)\* · 14.3% CPU · native-direct | 🔴 (Fail) | 🟢 (Pass)\* · 33.2% CPU | 🟡 Screened* · 33.7% CPU |
| H.264 + Opus stereo / MKV | 🟢 (Pass) · 35.0% CPU | 🟢 (Pass) · 14.3% CPU | 🟢 (Pass) · 15.1% CPU · native-direct | 🟢 (Pass) · 30.2% CPU | 🟢 (Pass) · 35.3% CPU | 🟡 Screened · 35.2% CPU |
| H.264 + PCM16 stereo / MKV | 🟢 (Pass) · 34.8% CPU | 🟢 (Pass) · 12.9% CPU | 🟢 (Pass) · 14.2% CPU · native-direct | 🟢 (Pass) · 33.2% CPU | 🔴 (Fail) | 🟡 Screened · 32.5% CPU |
| H.264 + PCM24 5.1 / MKV | 🟢 (Pass)* · 34.8% CPU | 🟢 (Pass)\* · 13.4% CPU | 🟢 (Pass)\* · 13.9% CPU · native-direct | 🟢 (Pass)\* · 26.1% CPU | 🔴 (Fail) | 🟡 Screened* · 34.5% CPU |
| HEVC Main 8-bit + AAC / MP4 (hvc1) | 🟢 (Pass) · 35.1% CPU | 🟢 (Pass) · 14.8% CPU | 🟢 (Pass) · 15.8% CPU · native-direct | 🔴 (Fail) | 🟢 (Pass) · 33.1% CPU | 🟡 Screened · 41.1% CPU |
| HEVC Main 8-bit + AAC / MP4 (hev1) | 🟢 (Pass) · 35.6% CPU | 🟢 (Pass) · 14.7% CPU | 🟢 (Pass) · 15.1% CPU · native-direct | 🔴 (Fail) | 🟢 (Pass) · 34.4% CPU | 🟡 Screened · 41.6% CPU |
| HEVC Main 10-bit SDR + AAC / MP4 | 🟢 (Pass) · 37.2% CPU | 🟢 (Pass) · 18.4% CPU | 🟢 (Pass) · 18.5% CPU · native-direct | 🔴 (Fail) | 🟢 (Pass) · 37.4% CPU | 🟡 Screened · 41.1% CPU |
| HEVC Main 10 4:2:2 + AAC / MKV | 🟢 (Pass)* · 37.2% CPU | 🟢 (Pass)\* · 17.8% CPU | 🟢 (Pass)\* · 18.6% CPU · native-direct | 🟢 (Pass)* | 🟢 (Pass)* · 37.6% CPU | 🟡 Screened* · 41.4% CPU |
| HEVC Main 10-bit SDR + AC-3 / MKV | 🟢 (Pass) · 35.8% CPU | 🔴 (Fail) | 🟢 (Pass) · 39.4% CPU · hybrid (URL) | 🔴 (Fail) | 🟢 (Pass) · 36.8% CPU | 🟡 Screened · 40.6% CPU |
| HEVC Main 10-bit SDR + E-AC-3 / MKV | 🟢 (Pass) · 35.9% CPU | 🔴 (Fail) | 🟢 (Pass) · 40.0% CPU · hybrid | 🔴 (Fail) | 🟢 (Pass) · 36.9% CPU | 🟡 Screened · 42.0% CPU |
| HEVC Main 10-bit SDR + DTS core / MKV | 🟢 (Pass) | 🔴 (Fail) | 🟢 (Pass) · hybrid | 🔴 (Fail) | 🟢 (Pass) | 🟡 Screened |
| AV1 8-bit + AAC / MP4 | 🟢 (Pass) · 36.7% CPU | 🟢 (Pass) · 13.6% CPU | 🟢 (Pass) · 14.2% CPU · native-direct | 🔴 (Fail) | 🟢 (Pass) · 37.2% CPU | 🟡 Screened · 33.5% CPU |
| AV1 10-bit SDR + Opus / MKV | 🟢 (Pass) · 37.1% CPU | 🟢 (Pass) · 18.0% CPU | 🟢 (Pass) · 17.8% CPU · native-direct | 🔴 (Fail) | 🟢 (Pass) · 38.5% CPU | 🟡 Screened · 36.3% CPU |
| AV1 + Opus / WebM | 🟢 (Pass) · 36.2% CPU | 🟢 (Pass) · 14.6% CPU | 🟢 (Pass) · 15.3% CPU · native-direct | 🔴 (Fail) | 🟢 (Pass) · 38.3% CPU | 🟡 Screened · 34.9% CPU |
| VP9 8-bit + Opus / WebM | 🟢 (Pass) · 36.6% CPU | 🟢 (Pass) · 14.0% CPU | 🟢 (Pass) · 14.1% CPU · native-direct | 🔴 (Fail) | 🟢 (Pass) · 34.9% CPU | 🟡 Screened · 34.2% CPU |
| VP9 10-bit SDR + Opus / WebM | 🟢 (Pass) · 36.4% CPU | 🟢 (Pass) · 16.6% CPU | 🟢 (Pass) · 17.1% CPU · native-direct | 🔴 (Fail) | 🔴 (Fail) | 🟡 Screened · 34.7% CPU |
| VP8 + Vorbis / WebM | 🟢 (Pass) · 34.8% CPU | 🟢 (Pass) · 13.4% CPU | 🟢 (Pass) · 14.7% CPU · native-direct | 🔴 (Fail) | 🟢 (Pass) · 35.6% CPU | 🟡 Screened · 32.8% CPU |
| H.264 + AAC / MPEG-TS | 🟢 (Pass) · 36.8% CPU | 🔴 (Fail) | 🟢 (Pass) · 36.5% CPU · hybrid | 🔴 (Fail) | 🟢 (Pass) · 35.4% CPU | 🟡 Screened · 34.6% CPU |
| MPEG-2 video + AC-3 / MPEG-TS | 🟢 (Pass) · 33.9% CPU | 🔴 (Fail) | 🟢 (Pass) · 33.7% CPU · software | 🟢 (Pass) · 30.1% CPU | 🟢 (Pass) · 34.7% CPU | 🔴 (Fail) |
| Interlaced MPEG-2 + AC-3 stereo / MPEG-TS | 🟢 (Pass)* · 33.7% CPU | 🔴 (Fail) | 🟢 (Pass)\* · 33.1% CPU · software · visible combing | 🔴 (Fail) | 🟢 (Pass)\* · 33.6% CPU | 🔴 (Fail) |
| MPEG-2 video + MP2 / MPEG-PS | 🟢 (Pass) · 34.1% CPU | 🔴 (Fail) | 🟢 (Pass)\* · 33.9% CPU · software | 🔴 (Fail) | 🔴 (Fail) | 🔴 (Fail) |
| MPEG-4 Part 2 + MP3 / AVI | 🟢 (Pass) · 34.5% CPU | 🔴 (Fail) | 🟢 (Pass)\* · 33.7% CPU · software | 🔴 (Fail) | 🔴 (Fail) | 🔴 (Fail) |
| ProRes + PCM / MOV | 🟢 (Pass) · 36.4% CPU | 🔴 (Fail) | 🟢 (Pass)\* · 36.9% CPU · software | 🔴 (Fail) | 🔴 (Fail) | 🟡 Screened* · 33.0% CPU |
| H.264 + AAC / fragmented MP4 (single file) | 🟢 (Pass) · 35.1% CPU | 🟢 (Pass) · 13.6% CPU | 🟢 (Pass) · 14.0% CPU · native-direct | 🔴 (Fail) | 🔴 (Fail) | 🟡 Screened · 33.1% CPU |
| H.264 video-only / MP4 | 🟢 (Pass) · 31.9% CPU | 🟢 (Pass) · 11.5% CPU | 🟢 (Pass) · 12.1% CPU · native-direct | 🟢 (Pass) · 32.1% CPU | 🟢 (Pass) · 25.5% CPU | 🟡 Screened · 31.8% CPU |
| H.264 High 10 + AAC / MKV | 🟢 (Pass)* · 36.3% CPU | 🟢 (Pass)\* · 17.4% CPU | 🟢 (Pass)\* · 17.6% CPU · native-direct | 🔴 (Fail) | 🟢 (Pass)* · 35.4% CPU | 🟡 Screened* · 33.3% CPU |
| MPEG-2 video-only / MPEG-TS | 🟢 (Pass) · 31.2% CPU | 🔴 (Fail) | 🟢 (Pass) · 31.6% CPU · software | 🟢 (Pass) · 30.6% CPU | 🟢 (Pass) · 25.7% CPU | 🔴 (Fail) |
| H.264 + AAC + embedded SRT / MKV | 🟢 (Pass) · 37.2% CPU | 🔴 (Fail) | 🟢 (Pass) · 38.7% CPU · hybrid | 🔴 (Fail) | 🔴 (Fail) | 🔴 (Fail) |
| H.264 + AAC + external WebVTT / MP4 | 🟢 (Pass) · 35.8% CPU | 🟢 (Pass) · 13.7% CPU | 🟢 (Pass) · 14.3% CPU · native-direct | 🔴 (Fail) | 🔴 (Fail) | 🔴 (Fail) |
| H.264 + AAC + embedded mov_text / MP4 | 🟢 (Pass) · 35.5% CPU | 🔴 (Fail) | 🟢 (Pass) · 37.5% CPU · hybrid | 🔴 (Fail) | 🔴 (Fail) | 🔴 (Fail) |
| H.264 + AAC + styled ASS / MKV | 🟢 (Pass) · 35.9% CPU | 🔴 (Fail) | 🟢 (Pass) · 36.9% CPU · hybrid | 🔴 (Fail) | 🔴 (Fail) | 🔴 (Fail) |
| H.264 + AC-3 stereo + ASS / MKV | 🟢 (Pass) · 35.3% CPU | 🔴 (Fail) | 🟢 (Pass) · 36.7% CPU · hybrid | 🔴 (Fail) | 🔴 (Fail) | 🔴 (Fail) |
| HEVC + AC-3 + PGS / MKV | 🟢 (Pass) · 36.4% CPU | 🔴 (Fail) | 🟢 (Pass)\* · 40.6% CPU · hybrid | 🔴 (Fail) | 🔴 (Fail) | 🔴 (Fail) |
| H.264 + AC-3 + VobSub / MKV | 🟢 | 🔴 (Fail) | 🟢 (Pass)\* · hybrid | 🔴 (Fail) | 🔴 (Fail) | — |
| H.264 + AAC + PGS / MKV (subtitle isolation) | 🔴 (Fail) | Not tested | 🟢 (Pass) · hybrid | Not tested | Not tested | — |
| H.264 + AAC + VobSub / MKV (subtitle isolation) | 🟢 (Pass)* | Not tested | 🟢 (Pass) · hybrid | Not tested | Not tested | — |
| AAC audio-only / M4A | 🟢 | 🟢 | 🟢 (Pass) · native-direct | 🟢 (Pass) | 🟠 | — |
| MP3 audio-only / MP3 | 🟢 | 🟠 | 🟢 (Pass) · native-direct | 🟢 (Pass) | 🔴 (Fail) | — |
| FLAC audio-only / FLAC | 🟢 | 🟠 | 🟢 (Pass) · native-direct | 🟢 (Pass) | 🟠 | — |
| Opus audio-only / Ogg | 🟢 | 🟢 | 🟢 (Pass) · native-direct | 🟢 (Pass) | 🔴 (Fail) | — |
| Vorbis audio-only / Ogg | 🟢 | 🟢 | 🟢 (Pass) · native-direct | 🔴 (Fail) | 🔴 (Fail) | — |
| PCM16 audio-only / WAV | 🟢 | 🟠 | 🟢 (Pass) · native-direct | 🟢 (Pass) | 🔴 (Fail) | — |
| PCM24 audio-only / WAV | 🟢 | 🟠 | 🟢 (Pass) · native-direct | 🟢 (Pass) | 🔴 (Fail) | — |
| HEVC Main 10 + E-AC-3 / MKV (HDR10) | 🟢 (Pass)* | 🔴 (Fail) | 🟡 (Screened)\* · hybrid | 🔴 (Fail) | 🟢 (Pass)\* | — |
| HEVC Main 10 + AAC / MP4 (HLG) | 🟢 (Pass)* | 🟢 (Pass)\* | 🟡 (Screened)\* · native-direct | 🔴 (Fail) | 🟢 (Pass)\* | — |
| AV1 10-bit + Opus / WebM (HDR10) | 🟢 (Pass)* | 🟢 (Pass)\* | 🟡 (Screened)\* · native-direct | 🔴 (Fail) | 🟢 (Pass)\* | — |
| HEVC + TrueHD 7.1 / MKV | 🟢 (Pass)* | 🔴 (Fail) | 🟡 (Screened)\* · hybrid | 🔴 (Fail) | 🔴 (Fail) | — |
| HEVC + DTS-HD MA 7.1 / MKV | 🟢 (Pass)* | 🔴 (Fail) | 🟡 (Screened)\* · hybrid | 🔴 (Fail) | 🟡 (Screened)\* | — |
| HEVC + E-AC-3 with Atmos metadata / MP4 | 🟢 (Pass)* | 🔴 (Fail) | 🟡 (Screened)\* · hybrid | 🔴 (Fail) | 🔴 (Fail) | — |
| Dolby Vision profile 5 HEVC + E-AC-3 / MP4 | 🟢 (Pass)* | 🔴 (Fail) | 🟡 (Screened)\* · software | 🔴 (Fail) | 🔴 (Fail) | — |
| Dolby Vision profile 8.1 HEVC + E-AC-3 / MKV | 🟢 (Pass)* | 🔴 (Fail) | 🟡 (Screened)\* · software | 🔴 (Fail) | 🟡 (Screened)\* | — |
| H.264 + AAC / HLS VOD (TS segments) | 🟢 | 🟢 (Pass) | 🟢 (Pass)\* · native-direct | 🟢 (Pass) | 🟢 (Pass) | — |
| H.264 + AAC / HLS VOD (fMP4 segments) | 🟢 | 🟢 (Pass) | 🟢 (Pass)\* · native-direct | 🟢 (Pass) | 🟢 (Pass) | — |
| HEVC + AAC / HLS VOD (fMP4 segments) | 🟢 | 🟢 (Pass) | 🟢 (Pass) | 🟢 (Pass) | 🟢 (Pass) | — |
| H.264 + AAC / DASH VOD (fMP4 segments) | 🟢 | 🔴 (Fail) | 🟢 (Pass)\* · shaka-mse | 🟢 (Pass) | 🟢 (Pass) | — |
| AV1 + Opus / DASH VOD (WebM segments) | 🟢 | 🔴 (Fail) | 🟢 (Pass)\* · shaka-mse | 🟢 (Pass) | 🔴 (Fail) | — |
| H.264 + AAC / HLS live (sliding window) | 🟢 (Pass)* | 🔴 (Fail) | 🟢 (Pass) | 🟢 (Pass) | 🔴 (Fail) | — |
| HEVC Main 10 + AAC / MKV | 🟢 (Pass)* | 🟢 (Pass)\* | 🟡 (Screened)\* · native-direct | 🟢 (Pass)\* | 🟢 (Pass)\* | — |
| HEVC Main 10 + FLAC / MKV | 🟢 (Pass)* | 🟢 (Pass)\* | 🟡 (Screened)\* · native-direct | 🔴 (Fail) | 🟢 (Pass)\* | — |
| HEVC Main 10 + Opus / MKV | 🟢 (Pass)* | 🟢 (Pass)\* | 🟡 (Screened)\* · native-direct | 🔴 (Fail) | 🟡 (Screened)\* | — |
| HEVC Main 10 + FLAC + ASS / MKV | 🟢 (Pass)* | 🔴 (Fail) | 🟡 (Screened)\* · hybrid | 🔴 (Fail) | 🔴 (Fail) | — |
| HEVC Main 10 + Opus + ASS / MKV | 🟢 (Pass)* | 🔴 (Fail) | 🟡 (Screened)\* · hybrid | 🔴 (Fail) | 🔴 (Fail) | — |
| HEVC Main 10 HDR10 + TrueHD 7.1 + PGS / MKV | 🟢 (Pass)* | 🔴 (Fail) | 🟡 (Screened)\* · hybrid | 🔴 (Fail) | 🔴 (Fail) | — |
| HEVC Main 10 HDR10 + DTS-HD MA 7.1 + PGS / MKV | 🟢 (Pass)* | 🔴 (Fail) | 🟡 (Screened)\* · hybrid | 🔴 (Fail) | 🔴 (Fail) | — |
| Dolby Vision profile 5 + E-AC-3/Atmos + ASS / MKV | 🟢 (Pass)* | 🔴 (Fail) | 🟡 (Screened)\* · software | 🔴 (Fail) | 🔴 (Fail) | — |
| Dolby Vision profile 8.1 + E-AC-3/Atmos + ASS / MKV | 🟢 (Pass)* | 🔴 (Fail) | 🟡 (Screened)\* · software | 🔴 (Fail) | 🔴 (Fail) | — |

**MediaBunny column:** The [official player example](https://mediabunny.dev/examples/media-player/) is screened on each cited fixture using marked video, stereo audio, pause/resume, seeks and near-EOF settlement. 🟡 Screened remains because its public controls do not qualify 1.25× playback or independent cleanup; the dual-audio row covers the default track only. CPU is the median of three headed Chrome whole-process windows (20 seconds each, after five seconds of warmup), expressed as percent of one core. The [first-four campaign](experiments/mediabunny-investigation/notes/official-player-first-four.md) used a separate browser run from the other columns. Subsequent rows linked in the [CPU refresh index](docs/CPU-ROW-REFRESH.md) use one Chrome launch per row across viable player arms, with fresh contexts and rotating order. MediaBunny receives local File input while maintained players use the frozen local URL, so CPU values do not isolate decoder or demux costs. `—` means no player test for that exact row.

The external ASS row played video and audio in the MediaBunny example, but the required subtitle file could not be supplied through its controls. Its failure and the withheld CPU figures for the other players are documented in the [row evidence](experiments/mediabunny-investigation/notes/official-player-row-pcm24-ass-20260925/REPORT.md).

The [AAC 5.1 row](experiments/mediabunny-investigation/notes/official-player-row-h264-aac51-20260925/REPORT.md) used one headed Chrome launch for all player CPU arms and three rotating rounds. Its `*` means stereo output was screened; six discrete output channels were not verified. Movi's CPU samples are diagnostic because its correctness screen failed.

The [MP3/MP4 row](experiments/mediabunny-investigation/notes/official-player-row-h264-mp3-confirmed-20260925/REPORT.md) also used one Chrome launch across all six CPU arms and three rotating rounds. Its separate Auto follow-up investigated one low matched-run window; all windows are retained in the report. AVPlayer passed the fresh full screen, replacing its earlier partial-playback label.

The [AC-3 5.1 row](experiments/mediabunny-investigation/notes/official-player-row-h264-ac3-confirmed-20260925/REPORT.md) screened stereo output from the six-channel source. AVPlayer and MediaBunny CPU figures are withheld because an independent launch reversed their apparent ranking. Plain video and Movi failed correctness; their CPU samples are diagnostic only.

The [E-AC-3 5.1 row](experiments/mediabunny-investigation/notes/official-player-row-h264-eac3-20260926/REPORT.md) used a refreshed Demuxe snapshot, one Chrome for all six CPU arms and three rotating rounds. Plain video and Movi failed correctness, so their CPU samples remain diagnostic. The four passing/screened players verified stereo output from the six-channel source, not discrete 5.1 fidelity.

The [DTS core 5.1 row](experiments/mediabunny-investigation/notes/official-player-row-h264-dts-20260926/REPORT.md) followed the same one-Chrome-per-row CPU protocol. Plain video failed initial playback and Movi failed the rate check; their CPU samples are diagnostic. The other four arms verified stereo output, with discrete 5.1 still unqualified.

The [AC-3 stereo row](experiments/mediabunny-investigation/notes/official-player-row-h264-ac3-stereo-20260926/REPORT.md) used the same current Demuxe code with a frozen stereo fixture from the earlier catalogue. Auto selected Hybrid on the maintained players' local URL; an earlier local-File selective-audio result is a different input contract. CPU values are from this URL/File comparison campaign only.

The [E-AC-3 stereo row](experiments/mediabunny-investigation/notes/official-player-row-h264-eac3-stereo-20260926/REPORT.md) screened all five maintained players and the official MediaBunny example. Four viable/screened arms received matched CPU windows; plain video and Movi kept their failed cells without diagnostic CPU numbers.

The [DTS core stereo row](experiments/mediabunny-investigation/notes/official-player-row-h264-dts-stereo-20260926/REPORT.md) used the same frozen stereo catalogue. Auto selected Hybrid for the maintained local-URL input; its earlier native-video/mpv-audio label described a local File. Auto's three CPU windows varied enough that their median should not be used as a precise player ranking.

See [versions, evidence, and configured alternatives](docs/HEAD-TO-HEAD-ROUTES.md)
and the [rerun guide](docs/HEAD-TO-HEAD.md).

The SRT, mov_text and ASS Demuxe cells now use automatic browser A/V with the
mpv subtitle-only service on the [exact local fixtures and current-tree
qualification](results/head-to-head/mpv-subtitle-tier-20260923-06/REPORT.md).
Their earlier paired CPU measurements remain in the
[historical CPU snapshot](docs/HEAD-TO-HEAD-CPU-HISTORICAL-20260925.md).
The two H.264/AAC bitmap rows isolate subtitles by copying PGS/VobSub
from the older AC-3 cases onto browser-compatible A/V. The original AC-3
subtitle rows retain Hybrid because subtitle composition is outside selective
admission. Other-player cells on the
older rows retain their separately linked historical results; the new bitmap
derivatives were not run through those players. Earlier Demuxe CPU evidence is in
the [unified subtitle scheduler report](results/subtitle-visual-scheduling/REPORT.md).

The [comparison gap follow-up](docs/COMPARISON-GAP-CLOSEOUT.md) refreshes the seven Dolby Vision/PGS cells above. All four Dolby Vision combinations now pass bounded automatic playback through Software fallback. The three PGS fixtures pass in Hybrid, including subtitle recovery after seeking. These results do not qualify Dolby Vision color, physical HDR, Atmos objects or discrete surround. The [earlier specialist screen](results/head-to-head/specialist-report-01/REPORT.md) retains the historical failures and forced-Software diagnostics.

## Release and licensing

The repository root is intentionally `private: true` and cannot be published to
npm. `scripts/package-beta.py` assembles the publishable package; only the exact
verified release tarball is published, with the `beta` dist-tag. See
[the release procedure](docs/RELEASE.md).

Original Demuxe application, runtime, router, API and UI code in the next
qualified build is **Apache-2.0**. The bundled modified mpv and FFmpeg WASM
media engines are **LGPL-2.1-or-later**, with their upstream file notices and
relinking materials. Other third-party terms remain separate. Original reports
and result data remain **CC BY 4.0**. Previously published GPL Demuxe releases
and binaries retain their original GPL grants. See [the boundary summary](LICENSING.md)
and [LGPL relinking instructions](docs/LGPL-RELINK.md).

`npm run build:core` assembles a separate engine-free `demuxe-core` candidate from
the explicit reusable file list. See [core package usage](packages/core/README.md).

Preserve the license, dependency notices,
and matching source companion when distributing the runtime. See
[licensing](docs/LICENSING.md). Safari/mobile, physical HDR/surround, PiP/casting,
and broad device/performance qualification remain follow-up work.

## Develop

Research is organized by full item identity under [research/](research/README.md).
See the [research process](research/PROCESS.md) for fixture preparation, screening,
correctness, performance, evidence and decision gates.
The [rerunnable player comparison](docs/HEAD-TO-HEAD.md) tests Demuxe, Movi,
libmedia AVPlayer and plain video against an explicit media/feature matrix.

From the source checkout, run `npm ci`, build the engines using
[the release recipe](docs/RELEASE.md), then run `npm run build` and `npm run dev`.
Open http://127.0.0.1:4179/. Maintained source and issues are at
[Jagalite/demuxe](https://github.com/Jagalite/demuxe).

Playback tier promotion, automatic Native + mpv subtitles for the qualified local subset, and bounded background preparation are documented in [Playback tier policy](docs/PLAYBACK-TIER-POLICY.md). The subtitle service remains limited to its tested browser and source profiles.
