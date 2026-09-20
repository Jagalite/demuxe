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

The original four combinations and all 56 additional combinations now have recorded
outcomes. Expanded base run: **2026-09-19, Chrome 152, headless**; linked route follow-ups include headed runs.
**Screen only** means playback checks passed but surround/HDR fidelity remains
unqualified. **Blocked** identifies unavailable fixtures, engines, or checks.
These are bounded synthetic tests, not universal support guarantees. **Cross-player CPU baseline:** the values below compare Demuxe separately against each player; N/A means no qualified comparison. See [evidence and limitations](docs/HEAD-TO-HEAD-CATALOGUE.md) and
[the original Hybrid audit](docs/HEAD-TO-HEAD-HYBRID.md).
[Component routing and paired before/after measurements](docs/COMPONENT-ROUTING.md) track the later WebVTT change.

**Legend:** 🟢 Native-path pass · 🔵 Other-path pass · 🟣 Default failed; tested alternative passed · 🔴 Fail · 🟡 Screen only (fidelity unqualified) · ⚪ Blocked (not tested)

**CPU gain order:** Native video / Movi / AVPlayer. `100 × (baseline CPU − Demuxe CPU) / baseline CPU`; positive means lower Demuxe CPU, negative means higher. Values are medians of three matched-round reductions on a shared host; N/A is not zero. [Raw CPU baseline, ranges and exclusions](results/head-to-head/cpu-baseline-report-02/REPORT.md) · [Measurement protocol and limits](docs/CPU-BASELINE.md).

