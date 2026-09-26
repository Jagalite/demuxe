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
| H.264 + AAC 5.1 / MP4 | 🟢 (Pass)* | 🟢 (Pass)\* | 🟢 (Pass)\* · native-direct | 🔴 (Fail) | 🟢 (Pass)\* | — |
| H.264 + MP3 stereo / MP4 | 🟢 | 🟢 | 🟢 (Pass) · native-direct | 🔴 (Fail) | 🟠 | — |
| H.264 + AC-3 5.1 / MKV | 🟢 (Pass)* | 🔴 (Fail) | 🟢 (Pass)\* · hybrid | 🔴 (Fail) | 🟢 (Pass)* | — |
| H.264 + E-AC-3 5.1 / MKV | 🟢 (Pass)* | 🔴 (Fail) | 🟢 (Pass)\* · hybrid | 🔴 (Fail) | 🟢 (Pass)\* | — |
| H.264 + DTS core 5.1 / MKV | 🟢 (Pass)* | 🔴 (Fail) | 🟢 (Pass)\* · hybrid | 🔴 (Fail) | 🟢 (Pass)\* | — |
| H.264 + AC-3 stereo / MKV | 🟢 (Pass) | 🔴 (Fail) | 🟢 (Pass) · native-video-mpv-audio | 🔴 (Fail) | 🟢 (Pass) | — |
| H.264 + E-AC-3 stereo / MKV | 🟢 (Pass) | 🔴 (Fail) | 🟢 (Pass) · hybrid | 🔴 (Fail) | 🟢 (Pass) | — |
| H.264 + DTS core stereo / MKV | 🟢 (Pass) | 🔴 (Fail) | 🟢 (Pass) · native-video-mpv-audio | 🔴 (Fail) | 🟢 (Pass) | — |
| H.264 + FLAC stereo / MKV | 🟢 | 🟢 | 🟢 (Pass) · native-direct | 🔴 (Fail) | 🟠 | — |
| H.264 + FLAC 5.1 / MKV | 🟢 (Pass)* | 🟢 (Pass)\* | 🟢 (Pass)\* · native-direct | 🔴 (Fail) | 🟢 (Pass)\* | — |
| H.264 + Opus stereo / MKV | 🟢 | 🟠 | 🟢 (Pass) · native-direct | 🟢 (Pass) | 🟠 | — |
| H.264 + PCM16 stereo / MKV | 🟢 | 🟠 | 🟢 (Pass) · hybrid | 🔴 (Fail) | 🔴 (Fail) | — |
| H.264 + PCM24 5.1 / MKV | 🟢 (Pass)* | 🟢 (Pass)\* | 🟢 (Pass)\* · hybrid | 🟢 (Pass)\* | 🔴 (Fail) | — |
| HEVC Main 8-bit + AAC / MP4 (hvc1) | 🟢 | 🟠 | 🟢 (Pass) · native-direct | 🔴 (Fail) | 🟠 | — |
| HEVC Main 8-bit + AAC / MP4 (hev1) | 🟢 | 🟢 (Pass) | 🟢 (Pass) · native-direct | 🔴 (Fail) | 🟠 | — |
| HEVC Main 10-bit SDR + AAC / MP4 | 🟢 | 🟢 (Pass) | 🟢 (Pass) · native-direct | 🔴 (Fail) | 🟠 | — |
| HEVC Main 10 4:2:2 + AAC / MKV | 🟢 (Pass)* | 🟢 (Pass)\* | 🟢 (Pass)\* · native-direct | 🟢 (Pass)* | 🟢 (Pass)* | — |
| HEVC Main 10-bit SDR + AC-3 / MKV | 🟢 | 🔴 (Fail) | 🟢 (Pass) · native-video-mpv-audio | 🔴 (Fail) | 🟠 | — |
| HEVC Main 10-bit SDR + E-AC-3 / MKV | 🟢 | 🔴 (Fail) | 🟢 (Pass) · hybrid | 🔴 (Fail) | 🟠 | — |
| HEVC Main 10-bit SDR + DTS core / MKV | 🟢 | 🔴 (Fail) | 🟢 (Pass) · hybrid | 🔴 (Fail) | 🟠 | — |
| AV1 8-bit + AAC / MP4 | 🟢 | 🟢 | 🟢 (Pass) · native-direct | 🔴 (Fail) | 🟠 | — |
| AV1 10-bit SDR + Opus / MKV | 🟢 | 🟠 | 🟢 (Pass) · native-direct | 🔴 (Fail) | 🟠 | — |
| AV1 + Opus / WebM | 🟢 | 🟠 | 🟢 (Pass) · native-direct | 🔴 (Fail) | 🟠 | — |
| VP9 8-bit + Opus / WebM | 🟢 | 🟠 | 🟢 (Pass) · native-direct | 🔴 (Fail) | 🟠 | — |
| VP9 10-bit SDR + Opus / WebM | 🟢 | 🟠 | 🟢 (Pass) · native-direct | 🔴 (Fail) | 🔴 (Fail) | — |
| VP8 + Vorbis / WebM | 🟢 | 🟢 | 🟢 (Pass) · native-direct | 🔴 (Fail) | 🟠 | — |
| H.264 + AAC / MPEG-TS | 🟢 | 🔴 (Fail) | 🟢 (Pass) · hybrid | 🔴 (Fail) | 🟠 | — |
| MPEG-2 video + AC-3 / MPEG-TS | 🟢 (Pass) | 🔴 (Fail) | 🟢 (Pass) · software | 🟢 (Pass) | 🟢 (Pass) | — |
| Interlaced MPEG-2 + AC-3 stereo / MPEG-TS | 🟢 (Pass)* | 🔴 (Fail) | 🟢 (Pass)\* · software · visible combing | 🔴 (Fail) | 🟢 (Pass)\* | — |
| MPEG-2 video + MP2 / MPEG-PS | 🟢 | 🔴 (Fail) | 🟢 (Pass)\* · software | 🔴 (Fail) | 🔴 (Fail) | — |
| MPEG-4 Part 2 + MP3 / AVI | 🟢 | 🔴 (Fail) | 🟢 (Pass)\* · software | 🔴 (Fail) | 🔴 (Fail) | — |
| ProRes + PCM / MOV | 🟢 | 🔴 (Fail) | 🟢 (Pass)\* · software | 🔴 (Fail) | 🔴 (Fail) | — |
| H.264 + AAC / fragmented MP4 (single file) | 🟢 | 🟠 | 🟢 (Pass) · native-direct | 🔴 (Fail) | 🔴 (Fail) | — |
| H.264 video-only / MP4 | 🟢 | 🟢 | 🟢 (Pass) · native-direct | 🟠 | 🟠 | — |
| H.264 High 10 + AAC / MKV | 🟢 (Pass)* | 🟢 (Pass)\* | 🟢 (Pass)\* · native-direct | 🔴 (Fail) | 🟢 (Pass)* | — |
| MPEG-2 video-only / MPEG-TS | 🟢 (Pass) | 🔴 (Fail) | 🟢 (Pass) · software | 🟢 (Pass) | 🟢 (Pass) | — |
| H.264 + AAC + embedded SRT / MKV | 🟢 | 🔴 (Fail) | 🟢 (Pass) · hybrid | 🔴 (Fail) | 🔴 (Fail) | — |
| H.264 + AAC + external WebVTT / MP4 | 🟢 | 🟠 | 🟢 (Pass) · native-direct | 🔴 (Fail) | 🔴 (Fail) | — |
| H.264 + AAC + embedded mov_text / MP4 | 🟢 | 🔴 (Fail) | 🟢 (Pass) · hybrid | 🔴 (Fail) | 🔴 (Fail) | — |
| H.264 + AAC + styled ASS / MKV | 🟢 | 🔴 (Fail) | 🟢 (Pass) · hybrid | 🔴 (Fail) | 🔴 (Fail) | — |
| H.264 + AC-3 stereo + ASS / MKV | 🟢 (Pass) | 🔴 (Fail) | 🟢 (Pass) · hybrid | 🔴 (Fail) | 🔴 (Fail) | — |
| HEVC + AC-3 + PGS / MKV | 🟢 | 🔴 (Fail) | 🟢 (Pass)\* · hybrid | 🔴 (Fail) | 🔴 (Fail) | — |
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

**MediaBunny column:** The [official player example](https://mediabunny.dev/examples/media-player/) passed bounded marked-video and 440 Hz left / 880 Hz right audio checks on the first four exact local fixtures in Chrome. Pause/resume, seeks to 6, 1, and 10 seconds, and near-EOF settlement passed. 🟡 Screened remains because the example has no 1.25× playback-rate or audio-track-switch control, and cleanup was not independently observed; the dual-audio row covers its default track only. CPU is the median of three accepted headed Chrome whole-process windows (20 seconds each, after five seconds of warmup), expressed as percent of one core. The MediaBunny CPU run used local File inputs and is a separate campaign from the other columns; do not treat their displayed CPU values as matched comparisons. No AC-3 switch or cross-browser CPU test was run. `—` means no player test for that exact row. See the [player qualification and CPU evidence](experiments/mediabunny-investigation/notes/official-player-first-four.md).

The external ASS row played video and audio in the MediaBunny example, but the required subtitle file could not be supplied through its controls. Its failure and the withheld CPU figures for the other players are documented in the [row evidence](experiments/mediabunny-investigation/notes/official-player-row-pcm24-ass-20260925/REPORT.md).

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
