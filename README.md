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

The table uses the recorded CPU campaign and its matching playback checks, plus catalogue playback screening for fidelity-limited rows excluded from that campaign. Detailed routes, historical outcomes and tested alternatives remain in the [complete-file catalogue](docs/HEAD-TO-HEAD-CATALOGUE.md).

Each row uses the lowest-median-CPU eligible player among the four as its reference: `100 × (leader median CPU − player median CPU) / leader median CPU`. The leader shows `(Pass)`; negative percentages mean higher CPU than the leader. Medians use three matched rounds. Only players with accepted matching measurements can lead; this is not a claim about unmeasured players or statistical superiority. Nonzero measured differences show percentages even when round ranges overlap. Every `(Pass)` is bold: it can mean the measured reference, equal measured median CPU, or successful playback without a valid CPU comparison. Bold `(Pass)` does not imply a tie or native decoding; reference identities and ranges remain in the report. `(Pass)*` means historical playback screening passed, but discrete surround or HDR/color fidelity remains unverified; no CPU gain is claimed. `(Fail)` means default playback correctness failed. N/A means no demonstrated playback result for this scope; it does not imply equal CPU. Green = Pass or lower CPU, orange = higher CPU, red = Fail, white = unavailable playback evidence. Pinned Chrome/macOS shared-host synthetic evidence; renderer counters do not certify equal physical smoothness. Native in the original ASS case includes the host ASS renderer.

[Raw values, ranges and exclusions](results/head-to-head/cpu-leader-reference-03/REPORT.md) · [Measurement protocol](docs/CPU-BASELINE.md).

