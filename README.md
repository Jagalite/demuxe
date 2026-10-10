<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Demuxe - [Live Demo](https://jagalite.github.io/demuxe/)

Browser media playback powered by native decoding and **mpv/FFmpeg in
WebAssembly**, with video, audio and subtitle support behind one API. Use the
built-in player or your own UI for files, URLs and HLS/DASH streams.

**JSPI and Asyncify** support playback paths without cross-origin isolation;
threaded Wasm engines use isolation. Local media stays in the browser.

[Quick start](#quick-start) · [Playback](#playback-and-integration) ·
[Media comparison](#media-comparison) · [Documentation](#documentation)

## Quick start

Install Demuxe and copy its runtime assets into your application's public folder:

```sh
npm install demuxe
npx demuxe copy-assets public/assets/demuxe
```

Register the player in your application's browser entry point:

```js
import { definePlayerElement } from 'demuxe/player';

definePlayerElement();
```

Serve `public/` at your site's root, then point the player to a video URL:

```html
<demuxe-player controls asset-base="/assets/demuxe/" src="/media/example.mkv"></demuxe-player>
```

Use a browser bundler to resolve the package import. Keep the copied assets and
JavaScript package on the same version. See [runtime assets](docs/RUNTIME-ASSETS.md)
for other hosting layouts.

## Playback and integration

Demuxe selects native, WebCodecs-assisted or software decoding based on the
source and browser. See [capabilities](docs/CAPABILITIES.md) for supported formats
and [bundling](docs/BUNDLING.md) for providers and hosting requirements.

Build custom controls with the [Player API](docs/PUBLIC-API.md). Tested scope and
known issues are recorded in the [release notes](https://github.com/Jagalite/demuxe/releases)
and [comparison evidence](docs/MEDIA-COMPARISON-EVIDENCE.md).

<a id="representative-head-to-head-media-evidence-default-routes-plus-forced-software"></a>

## Media comparison

Results apply to the tested files, browsers and builds. CPU is a percentage of
one core; measurements from separate campaigns are not directly comparable.
See the [evidence guide](docs/MEDIA-COMPARISON-EVIDENCE.md#current-table-evidence)
for methodology, missing measurements and fidelity limits.

- 🟢 **Pass** · 🟣 **Pass with an alternative configuration**
- 🟠 **Plays, but a later check failed** · 🔴 **Test failed**
- 🟡 **Screened:** limited checks · `*` **Profile, duration or fidelity limits**
- **— Untested** · **— Unqualified:** fixture/reference unavailable · **N/A:** inapplicable

**Auto** selects the route; **Software** forces software decoding.
**JSPI/Asyncify** measure non-isolated file remux/transcode paths.
`native-direct bypass` skips that runtime; `forced-remux ref` measures a forced
route rather than Auto. A failed test does not necessarily mean an unsupported codec.

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
| H.264 + FLAC stereo / MKV | 🟢 (Pass) · 13.2% CPU | 🟢 (Pass) · 13.9% CPU | 🟢 (Pass) · 16.5% CPU · forced-remux ref | 🟢 (Pass) · 17.9% CPU · forced-remux ref | 🟢 (Pass) · 33.6% CPU | 🔴 (Fail) | 🟢 (Pass) · 33.7% CPU | 🟡 Screened · 33.1% CPU | 🟢 (Pass) · CPU withheld |
| H.264 + FLAC 5.1 / MKV | 🟢 (Pass)\* · 14.0% CPU | 🟡 Screened* · 14.5% CPU | 🟡 Screened* · 19.2% CPU · forced-remux ref | 🟡 Screened* · 19.9% CPU · forced-remux ref | 🟡 Screened* · 34.9% CPU | 🔴 (Fail) | 🟢 (Pass)\* · 33.2% CPU | 🟡 Screened* · 33.7% CPU | 🟡 Screened* · 23.5% CPU |
| H.264 + Opus stereo / MKV | 🟢 (Pass) · 14.3% CPU | 🟢 (Pass) · 14.0% CPU | 🟢 (Pass) · 17.7% CPU · forced-remux ref | 🟢 (Pass) · 16.9% CPU · forced-remux ref | 🟢 (Pass) · 37.5% CPU | 🟢 (Pass) · 30.2% CPU | 🟢 (Pass) · 35.3% CPU | 🟡 Screened · 35.2% CPU | 🟢 (Pass) · 25.0% CPU |
| H.264 + PCM16 stereo / MKV | 🟢 (Pass) · 12.9% CPU | 🟢 (Pass) · 14.0% CPU | 🟢 (Pass) · 18.3% CPU · forced-remux ref | 🟢 (Pass) · 19.0% CPU · forced-remux ref | 🟢 (Pass) · 34.3% CPU | 🟢 (Pass) · 33.2% CPU | 🔴 (Fail) | 🟡 Screened · 32.5% CPU | 🟢 (Pass) · 21.5% CPU |
| H.264 + PCM24 5.1 / MKV | 🟢 (Pass)\* · 13.4% CPU | 🟡 Screened* · 13.9% CPU | — Blocked | — Blocked | 🟡 Screened* · 35.6% CPU | 🟢 (Pass)\* · 26.1% CPU | 🔴 (Fail) | 🟡 Screened* · 34.5% CPU | 🟡 Screened* · 22.9% CPU |
| HEVC Main 8-bit + AAC / MP4 (hvc1) | 🟢 (Pass) · 14.8% CPU | 🟢 (Pass) · 15.4% CPU | 🟢 (Pass) · 16.5% CPU · forced-remux ref | 🟢 (Pass) · 16.7% CPU · forced-remux ref | 🟢 (Pass) · 35.6% CPU | 🔴 (Fail) | 🟢 (Pass) · 33.1% CPU | 🟡 Screened · 41.1% CPU | 🟢 (Pass) · CPU withheld |
| HEVC Main 8-bit + AAC / MP4 (hev1) | 🟢 (Pass) · 14.7% CPU | 🟢 (Pass) · 15.2% CPU | 🟢 (Pass) · 17.0% CPU · forced-remux ref | 🟢 (Pass) · 17.1% CPU · forced-remux ref | 🟢 (Pass) · 35.2% CPU | 🔴 (Fail) | 🟢 (Pass) · 34.4% CPU | 🟡 Screened · 41.6% CPU | 🟢 (Pass) · 23.0% CPU |
| HEVC Main 10-bit SDR + AAC / MP4 | 🟢 (Pass) · 18.4% CPU | 🟢 (Pass) · 16.8% CPU | 🟢 (Pass) · 18.7% CPU · forced-remux ref | 🟢 (Pass) · 19.1% CPU · forced-remux ref | 🟢 (Pass) · 38.1% CPU | 🔴 (Fail) | 🟢 (Pass) · 37.4% CPU | 🟡 Screened · 41.1% CPU | 🟢 (Pass) · 25.1% CPU |
| HEVC Main 10 4:2:2 + AAC / MKV | 🟢 (Pass)\* · 17.8% CPU | 🟢 (Pass) · 16.7% CPU | 🟢 (Pass) · 18.8% CPU · forced-remux ref | 🟢 (Pass) · 17.1% CPU · forced-remux ref | 🟢 (Pass) · 37.9% CPU | 🟢 (Pass) · CPU withheld | 🟢 (Pass)* · 37.6% CPU | 🟡 Screened* · 41.4% CPU | 🟢 (Pass) · 25.2% CPU |
| HEVC Main 10-bit SDR + AC-3 / MKV | 🔴 (Fail) | 🟢 (Pass) · CPU withheld | 🟢 (Pass) · 19.8% CPU · forced-remux ref | 🟢 (Pass) · 20.3% CPU · forced-remux ref | 🟢 (Pass) · 36.2% CPU | 🔴 (Fail) | 🟢 (Pass) · 36.8% CPU | 🟡 Screened · 40.6% CPU | 🔴 (Fail) |
| HEVC Main 10-bit SDR + E-AC-3 / MKV | 🔴 (Fail) | 🟢 (Pass) · 20.4% CPU | 🟢 (Pass) · 19.8% CPU · forced-remux ref | 🟢 (Pass) · 20.8% CPU · forced-remux ref | 🟢 (Pass) · 35.5% CPU | 🔴 (Fail) | 🟢 (Pass) · 36.9% CPU | 🟡 Screened · 42.0% CPU | 🔴 (Fail) |
| HEVC Main 10-bit SDR + DTS core / MKV | 🔴 (Fail) | 🟢 (Pass) · 21.1% CPU | 🟢 (Pass) · 20.8% CPU · forced-remux ref | 🟢 (Pass) · 21.4% CPU · forced-remux ref | 🟢 (Pass) · 35.8% CPU | 🔴 (Fail) | 🟢 (Pass) · 41.4% CPU | 🟡 Screened* · 44.1% CPU | 🔴 (Fail) |
| AV1 8-bit + AAC / MP4 | 🟢 (Pass) · 13.6% CPU | 🟢 (Pass) · 13.7% CPU | 🟢 (Pass) · 14.9% CPU · forced-remux ref | 🟢 (Pass) · 14.9% CPU · forced-remux ref | 🟢 (Pass) · 33.8% CPU | 🔴 (Fail) | 🟢 (Pass) · 37.2% CPU | 🟡 Screened · 33.5% CPU | 🟢 (Pass) · 21.8% CPU |
| AV1 10-bit SDR + Opus / MKV | 🟢 (Pass) · 18.0% CPU | 🟢 (Pass) · 17.3% CPU | 🟢 (Pass) · 18.3% CPU · forced-remux ref | 🟢 (Pass) · 19.4% CPU · forced-remux ref | 🟢 (Pass) · 36.7% CPU | 🔴 (Fail) | 🟢 (Pass) · 38.5% CPU | 🟡 Screened · 36.3% CPU | 🟢 (Pass) · 25.3% CPU |
| AV1 + Opus / WebM | 🟢 (Pass) · 14.6% CPU | 🟢 (Pass) · 12.3% CPU | 🟢 (Pass) · 15.8% CPU · forced-remux ref | 🟢 (Pass) · 16.3% CPU · forced-remux ref | 🟢 (Pass) · 33.2% CPU | 🔴 (Fail) | 🟢 (Pass) · 38.3% CPU | 🟡 Screened · 34.9% CPU | 🟢 (Pass) · 24.0% CPU |
| VP9 8-bit + Opus / WebM | 🟢 (Pass) · 14.0% CPU | 🟢 (Pass) · 4.3% CPU | 🟢 (Pass) · 4.7% CPU · forced-remux ref | 🟢 (Pass) · 4.9% CPU · forced-remux ref | 🟢 (Pass) · 36.1% CPU | 🔴 (Fail) | 🟢 (Pass) · 34.9% CPU | 🟡 Screened · 34.2% CPU | 🟢 (Pass) · 22.6% CPU |
| VP9 10-bit SDR + Opus / WebM | 🟢 (Pass) · 16.6% CPU | 🟢 (Pass) · 15.4% CPU | 🟢 (Pass) · 18.8% CPU · forced-remux ref | 🟢 (Pass) · 11.5% CPU · forced-remux ref | 🟢 (Pass) · 33.6% CPU | 🔴 (Fail) | 🔴 (Fail) | 🟡 Screened · 34.7% CPU | 🟢 (Pass) · 25.5% CPU |
| VP8 + Vorbis / WebM | 🟢 (Pass) · 13.4% CPU | 🟢 (Pass) · 12.7% CPU | 🟢 (Pass) · 13.0% CPU · forced-remux ref | 🟢 (Pass) · 13.9% CPU · forced-remux ref | 🟢 (Pass) · 36.1% CPU | 🔴 (Fail) | 🟢 (Pass) · 35.6% CPU | 🟡 Screened · 32.8% CPU | 🟢 (Pass) · 22.1% CPU |
| H.264 + AAC / MPEG-TS | 🔴 (Fail) | 🟢 (Pass) · 17.6% CPU | 🟢 (Pass) · 16.1% CPU · forced-remux ref | 🟢 (Pass) · 17.1% CPU · forced-remux ref | 🟢 (Pass) · 32.8% CPU | 🔴 (Fail) | 🟢 (Pass) · 35.4% CPU | 🟡 Screened · 34.6% CPU | 🔴 (Fail) |
| MPEG-2 video + AC-3 / MPEG-TS | 🔴 (Fail) | 🟢 (Pass) · CPU withheld | — Blocked | — Blocked | 🟢 (Pass) · CPU withheld | 🟢 (Pass) · 30.1% CPU | 🟢 (Pass) · 34.7% CPU | 🔴 (Fail) | 🔴 (Fail) |
| Interlaced MPEG-2 + AC-3 stereo / MPEG-TS | 🔴 (Fail) | 🟢 (Pass) · 33.2% CPU | — Blocked | — Blocked | 🟢 (Pass) · 32.3% CPU | 🔴 (Fail) | 🟢 (Pass)\* · 33.6% CPU | 🔴 (Fail) | 🔴 (Fail) |
| MPEG-2 video + MP2 / MPEG-PS | 🔴 (Fail) | 🟢 (Pass) · 33.0% CPU | — Blocked | — Blocked | 🟢 (Pass) · 32.6% CPU | 🔴 (Fail) | 🔴 (Fail) | 🔴 (Fail) | 🔴 (Fail) |
| MPEG-4 Part 2 + MP3 / AVI | 🔴 (Fail) | 🟢 (Pass) · 34.4% CPU | — Blocked | — Blocked | 🟢 (Pass) · 31.9% CPU | 🔴 (Fail) | 🔴 (Fail) | 🔴 (Fail) | 🔴 (Fail) |
| ProRes + PCM / MOV | 🔴 (Fail) | 🟢 (Pass) · 26.4% CPU | — Blocked | — Blocked | 🟢 (Pass) · 27.3% CPU | 🔴 (Fail) | 🔴 (Fail) | 🟡 Screened* · 33.0% CPU | 🔴 (Fail) |
| H.264 + AAC / fragmented MP4 (single file) | 🟢 (Pass) · 13.6% CPU | 🟢 (Pass) · 14.0% CPU | 🟢 (Pass) · 17.0% CPU · forced-remux ref | 🟢 (Pass) · 16.1% CPU · forced-remux ref | 🟢 (Pass) · 34.8% CPU | 🔴 (Fail) | 🔴 (Fail) | 🟡 Screened · 33.1% CPU | 🟢 (Pass) · 23.9% CPU |
| H.264 video-only / MP4 | 🟢 (Pass) · 11.5% CPU | 🟢 (Pass) · 11.9% CPU | 🟢 (Pass) · 13.9% CPU · forced-remux ref | 🟢 (Pass) · 14.6% CPU · forced-remux ref | 🟢 (Pass) · 30.4% CPU | 🟢 (Pass) · 32.1% CPU | 🟢 (Pass) · 25.5% CPU | 🟡 Screened · 31.8% CPU | 🟢 (Pass) · 18.9% CPU |
| H.264 High 10 + AAC / MKV | 🟢 (Pass)\* · 17.4% CPU | 🟢 (Pass) · 17.2% CPU | 🟢 (Pass) · 18.6% CPU · forced-remux ref | 🟢 (Pass) · 18.7% CPU · forced-remux ref | 🟢 (Pass) · 37.0% CPU | 🔴 (Fail) | 🟢 (Pass)* · 35.4% CPU | 🟡 Screened* · 33.3% CPU | 🟢 (Pass) · 26.5% CPU |
| MPEG-2 video-only / MPEG-TS | 🔴 (Fail) | 🟢 (Pass) · 29.9% CPU | — Blocked | — Blocked | 🟢 (Pass) · 29.1% CPU | 🟢 (Pass) · 30.6% CPU | 🟢 (Pass) · 25.7% CPU | 🔴 (Fail) | 🔴 (Fail) |
| H.264 + AAC + embedded SRT / MKV | 🔴 (Fail) | 🟢 (Pass) · 18.9% CPU | 🟢 (Pass) · 18.9% CPU · forced-remux ref | 🟢 (Pass) · 20.2% CPU · forced-remux ref | 🟢 (Pass) · 36.5% CPU | 🔴 (Fail) | 🔴 (Fail) | 🔴 (Fail) | 🔴 (Fail) |
| H.264 + AAC + external WebVTT / MP4 | 🟢 (Pass) · 13.7% CPU | 🟢 (Pass) · 15.0% CPU | 🟢 (Pass) · 17.0% CPU · forced-remux ref | 🟢 (Pass) · 17.0% CPU · forced-remux ref | 🟢 (Pass) · 35.8% CPU | 🔴 (Fail) | 🔴 (Fail) | 🔴 (Fail) | 🟢 (Pass) · 11.1% CPU |
| H.264 + AAC + embedded mov_text / MP4 | 🔴 (Fail) | 🟢 (Pass) · 19.0% CPU | 🟢 (Pass) · 19.2% CPU · forced-remux ref | 🟢 (Pass) · 19.1% CPU · forced-remux ref | 🟢 (Pass) · 35.8% CPU | 🔴 (Fail) | 🔴 (Fail) | 🔴 (Fail) | 🔴 (Fail) |
| H.264 + AAC + styled ASS / MKV | 🔴 (Fail) | 🟢 (Pass) · 19.3% CPU | 🟢 (Pass) · 18.9% CPU · forced-remux ref | 🟢 (Pass) · 19.2% CPU · forced-remux ref | 🟢 (Pass) · 36.5% CPU | 🔴 (Fail) | 🔴 (Fail) | 🔴 (Fail) | 🔴 (Fail) |
| H.264 + AC-3 stereo + ASS / MKV | 🔴 (Fail) | 🟢 (Pass) · 19.6% CPU | 🟢 (Pass) · 20.5% CPU · forced-remux ref | 🟢 (Pass) · 20.0% CPU · forced-remux ref | 🟢 (Pass) · 35.6% CPU | 🔴 (Fail) | 🔴 (Fail) | 🔴 (Fail) | 🔴 (Fail) |
| HEVC + AC-3 + PGS / MKV | 🔴 (Fail) | 🟢 (Pass) · 21.7% CPU | 🟢 (Pass) · 22.6% CPU · forced-remux ref | 🟢 (Pass) · CPU withheld · forced-remux ref | 🟢 (Pass) · 37.8% CPU | 🔴 (Fail) | 🔴 (Fail) | 🔴 (Fail) | 🔴 (Fail) |
| H.264 + AC-3 + VobSub / MKV | 🔴 (Fail) | 🟢 (Pass) · CPU withheld | 🟢 (Pass) · 24.8% CPU · forced-remux ref | 🟢 (Pass) · CPU withheld · forced-remux ref | 🟢 (Pass) · 37.1% CPU | 🔴 (Fail) | 🔴 (Fail) | 🔴 (Fail) | 🔴 (Fail) |
| H.264 + AAC + PGS / MKV (subtitle isolation) | 🔴 (Fail) | 🟢 (Pass) · 24.5% CPU | 🟢 (Pass) · 24.4% CPU · forced-remux ref | 🟢 (Pass) · 24.7% CPU · forced-remux ref | 🟢 (Pass) · 36.4% CPU | 🔴 (Fail) | 🔴 (Fail) | 🔴 (Fail) | 🔴 (Fail) |
| H.264 + AAC + VobSub / MKV (subtitle isolation) | 🔴 (Fail) | 🟢 (Pass) · 24.2% CPU | 🟢 (Pass) · 23.9% CPU · forced-remux ref | 🟢 (Pass) · 25.6% CPU · forced-remux ref | 🟢 (Pass) · 36.0% CPU | 🔴 (Fail) | 🔴 (Fail) | 🔴 (Fail) | 🔴 (Fail) |
| AAC audio-only / M4A | 🟢 (Pass) · 2.4% CPU | 🟢 (Pass) · 13.4% CPU | 🟢 (Pass) · 15.7% CPU · forced-remux ref | 🟢 (Pass) · 15.8% CPU · forced-remux ref | 🟢 (Pass) · 19.2% CPU | 🟢 (Pass) · CPU withheld | 🟢 (Pass) · 9.9% CPU | 🟡 Screened · 45.4% CPU | 🟢 (Pass) · 11.3% CPU |
| MP3 audio-only / MP3 | 🟢 (Pass) · 0.9% CPU | 🟢 (Pass) · CPU withheld | — Blocked | — Blocked | 🟢 (Pass) · 18.6% CPU | 🟢 (Pass) · CPU withheld | 🔴 (Fail) | 🟡 Screened · 10.1% CPU | 🟢 (Pass) · 11.5% CPU |
| FLAC audio-only / FLAC | 🟢 (Pass) · 2.1% CPU | 🟢 (Pass) · 13.4% CPU | 🟢 (Pass) · 16.7% CPU · forced-remux ref | 🟢 (Pass) · 17.3% CPU · forced-remux ref | 🟢 (Pass) · 18.6% CPU | 🟢 (Pass) · CPU withheld | 🟢 (Pass) · 8.0% CPU | 🟡 Screened · 42.9% CPU | 🟢 (Pass) · 10.1% CPU |
| Opus audio-only / Ogg | 🟢 (Pass) · 3.4% CPU | 🟢 (Pass) · CPU withheld | 🟢 (Pass) · 16.1% CPU · forced-remux ref | 🟢 (Pass) · 16.2% CPU · forced-remux ref | 🟢 (Pass) · 19.8% CPU | 🟢 (Pass) · CPU withheld | 🔴 (Fail) | 🟡 Screened · 45.8% CPU | 🟢 (Pass) · 12.7% CPU |
| Vorbis audio-only / Ogg | 🟢 (Pass) · 2.3% CPU | 🟢 (Pass) · 13.6% CPU | 🟢 (Pass) · 15.0% CPU · forced-remux ref | 🟢 (Pass) · 15.4% CPU · forced-remux ref | 🟢 (Pass) · 19.0% CPU | 🔴 (Fail) | 🔴 (Fail) | 🟡 Screened* · 45.9% CPU | 🟢 (Pass) · 11.1% CPU |
| PCM16 audio-only / WAV | 🟠 | 🟢 (Pass) · 8.8% CPU | — Blocked | — Blocked | 🟢 (Pass) · 18.0% CPU | 🟢 (Pass) · CPU withheld | 🔴 (Fail) | 🟡 Screened* · 11.1% CPU | 🟢 (Pass) · 11.1% CPU |
| PCM24 audio-only / WAV | 🟠 | 🟢 (Pass) · CPU withheld | — Blocked | — Blocked | 🟢 (Pass) · 18.5% CPU | 🟢 (Pass) · CPU withheld | 🔴 (Fail) | 🟡 Screened* · 44.6% CPU | 🟢 (Pass) · 10.7% CPU |
| HEVC Main 10 + E-AC-3 / MKV (HDR10) | 🔴 (Fail) | 🟡 Screened* · 21.0% CPU | 🟡 Screened* · 25.9% CPU · forced-remux ref | 🟡 Screened* · 26.4% CPU · forced-remux ref | 🟡 Screened* · 39.9% CPU | 🔴 (Fail) | 🟡 Screened* · 35.0% CPU | 🟡 Screened* · 41.4% CPU | 🔴 (Fail) |
| HEVC Main 10 + AAC / MP4 (HLG) | 🟡 Screened* · 18.1% CPU | 🟡 Screened* · 23.9% CPU | 🟡 Screened* · 24.9% CPU · forced-remux ref | 🟡 Screened* · 25.1% CPU · forced-remux ref | 🟡 Screened* · 40.5% CPU | 🔴 (Fail) | 🟡 Screened* · 36.0% CPU | 🟡 Screened* · 41.0% CPU | 🟡 Screened* · 26.0% CPU |
| AV1 10-bit + Opus / WebM (HDR10) | 🟡 Screened* · 17.0% CPU | 🟡 Screened* · 23.6% CPU | 🟡 Screened* · 24.3% CPU · forced-remux ref | 🟡 Screened* · 24.7% CPU · forced-remux ref | 🟡 Screened* · 40.7% CPU | 🔴 (Fail) | 🟡 Screened* · 37.6% CPU | 🟡 Screened* · 35.3% CPU | 🟡 Screened* · 23.8% CPU |
| HEVC + TrueHD 7.1 / MKV | 🔴 (Fail) | 🟡 Screened* · 26.7% CPU | 🟡 Screened* · 23.7% CPU · forced-remux ref | 🟡 Screened* · 23.4% CPU · forced-remux ref | 🟡 Screened* · 43.6% CPU | 🔴 (Fail) | 🔴 (Fail) | 🔴 (Fail) | 🔴 (Fail) |
| HEVC + DTS-HD MA 7.1 / MKV | 🔴 (Fail) | 🟡 Screened* · 28.5% CPU | 🟡 Screened* · CPU pending · forced-remux ref | 🟡 Screened* · CPU pending · forced-remux ref | 🟡 Screened* · 43.5% CPU | 🔴 (Fail) | 🟡 Screened* · CPU pending | 🟡 Screened* · CPU pending | 🔴 (Fail) |
| HEVC + E-AC-3 with Atmos metadata / MP4 | 🔴 (Fail) | 🟡 Screened* · 24.4% CPU | 🟡 Screened* · CPU pending · forced-remux ref | 🟡 Screened* · CPU pending · forced-remux ref | 🟡 Screened* · 38.8% CPU | 🔴 (Fail) | 🔴 (Fail) | 🔴 (Fail) | 🔴 (Fail) |
| Dolby Vision profile 5 HEVC + E-AC-3 / MP4 | 🔴 (Fail) | 🟡 Screened* · 70.3% CPU | 🔴 (Fail) · forced-remux ref | 🔴 (Fail) · forced-remux ref | 🟡 Screened* · 72.0% CPU | 🔴 (Fail) | 🟡 Screened* · CPU pending | 🔴 (Fail) | 🔴 (Fail) |
| Dolby Vision profile 8.1 HEVC + E-AC-3 / MKV | 🔴 (Fail) | 🟡 Screened* · 62.7% CPU | 🔴 (Fail) · forced-remux ref | 🔴 (Fail) · forced-remux ref | 🟡 Screened* · CPU withheld | 🔴 (Fail) | 🟡 Screened* · CPU pending | 🔴 (Fail) | 🔴 (Fail) |
| H.264 + AAC / HLS VOD (TS segments) | 🟢 (Pass) | 🟢 (Pass) · CPU withheld | N/A · finite-file scope | N/A · finite-file scope | 🟢 (Pass) · 35.4% CPU | 🟢 (Pass) | 🟢 (Pass) | N/A · File example | 🟢 (Pass) · CPU pending |
| H.264 + AAC / HLS VOD (fMP4 segments) | 🟢 (Pass) | 🟢 (Pass) · 22.4% CPU | N/A · finite-file scope | N/A · finite-file scope | 🟢 (Pass) · 35.6% CPU | 🟢 (Pass) | 🟢 (Pass) | N/A · File example | 🟢 (Pass) · CPU pending |
| HEVC + AAC / HLS VOD (fMP4 segments) | 🟢 (Pass) | 🔴 (Fail) | N/A · finite-file scope | N/A · finite-file scope | 🟢 (Pass) · 36.5% CPU | 🟢 (Pass) | 🟢 (Pass) | N/A · File example | 🔴 (Fail) |
| H.264 + AAC / DASH VOD (fMP4 segments) | 🔴 (Fail) | 🟢 (Pass) · 21.6% CPU | N/A · finite-file scope | N/A · finite-file scope | 🟢 (Pass) · 33.8% CPU | 🟢 (Pass) | 🟢 (Pass) | N/A · File example | 🟢 (Pass) · CPU pending |
| AV1 + Opus / DASH VOD (WebM segments) | 🔴 (Fail) | 🟢 (Pass) · 21.4% CPU | N/A · finite-file scope | N/A · finite-file scope | 🟢 (Pass) · 34.9% CPU | 🟢 (Pass) | 🔴 (Fail) | N/A · File example | 🔴 (Fail) |
| H.264 + AAC / HLS live (sliding window) | 🔴 (Fail) | 🟢 (Pass) · 23.1% CPU | N/A · finite-file scope | N/A · finite-file scope | 🟢 (Pass) · 37.1% CPU | 🟢 (Pass) | 🔴 (Fail) | N/A · File example | 🟢 (Pass) · CPU pending |
| HEVC Main 10 + AAC / MKV | 🟢 (Pass)\* | 🟡 Screened* · 24.2% CPU | 🟡 Screened* · 25.2% CPU · forced-remux ref | 🟡 Screened* · 25.8% CPU · forced-remux ref | 🟡 Screened* · 40.7% CPU | 🟢 (Pass)\* | 🟢 (Pass)\* | 🟡 Screened* · CPU pending | 🟡 Screened* · CPU pending |
| HEVC Main 10 + FLAC / MKV | 🟢 (Pass)\* | 🟡 Screened* · 23.8% CPU | 🟡 Screened* · 24.6% CPU · forced-remux ref | 🟡 Screened* · 25.8% CPU · forced-remux ref | 🟡 Screened* · 40.5% CPU | 🔴 (Fail) | 🟢 (Pass)\* | 🟡 Screened* · CPU pending | 🟡 Screened* · CPU pending |
| HEVC Main 10 + Opus / MKV | 🟢 (Pass)\* | 🟡 Screened* · CPU withheld | 🟡 Screened* · 26.5% CPU · forced-remux ref | 🟡 Screened* · 25.9% CPU · forced-remux ref | 🟡 Screened* · 41.0% CPU | 🔴 (Fail) | 🟡 (Screened)\* | 🟡 Screened* · CPU pending | 🟡 Screened* · CPU pending |
| HEVC Main 10 + FLAC + ASS / MKV | 🔴 (Fail) | 🟡 Screened* · 26.0% CPU | 🟡 Screened* · 26.4% CPU · forced-remux ref | 🟡 Screened* · 27.8% CPU · forced-remux ref | 🟡 Screened* · 41.0% CPU | 🔴 (Fail) | 🔴 (Fail) | 🔴 (Fail) | 🔴 (Fail) |
| HEVC Main 10 + Opus + ASS / MKV | 🔴 (Fail) | 🟡 Screened* · 26.8% CPU | 🟡 Screened* · 27.1% CPU · forced-remux ref | 🟡 Screened* · 27.4% CPU · forced-remux ref | 🟡 Screened* · 40.8% CPU | 🔴 (Fail) | 🔴 (Fail) | 🔴 (Fail) | 🔴 (Fail) |
| HEVC Main 10 HDR10 + TrueHD 7.1 + PGS / MKV | 🔴 (Fail) | 🟡 Screened* · 27.1% CPU | 🟡 Screened* · CPU pending · forced-remux ref | 🟡 Screened* · CPU pending · forced-remux ref | 🟡 Screened* · 44.6% CPU | 🔴 (Fail) | 🔴 (Fail) | 🔴 (Fail) | 🔴 (Fail) |
| HEVC Main 10 HDR10 + DTS-HD MA 7.1 + PGS / MKV | 🔴 (Fail) | 🟡 Screened* · 28.2% CPU | 🟡 Screened* · CPU pending · forced-remux ref | 🟡 Screened* · CPU pending · forced-remux ref | 🟡 Screened* · 42.7% CPU | 🔴 (Fail) | 🔴 (Fail) | 🔴 (Fail) | 🔴 (Fail) |
| Dolby Vision profile 5 + E-AC-3/Atmos + ASS / MKV | 🔴 (Fail) | 🟡 Screened* · 73.3% CPU | 🔴 (Fail) · forced-remux ref | 🔴 (Fail) · forced-remux ref | 🟡 Screened* · 73.3% CPU | 🔴 (Fail) | 🔴 (Fail) | 🔴 (Fail) | 🔴 (Fail) |
| Dolby Vision profile 8.1 + E-AC-3/Atmos + ASS / MKV | 🔴 (Fail) | 🟡 Screened* · 72.9% CPU | 🔴 (Fail) · forced-remux ref | 🔴 (Fail) · forced-remux ref | 🟡 Screened* · 71.5% CPU | 🔴 (Fail) | 🔴 (Fail) | 🔴 (Fail) | 🔴 (Fail) |

[Complete-file catalogue](docs/HEAD-TO-HEAD-CATALOGUE.md) ·
[Row refresh index](docs/CPU-ROW-REFRESH.md) ·
[Measurement protocol](docs/BENCHMARK-PROTOCOL.md) ·
[Historical CPU snapshot](docs/HEAD-TO-HEAD-CPU-HISTORICAL-20260925.md)

<a id="private-mpv-player-campaign"></a>

[Non-isolated audio and subtitle campaign](docs/MEDIA-COMPARISON-EVIDENCE.md#private-mpv-player-campaign)

## Documentation

| Topic | Guides |
| --- | --- |
| Integration | [Public API](docs/PUBLIC-API.md), [player component](docs/PLAYER-COMPONENT.md), [migration](docs/API-MIGRATION.md) |
| Codec packages | [Production codec contracts and evidence](docs/CODEC-SPLIT-PRODUCTION.md), [provider distribution](docs/PROVIDER-DISTRIBUTION-DRAFT.md) |
| Provider bundles | [Provider selection, separate assets and embedded JS](docs/BUNDLING.md) |
| Deployment | [Demo builds](docs/PAGES.md), [runtime assets](docs/RUNTIME-ASSETS.md), [runtime selection](docs/REMUX-RUNTIME.md), [engine-free core package](packages/core/README.md) |
| Playback | [Capabilities](docs/CAPABILITIES.md), [route policy](docs/PLAYBACK-TIER-POLICY.md), [production pipeline](docs/PRODUCTION-PIPELINE.md), [streaming](docs/STREAMING.md) |
| Advanced options | [Audio transcoding and precision](docs/AUDIO-TRANSCODING.md), [decode quality](docs/DECODE-QUALITY-POLICY.md), [Software presentation](docs/SOFTWARE-YUV-PRESENTER.md), [fast inspection](docs/FAST-PROBE.md), [previews](docs/PREVIEWS.md) |
| Evidence | [Comparison guide](docs/MEDIA-COMPARISON-EVIDENCE.md), [rerun guide](docs/HEAD-TO-HEAD.md), [research index](research/README.md), [research process](research/PROCESS.md) |

## Licensing

Demuxe application code is **Apache-2.0**; bundled mpv/FFmpeg engines are
**LGPL-2.1-or-later** with upstream terms. Documentation and reports are
**CC BY 4.0**. Earlier GPL releases retain their original licenses.

Preserve notices and matching source when distributing the runtime. See
[license boundaries](LICENSING.md), [distribution requirements](docs/LICENSING.md)
and [LGPL relinking](docs/LGPL-RELINK.md).
