<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Demuxe

Demuxe is a browser media playback runtime that automatically chooses the least
expensive correct playback path: native browser playback, progressive remuxing,
WebCodecs-assisted hybrid playback, or FFmpeg/mpv software decoding.

The three public modes are **native**, **hybrid**, and **software**. Remuxing is
part of Native, not a fourth mode. This is a developer beta with representative
Chrome/Firefox evidence, not a promise of universal codec or browser support.

## Install

```sh
npm install demuxe@beta
npx demuxe copy-assets public/assets/demuxe
```

Serve the copied directory at `/assets/demuxe/`, preserving its relative tree.
Native remux, Hybrid, and Software require cross-origin isolation headers:

```text
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

Native direct playback does not require Wasm or isolation. Remote sources need
appropriate CORS and range support. See [runtime assets](docs/RUNTIME-ASSETS.md).

## Player runtime

```js
import { Player } from 'demuxe';

const player = new Player(container, { assetBase: '/assets/demuxe/' });
await player.open(source); // File, ArrayBuffer, URL, or supported remote source
await player.play();
// When finished: await player.destroy();
```

## Ready-made player

```js
import { definePlayerElement } from 'demuxe/player';
definePlayerElement();
```

```html
<demuxe-player controls asset-base="/assets/demuxe/"></demuxe-player>
```

The component includes local-file and URL opening, subtitles, playback controls,
keyboard shortcuts, and optional session diagnostics. Local files stay in the
browser. The runtime never uploads them.

See [the public API](docs/PUBLIC-API.md), [component contract](docs/PLAYER-COMPONENT.md),
[migration notes](docs/API-MIGRATION.md), and [beta limits](docs/BETA.md).

## Head-to-head media coverage

The original four combinations and all 56 additional combinations now have recorded
outcomes. Expanded run: **2026-09-19, Chrome 152, headless**.
**Screen only** means playback checks passed but surround/HDR fidelity remains
unqualified. **Blocked** identifies unavailable fixtures, engines, or checks.
These are bounded synthetic tests, not universal support guarantees. **% gains remain
unmeasured.** See [evidence and limitations](docs/HEAD-TO-HEAD-CATALOGUE.md).

**Legend:** 🟢 Native-path pass · 🔵 Other-path pass · 🟣 Default failed; tested alternative passed · 🔴 Fail · 🟡 Screen only (fidelity unqualified) · ⚪ Blocked (not tested)

| Media format | Native video | Demuxe (auto) | Movi | AVPlayer | CPU gain % |
| --- | --- | --- | --- | --- | --- |
| H.264 + AAC / MP4 | Native · 🟢 Pass | Native · 🟢 Pass | Custom · 🟣 Fail; native-first pass | Custom · 🔵 Pass | Not measured / N/A / Not measured |
| H.264 + AAC / MKV | Native · 🟢 Pass | Native · 🟢 Pass | Custom · 🟣 Fail; native-first pass | Custom · 🔵 Pass | Not measured / N/A / Not measured |
| H.264 + PCM24 / MKV | Native · 🟢 Pass | Native · 🟢 Pass | Custom · 🔵 Pass | Custom · 🔴 Fail | Not measured / Not measured / N/A |
| H.264 + PCM24 / MKV + ASS | Native + host ASS · 🟢 Pass | Hybrid · 🔵 Pass | Custom · 🟣 Fail; native-first + host ASS pass | Custom · 🔴 Fail | Not measured / N/A / N/A |
| H.264 + AAC 5.1 / MP4 | Native · 🟡 Screen only | Native · 🟡 Screen only | Custom · 🔴 Fail | Custom · 🟡 Screen only | — |
| H.264 + MP3 stereo / MP4 | Native · 🟢 Pass | Native · 🟢 Pass | Custom · 🔴 Fail | Custom · 🔵 Pass | — |
| H.264 + AC-3 5.1 / MKV | Native · 🔴 Fail | Hybrid · 🟡 Screen only | Custom · 🔴 Fail | Custom · 🟡 Screen only | — |
| H.264 + E-AC-3 5.1 / MKV | Native · 🔴 Fail | Hybrid · 🟡 Screen only | Custom · 🔴 Fail | Custom · 🟡 Screen only | — |
| H.264 + DTS core 5.1 / MKV | Native · 🔴 Fail | Hybrid · 🟡 Screen only | Custom · 🔴 Fail | Custom · 🟡 Screen only | — |
| H.264 + FLAC stereo / MKV | Native · 🟢 Pass | Native · 🟢 Pass | Custom · 🔴 Fail | Custom · 🔵 Pass | — |
| H.264 + FLAC 5.1 / MKV | Native · 🟡 Screen only | Native · 🟡 Screen only | Custom · 🔴 Fail | Custom · 🟡 Screen only | — |
| H.264 + Opus stereo / MKV | Native · 🟢 Pass | Native · 🟢 Pass | Custom · 🔵 Pass | Custom · 🔵 Pass | — |
| H.264 + PCM16 stereo / MKV | Native · 🟢 Pass | Native · 🟢 Pass | Custom · 🔵 Pass | Custom · 🔴 Fail | — |
| H.264 + PCM24 5.1 / MKV | Native · 🟡 Screen only | Native · 🟡 Screen only | Custom · 🟡 Screen only | Custom · 🔴 Fail | — |
| HEVC Main 8-bit + AAC / MP4 (hvc1) | Native · 🟢 Pass | Native · 🟢 Pass | Custom · 🔴 Fail | Custom · 🔵 Pass | — |
| HEVC Main 8-bit + AAC / MP4 (hev1) | Native · 🟢 Pass | Native · 🟢 Pass | Custom · 🔴 Fail | Custom · 🔵 Pass | — |
| HEVC Main 10-bit SDR + AAC / MP4 | Native · 🟢 Pass | Native · 🟢 Pass | Custom · 🔴 Fail | Custom · 🔵 Pass | — |
| HEVC Main 10-bit SDR + AC-3 / MKV | Native · 🔴 Fail | Hybrid · 🔵 Pass | Custom · 🔴 Fail | Custom · 🔵 Pass | — |
| HEVC Main 10-bit SDR + E-AC-3 / MKV | Native · 🔴 Fail | Hybrid · 🔵 Pass | Custom · 🔴 Fail | Custom · 🔵 Pass | — |
| HEVC Main 10-bit SDR + DTS core / MKV | Native · 🔴 Fail | Hybrid · 🔵 Pass | Custom · 🔴 Fail | Custom · 🔵 Pass | — |
| AV1 8-bit + AAC / MP4 | Native · 🟢 Pass | Native · 🟢 Pass | Custom · 🔴 Fail | Custom · 🔵 Pass | — |
| AV1 10-bit SDR + Opus / MKV | Native · 🟢 Pass | Native · 🟢 Pass | Custom · 🔴 Fail | Custom · 🔵 Pass | — |
| AV1 + Opus / WebM | Native · 🟢 Pass | Native · 🟢 Pass | Custom · 🔴 Fail | Custom · 🔵 Pass | — |
| VP9 8-bit + Opus / WebM | Native · 🟢 Pass | Native · 🟢 Pass | Custom · 🔴 Fail | Custom · 🔵 Pass | — |
| VP9 10-bit SDR + Opus / WebM | Native · 🟢 Pass | Native · 🟢 Pass | Custom · 🔴 Fail | Unknown · 🔴 Fail | — |
| VP8 + Vorbis / WebM | Native · 🟢 Pass | Native · 🟢 Pass | Custom · 🔴 Fail | Custom · 🔵 Pass | — |
| H.264 + AAC / MPEG-TS | Custom · 🔴 Fail | Native remux · 🟢 Pass | Custom · 🔴 Fail | Custom · 🔵 Pass | — |
| MPEG-2 video + AC-3 / MPEG-TS | Custom · 🔴 Fail | Software · 🔵 Pass | Custom · 🔵 Pass | Custom · 🔵 Pass | — |
| MPEG-2 video + MP2 / MPEG-PS | Custom · 🔴 Fail | Software · 🔵 Pass | Custom · 🔴 Fail | Custom · 🔴 Fail | — |
| MPEG-4 Part 2 + MP3 / AVI | Custom · 🔴 Fail | Software · 🔵 Pass | Custom · 🔴 Fail | Custom · 🔴 Fail | — |
| ProRes + PCM / MOV | Native · 🔴 Fail | Software · 🔵 Pass | Custom · 🔴 Fail | Custom · 🔴 Fail | — |
| H.264 + AAC / fragmented MP4 (single file) | Native · 🟢 Pass | Native · 🟢 Pass | Custom · 🔴 Fail | Custom · 🔴 Fail | — |
| H.264 video-only / MP4 | Native · 🟢 Pass | Native · 🟢 Pass | Custom · 🔵 Pass | Custom · 🔵 Pass | — |
| H.264 + AAC + embedded SRT / MKV | Native · 🔴 Fail | Hybrid · 🔵 Pass | Custom · 🔴 Fail | Custom · 🔴 Fail | — |
| H.264 + AAC + external WebVTT / MP4 | Native · 🟢 Pass | Hybrid · 🔵 Pass | Custom · 🔴 Fail | Custom · 🔴 Fail | — |
| H.264 + AAC + embedded mov_text / MP4 | Native · 🔴 Fail | Hybrid · 🔵 Pass | Custom · 🔴 Fail | Custom · 🔴 Fail | — |
| H.264 + AAC + styled ASS / MKV | Native · 🔴 Fail | Hybrid · 🔵 Pass | Custom · 🔴 Fail | Custom · 🔴 Fail | — |
| HEVC + AC-3 + PGS / MKV | Native · 🔴 Fail | Hybrid · 🔴 Fail | Custom · 🔴 Fail | Custom · 🔴 Fail | — |
| H.264 + AC-3 + VobSub / MKV | Native · 🔴 Fail | Hybrid · 🔵 Pass | Custom · 🔴 Fail | Custom · 🔴 Fail | — |
| AAC audio-only / M4A | Native · 🟢 Pass | Native · 🟢 Pass | Custom · 🔵 Pass | Custom · 🔵 Pass | — |
| MP3 audio-only / MP3 | Native · 🟢 Pass | Native · 🟢 Pass | Custom · 🔵 Pass | Custom · 🔴 Fail | — |
| FLAC audio-only / FLAC | Native · 🟢 Pass | Native · 🟢 Pass | Custom · 🔵 Pass | Custom · 🔵 Pass | — |
| Opus audio-only / Ogg | Native · 🟢 Pass | Native · 🟢 Pass | Custom · 🔵 Pass | Custom · 🔴 Fail | — |
| Vorbis audio-only / Ogg | Native · 🟢 Pass | Native · 🟢 Pass | Custom · 🔴 Fail | Custom · 🔴 Fail | — |
| PCM16 audio-only / WAV | Native · 🟢 Pass | Native · 🟢 Pass | Custom · 🔵 Pass | Custom · 🔴 Fail | — |
| PCM24 audio-only / WAV | Native · 🟢 Pass | Native · 🟢 Pass | Custom · 🔵 Pass | Unknown · 🔴 Fail | — |
| HEVC Main 10 + E-AC-3 / MKV (HDR10) | Native · 🔴 Fail | Hybrid · 🟡 Screen only | Custom · 🔴 Fail | Custom · 🟡 Screen only | — |
| HEVC Main 10 + AAC / MP4 (HLG) | Native · 🟡 Screen only | Native · 🟡 Screen only | Custom · 🔴 Fail | Custom · 🟡 Screen only | — |
| AV1 10-bit + Opus / WebM (HDR10) | Native · 🟡 Screen only | Native · 🟡 Screen only | Custom · 🔴 Fail | Custom · 🟡 Screen only | — |
| HEVC + TrueHD 7.1 / MKV | ⚪ Blocked (fixture) | ⚪ Blocked (fixture) | ⚪ Blocked (fixture) | ⚪ Blocked (fixture) | — |
| HEVC + DTS-HD MA 7.1 / MKV | ⚪ Blocked (fixture) | ⚪ Blocked (fixture) | ⚪ Blocked (fixture) | ⚪ Blocked (fixture) | — |
| HEVC + E-AC-3 with Atmos metadata / MP4 | ⚪ Blocked (fixture) | ⚪ Blocked (fixture) | ⚪ Blocked (fixture) | ⚪ Blocked (fixture) | — |
| Dolby Vision profile 5 HEVC + E-AC-3 / MP4 | ⚪ Blocked (fixture) | ⚪ Blocked (fixture) | ⚪ Blocked (fixture) | ⚪ Blocked (fixture) | — |
| Dolby Vision profile 8.1 HEVC + E-AC-3 / MKV | ⚪ Blocked (fixture) | ⚪ Blocked (fixture) | ⚪ Blocked (fixture) | ⚪ Blocked (fixture) | — |
| H.264 + AAC / HLS VOD (TS segments) | Native · 🟢 Pass | Hybrid · 🔵 Pass | Custom · 🔴 Fail | Custom · 🔴 Fail | — |
| H.264 + AAC / HLS VOD (fMP4 segments) | Native · 🟢 Pass | Hybrid · 🔴 Fail | Custom · 🔴 Fail | Custom · 🔵 Pass | — |
| HEVC + AAC / HLS VOD (fMP4 segments) | Native · 🟢 Pass | Hybrid · 🔴 Fail | Custom · 🔴 Fail | Custom · 🔵 Pass | — |
| H.264 + AAC / DASH VOD (fMP4 segments) | Custom · 🔴 Fail | Hybrid · 🔴 Fail | Custom · 🔴 Fail | Custom · 🔵 Pass | — |
| AV1 + Opus / DASH VOD (WebM segments) | Custom · 🔴 Fail | Hybrid · 🔵 Pass | Custom · 🔴 Fail | Custom · 🔴 Fail | — |
| H.264 + AAC / HLS live (sliding window) | Native · 🔴 Fail | Hybrid · 🔵 Pass | Custom · 🔴 Fail | Custom · 🔴 Fail | — |

See [versions, evidence, and configured alternatives](docs/HEAD-TO-HEAD-ROUTES.md)
and the [rerun guide](docs/HEAD-TO-HEAD.md).

## Release and licensing

The repository root is intentionally `private: true` and cannot be published to
npm. `scripts/package-beta.py` assembles the publishable package; only the exact
verified release tarball is published, with the `beta` dist-tag. See
[the release procedure](docs/RELEASE.md).

The complete `demuxe` package is **GPL-3.0-or-later**. Original reusable core,
routing, standalone probes and research tooling use **Apache-2.0**;
original reports and result data use **CC BY 4.0**. Third-party
licenses stay separate. See [the boundary summary](LICENSING.md).

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
