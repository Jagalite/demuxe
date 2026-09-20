<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Demuxe

Demuxe is a browser media playback runtime that automatically chooses the least
expensive correct playback path: native browser playback, progressive remuxing,
WebCodecs-assisted hybrid playback, or FFmpeg/mpv software decoding.

The three public modes are **native**, **hybrid**, and **software**. Remuxing is
part of Native, not a fourth mode. This is a developer beta with representative
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

## Representative head-to-head media evidence

This table records complete-file experiments, not an exhaustive compatibility
matrix. Use **[component capabilities](docs/CAPABILITIES.md)** to identify which
subsystem or requirement determines a route. The
[head-to-head catalogue](docs/HEAD-TO-HEAD-CATALOGUE.md) retains the demonstrated
combinations and their exact evidence.

The table uses the recorded CPU campaign and its matching playback checks. Detailed routes, historical outcomes and tested alternatives remain in the [complete-file catalogue](docs/HEAD-TO-HEAD-CATALOGUE.md).

Each player is compared with native video: `100 × (native CPU − player CPU) / native CPU`. Positive means lower CPU; negative means higher. Medians use three matched rounds. `(Pass)` means the round range includes zero, not proven equivalence; native is its own reference. `(Fail)` means default playback correctness failed. N/A includes absent or rejected performance evidence; it does not imply equal CPU. Green = lower CPU, orange = higher, blue = Pass, red = Fail, yellow = fidelity-limited, white = unavailable comparison. Pinned Chrome/macOS shared-host synthetic evidence; renderer counters do not certify equal physical smoothness. Native in the original ASS case includes the host ASS renderer.

[Raw values, ranges and exclusions](results/head-to-head/cpu-native-reference-01/REPORT.md) · [Measurement protocol](docs/CPU-BASELINE.md).