| Media format | Native video | Demuxe (auto) | Movi | AVPlayer | CPU gain % |
| --- | --- | --- | --- | --- | --- |
| H.264 + AAC / MP4 | Native · 🟢 Pass | Native · 🟢 Pass | Custom · 🟣 Fail; native-first pass | Custom · 🔵 Pass | +7.5% / N/A / +42.9% |
| H.264 + AAC / MKV | Native · 🟢 Pass | Native · 🟢 Pass | Custom · 🟣 Fail; native-first pass | Custom · 🔵 Pass | N/A / N/A / +41.4% |
| H.264 + PCM24 / MKV | Native · 🟢 Pass | Native · 🟢 Pass | Custom · 🔵 Pass | Custom · 🔴 Fail | -2.3% / N/A / N/A |
| H.264 + PCM24 / MKV + ASS | Native + host ASS · 🟢 Pass | Hybrid · 🔵 Pass | Custom · 🟣 Fail; native-first + host ASS pass | Custom · 🔴 Fail | -72.9% / N/A / N/A |
| H.264 + AAC 5.1 / MP4 | Native · 🟡 Screen only | Native · 🟡 Screen only | Custom · 🔴 Fail | Custom · 🟡 Screen only | N/A / N/A / N/A |
| H.264 + MP3 stereo / MP4 | Native · 🟢 Pass | Native · 🟢 Pass | Custom · 🔴 Fail | Custom · 🔵 Pass | -0.9% / N/A / +39.0% |
| H.264 + AC-3 5.1 / MKV | Native · 🔴 Fail | Hybrid · 🟡 Screen only | Custom · 🔴 Fail | Custom · 🟡 Screen only | N/A / N/A / N/A |
| H.264 + E-AC-3 5.1 / MKV | Native · 🔴 Fail | Hybrid · 🟡 Screen only | Custom · 🔴 Fail | Custom · 🟡 Screen only | N/A / N/A / N/A |
| H.264 + DTS core 5.1 / MKV | Native · 🔴 Fail | Hybrid · 🟡 Screen only | Custom · 🔴 Fail | Custom · 🟡 Screen only | N/A / N/A / N/A |
| H.264 + FLAC stereo / MKV | Native · 🟢 Pass | Native · 🟢 Pass | Custom · 🔴 Fail | Custom · 🔵 Pass | -3.5% / N/A / +33.7% |
| H.264 + FLAC 5.1 / MKV | Native · 🟡 Screen only | Native · 🟡 Screen only | Custom · 🔴 Fail | Custom · 🟡 Screen only | N/A / N/A / N/A |
| H.264 + Opus stereo / MKV | Native · 🟢 Pass | Native · 🟢 Pass | Custom · 🔵 Pass | Custom · 🔵 Pass | +3.3% / N/A / +39.3% |
| H.264 + PCM16 stereo / MKV | Native · 🟢 Pass | Native · 🟢 Pass | Custom · 🔵 Pass | Custom · 🔴 Fail | +1.9% / N/A / N/A |
| H.264 + PCM24 5.1 / MKV | Native · 🟡 Screen only | Native · 🟡 Screen only | Custom · 🟡 Screen only | Custom · 🔴 Fail | N/A / N/A / N/A |
| HEVC Main 8-bit + AAC / MP4 (hvc1) | Native · 🟢 Pass | Native · 🟢 Pass | Custom · 🔴 Fail | Custom · 🔵 Pass | +2.5% / N/A / +36.0% |
| HEVC Main 8-bit + AAC / MP4 (hev1) | Native · 🟢 Pass | Native · 🟢 Pass | Custom · 🔴 Fail | Custom · 🔵 Pass | N/A / N/A / +34.3% |
| HEVC Main 10-bit SDR + AAC / MP4 | Native · 🟢 Pass | Native · 🟢 Pass | Custom · 🔴 Fail | Custom · 🔵 Pass | N/A / N/A / +33.8% |
| HEVC Main 10-bit SDR + AC-3 / MKV | Native · 🔴 Fail | Hybrid · 🔵 Pass | Custom · 🔴 Fail | Custom · 🔵 Pass | N/A / N/A / +17.0% |
| HEVC Main 10-bit SDR + E-AC-3 / MKV | Native · 🔴 Fail | Hybrid · 🔵 Pass | Custom · 🔴 Fail | Custom · 🔵 Pass | N/A / N/A / +16.3% |
| HEVC Main 10-bit SDR + DTS core / MKV | Native · 🔴 Fail | Hybrid · 🔵 Pass | Custom · 🔴 Fail | Custom · 🔵 Pass | N/A / N/A / +20.7% |
| AV1 8-bit + AAC / MP4 | Native · 🟢 Pass | Native · 🟢 Pass | Custom · 🔴 Fail | Custom · 🔵 Pass | -4.1% / N/A / +38.9% |
| AV1 10-bit SDR + Opus / MKV | Native · 🟢 Pass | Native · 🟢 Pass | Custom · 🔴 Fail | Custom · 🔵 Pass | +1.6% / N/A / +35.1% |
| AV1 + Opus / WebM | Native · 🟢 Pass | Native · 🟢 Pass | Custom · 🔴 Fail | Custom · 🔵 Pass | +0.0% / N/A / +38.6% |
| VP9 8-bit + Opus / WebM | Native · 🟢 Pass | Native · 🟢 Pass | Custom · 🔴 Fail | Custom · 🔵 Pass | +4.8% / N/A / +42.5% |
| VP9 10-bit SDR + Opus / WebM | Native · 🟢 Pass | Native · 🟢 Pass | Custom · 🔴 Fail | Unknown · 🔴 Fail | +0.6% / N/A / N/A |
| VP8 + Vorbis / WebM | Native · 🟢 Pass | Native · 🟢 Pass | Custom · 🔴 Fail | Custom · 🔵 Pass | +1.8% / N/A / +39.2% |
| H.264 + AAC / MPEG-TS | Custom · 🔴 Fail | Native remux · 🟢 Pass | Custom · 🔴 Fail | Custom · 🔵 Pass | N/A / N/A / +36.9% |
| MPEG-2 video + AC-3 / MPEG-TS | Custom · 🔴 Fail | Software · 🔵 Pass | Custom · 🔵 Pass | Custom · 🔵 Pass | N/A / N/A / N/A |
| MPEG-2 video + MP2 / MPEG-PS | Custom · 🔴 Fail | Software · 🔵 Pass | Custom · 🔴 Fail | Custom · 🔴 Fail | N/A / N/A / N/A |
| MPEG-4 Part 2 + MP3 / AVI | Custom · 🔴 Fail | Software · 🔵 Pass | Custom · 🔴 Fail | Custom · 🔴 Fail | N/A / N/A / N/A |
| ProRes + PCM / MOV | Native · 🔴 Fail | Software · 🔵 Pass | Custom · 🔴 Fail | Custom · 🔴 Fail | N/A / N/A / N/A |
| H.264 + AAC / fragmented MP4 (single file) | Native · 🟢 Pass | Native · 🟢 Pass | Custom · 🔴 Fail | Custom · 🔴 Fail | -1.0% / N/A / N/A |
| H.264 video-only / MP4 | Native · 🟢 Pass | Native · 🟢 Pass | Custom · 🔵 Pass | Custom · 🔵 Pass | -8.3% / +37.8% / +29.7% |
| H.264 + AAC + embedded SRT / MKV | Native · 🔴 Fail | Hybrid · 🔵 Pass | Custom · 🔴 Fail | Custom · 🔴 Fail | N/A / N/A / N/A |
| H.264 + AAC + external WebVTT / MP4 | Native · 🟢 Pass | Native · 🟢 Pass | Custom · 🔴 Fail | Custom · 🔴 Fail | -0.4% / N/A / N/A |
| H.264 + AAC + embedded mov_text / MP4 | Native · 🔴 Fail | Hybrid · 🔵 Pass | Custom · 🔴 Fail | Custom · 🔴 Fail | N/A / N/A / N/A |
| H.264 + AAC + styled ASS / MKV | Native · 🔴 Fail | Hybrid · 🔵 Pass | Custom · 🔴 Fail | Custom · 🔴 Fail | N/A / N/A / N/A |
| HEVC + AC-3 + PGS / MKV | Native · 🔴 Fail | Hybrid · 🔴 Fail | Custom · 🔴 Fail | Custom · 🔴 Fail | N/A / N/A / N/A |
| H.264 + AC-3 + VobSub / MKV | Native · 🔴 Fail | Hybrid · 🔵 Pass | Custom · 🔴 Fail | Custom · 🔴 Fail | N/A / N/A / N/A |
| AAC audio-only / M4A | Native · 🟢 Pass | Native · 🟢 Pass | Custom · 🔵 Pass | Custom · 🔵 Pass | -3.6% / N/A / +27.0% |
| MP3 audio-only / MP3 | Native · 🟢 Pass | Native · 🟢 Pass | Custom · 🔵 Pass | Custom · 🔴 Fail | +1.7% / N/A / N/A |
| FLAC audio-only / FLAC | Native · 🟢 Pass | Native · 🟢 Pass | Custom · 🔵 Pass | Custom · 🔵 Pass | +6.8% / N/A / +28.3% |
| Opus audio-only / Ogg | Native · 🟢 Pass | Native · 🟢 Pass | Custom · 🔵 Pass | Custom · 🔴 Fail | -2.0% / N/A / N/A |
| Vorbis audio-only / Ogg | Native · 🟢 Pass | Native · 🟢 Pass | Custom · 🔴 Fail | Custom · 🔴 Fail | -3.5% / N/A / N/A |
| PCM16 audio-only / WAV | Native · 🟢 Pass | Native · 🟢 Pass | Custom · 🔵 Pass | Custom · 🔴 Fail | +0.7% / N/A / N/A |
| PCM24 audio-only / WAV | Native · 🟢 Pass | Native · 🟢 Pass | Custom · 🔵 Pass | Unknown · 🔴 Fail | +6.6% / N/A / N/A |
| HEVC Main 10 + E-AC-3 / MKV (HDR10) | Native · 🔴 Fail | Hybrid · 🟡 Screen only | Custom · 🔴 Fail | Custom · 🟡 Screen only | N/A / N/A / N/A |
| HEVC Main 10 + AAC / MP4 (HLG) | Native · 🟡 Screen only | Native · 🟡 Screen only | Custom · 🔴 Fail | Custom · 🟡 Screen only | N/A / N/A / N/A |
| AV1 10-bit + Opus / WebM (HDR10) | Native · 🟡 Screen only | Native · 🟡 Screen only | Custom · 🔴 Fail | Custom · 🟡 Screen only | N/A / N/A / N/A |
| HEVC + TrueHD 7.1 / MKV | ⚪ Blocked (fixture) | ⚪ Blocked (fixture) | ⚪ Blocked (fixture) | ⚪ Blocked (fixture) | N/A / N/A / N/A |
| HEVC + DTS-HD MA 7.1 / MKV | ⚪ Blocked (fixture) | ⚪ Blocked (fixture) | ⚪ Blocked (fixture) | ⚪ Blocked (fixture) | N/A / N/A / N/A |
| HEVC + E-AC-3 with Atmos metadata / MP4 | ⚪ Blocked (fixture) | ⚪ Blocked (fixture) | ⚪ Blocked (fixture) | ⚪ Blocked (fixture) | N/A / N/A / N/A |
| Dolby Vision profile 5 HEVC + E-AC-3 / MP4 | ⚪ Blocked (fixture) | ⚪ Blocked (fixture) | ⚪ Blocked (fixture) | ⚪ Blocked (fixture) | N/A / N/A / N/A |
| Dolby Vision profile 8.1 HEVC + E-AC-3 / MKV | ⚪ Blocked (fixture) | ⚪ Blocked (fixture) | ⚪ Blocked (fixture) | ⚪ Blocked (fixture) | N/A / N/A / N/A |
| H.264 + AAC / HLS VOD (TS segments) | Native · 🟢 Pass | Native · 🟢 Pass | Custom · 🔴 Fail | Custom · 🔴 Fail | +4.4% / N/A / N/A |
| H.264 + AAC / HLS VOD (fMP4 segments) | Native · 🟢 Pass | Native · 🟢 Pass | Custom · 🔴 Fail | Custom · 🔵 Pass | +1.6% / N/A / +40.2% |
| HEVC + AAC / HLS VOD (fMP4 segments) | Native · 🟢 Pass | Native · 🟢 Pass | Custom · 🔴 Fail | Custom · 🔵 Pass | N/A / N/A / N/A |
| H.264 + AAC / DASH VOD (fMP4 segments) | Custom · 🔴 Fail | Hybrid · 🔴 Fail | Custom · 🔴 Fail | Custom · 🔵 Pass | N/A / N/A / N/A |
| AV1 + Opus / DASH VOD (WebM segments) | Custom · 🔴 Fail | Hybrid · 🔵 Pass | Custom · 🔴 Fail | Custom · 🔴 Fail | N/A / N/A / N/A |
| H.264 + AAC / HLS live (sliding window) | Native · 🔴 Fail | Hybrid · 🔵 Pass | Custom · 🔴 Fail | Custom · 🔴 Fail | N/A / N/A / N/A |

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