| Media format | Native video | Demuxe (auto) | Movi | AVPlayer |
| --- | --- | --- | --- | --- |
| H.264 + AAC / MP4 | 🟠 (-8.1%) | **🟢 (Pass)** | 🔴 (Fail) | 🟠 (-87.6%) |
| H.264 + AAC / MKV | **🟢 (Pass)** | **🟢 (Pass)** | 🔴 (Fail) | 🟠 (-68.8%) |
| H.264 + PCM24 / MKV | **🟢 (Pass)** | 🟠 (-2.3%) | **🟢 (Pass)** | 🔴 (Fail) |
| H.264 + PCM24 / MKV + ASS | **🟢 (Pass)** | 🟠 (-60.0%) | 🔴 (Fail) | 🔴 (Fail) |
| H.264 + AAC 5.1 / MP4 | **🟢 (Pass)\*** | **🟢 (Pass)\*** | 🔴 (Fail) | **🟢 (Pass)\*** |
| H.264 + MP3 stereo / MP4 | **🟢 (Pass)** | 🟠 (-0.9%) | 🔴 (Fail) | 🟠 (-70.7%) |
| H.264 + AC-3 5.1 / MKV | 🔴 (Fail) | **🟢 (Pass)\*** | 🔴 (Fail) | **🟢 (Pass)\*** |
| H.264 + E-AC-3 5.1 / MKV | 🔴 (Fail) | **🟢 (Pass)\*** | 🔴 (Fail) | **🟢 (Pass)\*** |
| H.264 + DTS core 5.1 / MKV | 🔴 (Fail) | **🟢 (Pass)\*** | 🔴 (Fail) | **🟢 (Pass)\*** |
| H.264 + FLAC stereo / MKV | **🟢 (Pass)** | 🟠 (-2.7%) | 🔴 (Fail) | 🟠 (-55.0%) |
| H.264 + FLAC 5.1 / MKV | **🟢 (Pass)\*** | **🟢 (Pass)\*** | 🔴 (Fail) | **🟢 (Pass)\*** |
| H.264 + Opus stereo / MKV | 🟠 (-1.3%) | **🟢 (Pass)** | **🟢 (Pass)** | 🟠 (-62.3%) |
| H.264 + PCM16 stereo / MKV | 🟠 (-2.7%) | **🟢 (Pass)** | 🔴 (Fail) | 🔴 (Fail) |
| H.264 + PCM24 5.1 / MKV | **🟢 (Pass)\*** | **🟢 (Pass)\*** | **🟢 (Pass)\*** | 🔴 (Fail) |
| HEVC Main 8-bit + AAC / MP4 (hvc1) | 🟠 (-1.3%) | **🟢 (Pass)** | 🔴 (Fail) | 🟠 (-56.3%) |
| HEVC Main 8-bit + AAC / MP4 (hev1) | **🟢 (Pass)** | **🟢 (Pass)** | 🔴 (Fail) | 🟠 (-56.0%) |
| HEVC Main 10-bit SDR + AAC / MP4 | **🟢 (Pass)** | **🟢 (Pass)** | 🔴 (Fail) | 🟠 (-46.6%) |
| HEVC Main 10-bit SDR + AC-3 / MKV | 🔴 (Fail) | **🟢 (Pass)** | 🔴 (Fail) | 🟠 (-20.5%) |
| HEVC Main 10-bit SDR + E-AC-3 / MKV | 🔴 (Fail) | **🟢 (Pass)** | 🔴 (Fail) | 🟠 (-19.0%) |
| HEVC Main 10-bit SDR + DTS core / MKV | 🔴 (Fail) | **🟢 (Pass)** | 🔴 (Fail) | 🟠 (-26.7%) |
| AV1 8-bit + AAC / MP4 | **🟢 (Pass)** | 🟠 (-3.4%) | 🔴 (Fail) | 🟠 (-78.2%) |
| AV1 10-bit SDR + Opus / MKV | 🟠 (-1.7%) | **🟢 (Pass)** | 🔴 (Fail) | 🟠 (-62.5%) |
| AV1 + Opus / WebM | 🟠 (-0.0%) | **🟢 (Pass)** | 🔴 (Fail) | 🟠 (-66.4%) |
| VP9 8-bit + Opus / WebM | 🟠 (-9.5%) | **🟢 (Pass)** | 🔴 (Fail) | 🟠 (-74.0%) |
| VP9 10-bit SDR + Opus / WebM | 🟠 (-0.6%) | **🟢 (Pass)** | 🔴 (Fail) | 🔴 (Fail) |
| VP8 + Vorbis / WebM | **🟢 (Pass)** | 🟠 (-0.2%) | 🔴 (Fail) | 🟠 (-58.6%) |
| H.264 + AAC / MPEG-TS | 🔴 (Fail) | **🟢 (Pass)** | 🔴 (Fail) | 🟠 (-52.1%) |
| MPEG-2 video + AC-3 / MPEG-TS | 🔴 (Fail) | **🟢 (Pass)** | **🟢 (Pass)** | 🟠 (-7.7%) |
| MPEG-2 video + MP2 / MPEG-PS | 🔴 (Fail) | **🟢 (Pass)** | 🔴 (Fail) | 🔴 (Fail) |
| MPEG-4 Part 2 + MP3 / AVI | 🔴 (Fail) | **🟢 (Pass)** | 🔴 (Fail) | 🔴 (Fail) |
| ProRes + PCM / MOV | 🔴 (Fail) | **🟢 (Pass)** | 🔴 (Fail) | 🔴 (Fail) |
| H.264 + AAC / fragmented MP4 (single file) | 🟠 (-1.6%) | **🟢 (Pass)** | 🔴 (Fail) | 🔴 (Fail) |
| H.264 video-only / MP4 | **🟢 (Pass)** | 🟠 (-8.3%) | 🟠 (-79.2%) | 🟠 (-54.2%) |
| H.264 + AAC + embedded SRT / MKV | 🔴 (Fail) | **🟢 (Pass)** | 🔴 (Fail) | 🔴 (Fail) |
| H.264 + AAC + external WebVTT / MP4 | 🟠 (-0.6%) | **🟢 (Pass)** | 🔴 (Fail) | 🔴 (Fail) |
| H.264 + AAC + embedded mov_text / MP4 | 🔴 (Fail) | **🟢 (Pass)** | 🔴 (Fail) | 🔴 (Fail) |
| H.264 + AAC + styled ASS / MKV | 🔴 (Fail) | **🟢 (Pass)** | 🔴 (Fail) | 🔴 (Fail) |
| HEVC + AC-3 + PGS / MKV | 🔴 (Fail) | 🔴 (Fail) | 🔴 (Fail) | 🔴 (Fail) |
| H.264 + AC-3 + VobSub / MKV | 🔴 (Fail) | **🟢 (Pass)** | 🔴 (Fail) | 🔴 (Fail) |
| AAC audio-only / M4A | **🟢 (Pass)** | 🟠 (-3.5%) | **🟢 (Pass)** | 🟠 (-34.6%) |
| MP3 audio-only / MP3 | 🟠 (-1.5%) | **🟢 (Pass)** | **🟢 (Pass)** | 🔴 (Fail) |
| FLAC audio-only / FLAC | 🟠 (-7.3%) | **🟢 (Pass)** | **🟢 (Pass)** | 🟠 (-37.1%) |
| Opus audio-only / Ogg | **🟢 (Pass)** | 🟠 (-0.4%) | **🟢 (Pass)** | 🔴 (Fail) |
| Vorbis audio-only / Ogg | **🟢 (Pass)** | 🟠 (-5.8%) | **🟢 (Pass)** | 🔴 (Fail) |
| PCM16 audio-only / WAV | 🟠 (-3.7%) | **🟢 (Pass)** | **🟢 (Pass)** | 🔴 (Fail) |
| PCM24 audio-only / WAV | 🟠 (-0.5%) | **🟢 (Pass)** | **🟢 (Pass)** | 🔴 (Fail) |
| HEVC Main 10 + E-AC-3 / MKV (HDR10) | 🔴 (Fail) | **🟢 (Pass)\*** | 🔴 (Fail) | **🟢 (Pass)\*** |
| HEVC Main 10 + AAC / MP4 (HLG) | **🟢 (Pass)\*** | **🟢 (Pass)\*** | 🔴 (Fail) | **🟢 (Pass)\*** |
| AV1 10-bit + Opus / WebM (HDR10) | **🟢 (Pass)\*** | **🟢 (Pass)\*** | 🔴 (Fail) | **🟢 (Pass)\*** |
| HEVC + TrueHD 7.1 / MKV | ⚪ (N/A) | ⚪ (N/A) | ⚪ (N/A) | ⚪ (N/A) |
| HEVC + DTS-HD MA 7.1 / MKV | ⚪ (N/A) | ⚪ (N/A) | ⚪ (N/A) | ⚪ (N/A) |
| HEVC + E-AC-3 with Atmos metadata / MP4 | ⚪ (N/A) | ⚪ (N/A) | ⚪ (N/A) | ⚪ (N/A) |
| Dolby Vision profile 5 HEVC + E-AC-3 / MP4 | ⚪ (N/A) | ⚪ (N/A) | ⚪ (N/A) | ⚪ (N/A) |
| Dolby Vision profile 8.1 HEVC + E-AC-3 / MKV | ⚪ (N/A) | ⚪ (N/A) | ⚪ (N/A) | ⚪ (N/A) |
| H.264 + AAC / HLS VOD (TS segments) | 🟠 (-3.7%) | **🟢 (Pass)** | 🔴 (Fail) | 🔴 (Fail) |
| H.264 + AAC / HLS VOD (fMP4 segments) | 🟠 (-2.2%) | **🟢 (Pass)** | 🔴 (Fail) | 🟠 (-66.8%) |
| HEVC + AAC / HLS VOD (fMP4 segments) | **🟢 (Pass)** | **🟢 (Pass)** | 🔴 (Fail) | **🟢 (Pass)** |
| H.264 + AAC / DASH VOD (fMP4 segments) | 🔴 (Fail) | 🔴 (Fail) | 🔴 (Fail) | **🟢 (Pass)** |
| AV1 + Opus / DASH VOD (WebM segments) | 🔴 (Fail) | **🟢 (Pass)** | 🔴 (Fail) | 🔴 (Fail) |
| H.264 + AAC / HLS live (sliding window) | 🔴 (Fail) | **🟢 (Pass)** | 🔴 (Fail) | 🔴 (Fail) |

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