| Media format | Native video | Demuxe (auto) | Movi | AVPlayer |
| --- | --- | --- | --- | --- |
| H.264 + AAC / MP4 | 🔵 (Pass) | 🟢 (+7.5%) | 🔴 (Fail) | 🟠 (-64.3%) |
| H.264 + AAC / MKV | ⚪ (N/A) | ⚪ (N/A) | 🔴 (Fail) | ⚪ (N/A) |
| H.264 + PCM24 / MKV | 🔵 (Pass) | 🟠 (-2.3%) | ⚪ (N/A) | 🔴 (Fail) |
| H.264 + PCM24 / MKV + ASS | 🔵 (Pass) | 🟠 (-72.9%) | 🔴 (Fail) | 🔴 (Fail) |
| H.264 + AAC 5.1 / MP4 | 🟡 (N/A) | 🟡 (N/A) | 🟡 (N/A) | 🟡 (N/A) |
| H.264 + MP3 stereo / MP4 | 🔵 (Pass) | 🔵 (Pass) | 🔴 (Fail) | 🟠 (-65.3%) |
| H.264 + AC-3 5.1 / MKV | 🟡 (N/A) | 🟡 (N/A) | 🟡 (N/A) | 🟡 (N/A) |
| H.264 + E-AC-3 5.1 / MKV | 🟡 (N/A) | 🟡 (N/A) | 🟡 (N/A) | 🟡 (N/A) |
| H.264 + DTS core 5.1 / MKV | 🟡 (N/A) | 🟡 (N/A) | 🟡 (N/A) | 🟡 (N/A) |
| H.264 + FLAC stereo / MKV | 🔵 (Pass) | 🔵 (Pass) | 🔴 (Fail) | 🟠 (-56.9%) |
| H.264 + FLAC 5.1 / MKV | 🟡 (N/A) | 🟡 (N/A) | 🟡 (N/A) | 🟡 (N/A) |
| H.264 + Opus stereo / MKV | 🔵 (Pass) | 🔵 (Pass) | ⚪ (N/A) | 🟠 (-59.4%) |
| H.264 + PCM16 stereo / MKV | 🔵 (Pass) | 🔵 (Pass) | 🔴 (Fail) | 🔴 (Fail) |
| H.264 + PCM24 5.1 / MKV | 🟡 (N/A) | 🟡 (N/A) | 🟡 (N/A) | 🟡 (N/A) |
| HEVC Main 8-bit + AAC / MP4 (hvc1) | 🔵 (Pass) | 🔵 (Pass) | 🔴 (Fail) | 🟠 (-56.7%) |
| HEVC Main 8-bit + AAC / MP4 (hev1) | ⚪ (N/A) | ⚪ (N/A) | 🔴 (Fail) | ⚪ (N/A) |
| HEVC Main 10-bit SDR + AAC / MP4 | ⚪ (N/A) | ⚪ (N/A) | 🔴 (Fail) | ⚪ (N/A) |
| HEVC Main 10-bit SDR + AC-3 / MKV | 🔴 (Fail) | ⚪ (N/A) | 🔴 (Fail) | ⚪ (N/A) |
| HEVC Main 10-bit SDR + E-AC-3 / MKV | 🔴 (Fail) | ⚪ (N/A) | 🔴 (Fail) | ⚪ (N/A) |
| HEVC Main 10-bit SDR + DTS core / MKV | 🔴 (Fail) | ⚪ (N/A) | 🔴 (Fail) | ⚪ (N/A) |
| AV1 8-bit + AAC / MP4 | 🔵 (Pass) | 🔵 (Pass) | 🔴 (Fail) | 🟠 (-78.2%) |
| AV1 10-bit SDR + Opus / MKV | 🔵 (Pass) | 🔵 (Pass) | 🔴 (Fail) | 🟠 (-58.6%) |
| AV1 + Opus / WebM | 🔵 (Pass) | 🔵 (Pass) | 🔴 (Fail) | 🟠 (-76.2%) |
| VP9 8-bit + Opus / WebM | 🔵 (Pass) | 🟢 (+4.8%) | 🔴 (Fail) | 🟠 (-62.1%) |
| VP9 10-bit SDR + Opus / WebM | 🔵 (Pass) | 🔵 (Pass) | 🔴 (Fail) | 🔴 (Fail) |
| VP8 + Vorbis / WebM | 🔵 (Pass) | 🔵 (Pass) | 🔴 (Fail) | 🟠 (-61.2%) |
| H.264 + AAC / MPEG-TS | 🔴 (Fail) | ⚪ (N/A) | 🔴 (Fail) | ⚪ (N/A) |
| MPEG-2 video + AC-3 / MPEG-TS | 🔴 (Fail) | ⚪ (N/A) | ⚪ (N/A) | ⚪ (N/A) |
| MPEG-2 video + MP2 / MPEG-PS | 🔴 (Fail) | ⚪ (N/A) | 🔴 (Fail) | 🔴 (Fail) |
| MPEG-4 Part 2 + MP3 / AVI | 🔴 (Fail) | ⚪ (N/A) | 🔴 (Fail) | 🔴 (Fail) |
| ProRes + PCM / MOV | 🔴 (Fail) | ⚪ (N/A) | 🔴 (Fail) | 🔴 (Fail) |
| H.264 + AAC / fragmented MP4 (single file) | 🔵 (Pass) | 🔵 (Pass) | 🔴 (Fail) | 🔴 (Fail) |
| H.264 video-only / MP4 | 🔵 (Pass) | 🟠 (-8.3%) | 🟠 (-74.1%) | 🟠 (-54.2%) |
| H.264 + AAC + embedded SRT / MKV | 🔴 (Fail) | ⚪ (N/A) | 🔴 (Fail) | 🔴 (Fail) |
| H.264 + AAC + external WebVTT / MP4 | 🔵 (Pass) | 🔵 (Pass) | 🔴 (Fail) | 🔴 (Fail) |
| H.264 + AAC + embedded mov_text / MP4 | 🔴 (Fail) | ⚪ (N/A) | 🔴 (Fail) | 🔴 (Fail) |
| H.264 + AAC + styled ASS / MKV | 🔴 (Fail) | ⚪ (N/A) | 🔴 (Fail) | 🔴 (Fail) |
| HEVC + AC-3 + PGS / MKV | 🔴 (Fail) | 🔴 (Fail) | 🔴 (Fail) | 🔴 (Fail) |
| H.264 + AC-3 + VobSub / MKV | 🔴 (Fail) | ⚪ (N/A) | 🔴 (Fail) | 🔴 (Fail) |
| AAC audio-only / M4A | 🔵 (Pass) | 🔵 (Pass) | ⚪ (N/A) | 🟠 (-28.8%) |
| MP3 audio-only / MP3 | 🔵 (Pass) | 🔵 (Pass) | ⚪ (N/A) | 🔴 (Fail) |
| FLAC audio-only / FLAC | 🔵 (Pass) | 🟢 (+6.8%) | ⚪ (N/A) | 🟠 (-29.6%) |
| Opus audio-only / Ogg | 🔵 (Pass) | 🔵 (Pass) | ⚪ (N/A) | 🔴 (Fail) |
| Vorbis audio-only / Ogg | 🔵 (Pass) | 🟠 (-3.5%) | ⚪ (N/A) | 🔴 (Fail) |
| PCM16 audio-only / WAV | 🔵 (Pass) | 🔵 (Pass) | ⚪ (N/A) | 🔴 (Fail) |
| PCM24 audio-only / WAV | 🔵 (Pass) | 🔵 (Pass) | ⚪ (N/A) | 🔴 (Fail) |
| HEVC Main 10 + E-AC-3 / MKV (HDR10) | 🟡 (N/A) | 🟡 (N/A) | 🟡 (N/A) | 🟡 (N/A) |
| HEVC Main 10 + AAC / MP4 (HLG) | 🟡 (N/A) | 🟡 (N/A) | 🟡 (N/A) | 🟡 (N/A) |
| AV1 10-bit + Opus / WebM (HDR10) | 🟡 (N/A) | 🟡 (N/A) | 🟡 (N/A) | 🟡 (N/A) |
| HEVC + TrueHD 7.1 / MKV | ⚪ (N/A) | ⚪ (N/A) | ⚪ (N/A) | ⚪ (N/A) |
| HEVC + DTS-HD MA 7.1 / MKV | ⚪ (N/A) | ⚪ (N/A) | ⚪ (N/A) | ⚪ (N/A) |
| HEVC + E-AC-3 with Atmos metadata / MP4 | ⚪ (N/A) | ⚪ (N/A) | ⚪ (N/A) | ⚪ (N/A) |
| Dolby Vision profile 5 HEVC + E-AC-3 / MP4 | ⚪ (N/A) | ⚪ (N/A) | ⚪ (N/A) | ⚪ (N/A) |
| Dolby Vision profile 8.1 HEVC + E-AC-3 / MKV | ⚪ (N/A) | ⚪ (N/A) | ⚪ (N/A) | ⚪ (N/A) |
| H.264 + AAC / HLS VOD (TS segments) | 🔵 (Pass) | 🟢 (+4.4%) | 🔴 (Fail) | 🔴 (Fail) |
| H.264 + AAC / HLS VOD (fMP4 segments) | 🔵 (Pass) | 🔵 (Pass) | 🔴 (Fail) | 🟠 (-64.5%) |
| HEVC + AAC / HLS VOD (fMP4 segments) | ⚪ (N/A) | ⚪ (N/A) | 🔴 (Fail) | ⚪ (N/A) |
| H.264 + AAC / DASH VOD (fMP4 segments) | 🔴 (Fail) | 🔴 (Fail) | 🔴 (Fail) | ⚪ (N/A) |
| AV1 + Opus / DASH VOD (WebM segments) | 🔴 (Fail) | ⚪ (N/A) | 🔴 (Fail) | 🔴 (Fail) |
| H.264 + AAC / HLS live (sliding window) | 🔴 (Fail) | ⚪ (N/A) | 🔴 (Fail) | 🔴 (Fail) |

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
