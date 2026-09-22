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
keep their existing Direct/Remux/Hybrid/Software paths. Shaka loads only when its
plan is needed. See [streaming architecture](docs/STREAMING.md).

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
Hybrid, Software, audio adaptation, and the pthread Native remux runtime require cross-origin isolation headers:

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

## Representative head-to-head media evidence (default configurations)

This table records complete-file experiments, not an exhaustive compatibility
matrix. Use **[component capabilities](docs/CAPABILITIES.md)** to identify which
subsystem or requirement determines a route. The
[head-to-head catalogue](docs/HEAD-TO-HEAD-CATALOGUE.md) retains the demonstrated
combinations and their exact evidence.

The table uses the recorded CPU campaign and its matching playback checks, plus catalogue and real-bitstream playback screening for fidelity-limited rows excluded from that campaign. Detailed routes, historical outcomes and tested alternatives remain in the [complete-file catalogue](docs/HEAD-TO-HEAD-CATALOGUE.md).

**These are bounded playback tests, not a format-support scorecard.** Movi
0.4.0 and AVPlayer 1.3.1 are pinned versions. Their correctness cells below use
[fresh default and configured-route tests](results/head-to-head/configured-alternatives-20260921-report-04/REPORT.md).
CPU figures retain the earlier campaign; these reruns collected no new CPU data.

For Movi and AVPlayer, **🟣 configured pass** means an explicitly named alternative
passed while the default failed a named check. **🟠 Plays; … failed** means initial
audio/video checks passed before a later failure. **🔴 … failed** identifies a
check that failed before initial playback was verified. A failed check does not
establish an unsupported codec. The full report includes alternatives that made
results worse as well as better; configurations beyond those tested remain
unverified. The original PCM24 + ASS native-first alternative includes a host
libass renderer, not Movi's built-in ASS renderer.

The reruns corrected Movi subtitle-track setup/selection and audio observation
for detached media elements used by streaming wrappers. Movi default and
Shaka-first now pass all six streaming fixtures. Earlier records are retained;
the linked report identifies the corrected runs that supersede them.

The [AVPlayer accuracy audit](docs/HEAD-TO-HEAD-AVPLAYER.md) corrects an EOF
check that ran too early for timestamp-offset HLS/TS. It also distinguishes
partial fragmented-MP4 playback through full File input and WebVTT parsing
sensitivity from complete lifecycle passes. Named partial configurations are
not full passes.

Every numeric cell shows that player’s actual median CPU usage as a percentage of one CPU core (it can exceed 100%), not a relative gain. The **bold numeric cell** identifies the lowest measured median for that media case. Medians use three accepted matching rounds; this is not a claim about unmeasured players or statistical superiority. Orange numbers indicate higher measured CPU than the row’s reference; round ranges remain in the report. **Green (Pass)** means successful playback without a valid CPU measurement, not a tie or native decoding. `(Pass)*` means bounded playback screening passed, but discrete surround or HDR/color fidelity remains unverified; no CPU measurement is claimed. `(Fail)` means default playback correctness failed, not that the format is unsupported. N/A means no demonstrated playback result for this scope. Pinned Chrome/macOS evidence; supplemental real-bitstream screening is separate from the synthetic CPU campaign; renderer counters do not certify equal physical smoothness. Native in the original ASS case includes the host ASS renderer.

[Raw values, ranges and exclusions](results/head-to-head/cpu-specialist-usage-02/REPORT.md) · [Measurement protocol](docs/CPU-BASELINE.md).

The six HLS/DASH rows were rerun through the maintained streaming architecture in
[the Shaka migration catalogue](results/head-to-head/shaka-catalogue-01/REPORT.md).
Their older custom-route CPU numbers have been removed. Default HLS VOD uses
Native Direct on this Chrome platform; DASH and live HLS use `shaka-mse`.
Controlled Shaka and fallback comparisons are recorded separately in
[streaming qualification](docs/STREAMING-QUALIFICATION.md).
The fresh bounded comparison measured Shaka HLS fMP4 at 28.6% of one core versus
29.8% for plain Native, with overlapping ranges. AV1 DASH Shaka used 37.4% less
median CPU than Hybrid on the matched synthetic fixture. These controlled-route
measurements do not replace the default-route correctness labels below.

| Media format | Native video | Demuxe (auto) | Movi 0.4.0 (default) | AVPlayer 1.3.1 (default) |
| --- | --- | --- | --- | --- |
| H.264 + AAC / MP4 | 🟠 21.9% CPU | **🟢 20.2% CPU** | 🟣 Native-first pass; default EOF check failed | 🟠 38.0% CPU |
| H.264 + AAC / MKV | **🟢 (Pass)** | **🟢 22.1% CPU** | 🟣 Native-first pass; default EOF check failed | 🟠 37.3% CPU |
| H.264 + PCM24 / MKV | **🟢 21.2% CPU** | 🟠 21.7% CPU | **🟢 (Pass)** | 🔴 startup/audio check failed |
| H.264 + PCM24 / MKV + ASS | **🟢 23.6% CPU** | 🟠 37.8% CPU | 🟣 Native-first + host ASS pass; default subtitle check failed | 🔴 startup/audio check failed |
| H.264 + AAC 5.1 / MP4 | **🟢 (Pass)\*** | **🟢 (Pass)\*** | 🟣 Native-first pass\*; default seek check failed | **🟢 (Pass)\*** |
| H.264 + MP3 stereo / MP4 | **🟢 22.0% CPU** | 🟠 22.2% CPU | 🟣 Native-first pass; default EOF check failed | 🟠 37.5% CPU |
| H.264 + AC-3 5.1 / MKV | 🔴 (Fail) | **🟢 (Pass)\*** | 🟠 Plays; EOF check failed | **🟢 (Pass)\*** |
| H.264 + E-AC-3 5.1 / MKV | 🔴 (Fail) | **🟢 (Pass)\*** | 🟠 Plays; EOF check failed | **🟢 (Pass)\*** |
| H.264 + DTS core 5.1 / MKV | 🔴 (Fail) | **🟢 (Pass)\*** | 🟠 Plays; rate check failed | **🟢 (Pass)\*** |
| H.264 + FLAC stereo / MKV | **🟢 23.0% CPU** | 🟠 23.6% CPU | 🟣 Native-first pass; default EOF check failed | 🟠 35.7% CPU |
| H.264 + FLAC 5.1 / MKV | **🟢 (Pass)\*** | **🟢 (Pass)\*** | 🟣 Native-first pass\*; default seek check failed | **🟢 (Pass)\*** |
| H.264 + Opus stereo / MKV | 🟠 24.9% CPU | **🟢 24.5% CPU** | **🟢 (Pass)** | 🟠 39.8% CPU |
| H.264 + PCM16 stereo / MKV | 🟠 22.7% CPU | **🟢 22.1% CPU** | 🟣 Native-first pass; default EOF check failed | 🔴 startup/audio check failed |
| H.264 + PCM24 5.1 / MKV | **🟢 (Pass)\*** | **🟢 (Pass)\*** | **🟢 (Pass)\*** | 🔴 startup/audio check failed |
| HEVC Main 8-bit + AAC / MP4 (hvc1) | 🟠 23.6% CPU | **🟢 23.3% CPU** | 🟣 Native-first pass; default EOF check failed | 🟠 36.4% CPU |
| HEVC Main 8-bit + AAC / MP4 (hev1) | **🟢 (Pass)** | **🟢 22.5% CPU** | 🟣 Native-first pass; default EOF check failed | 🟠 35.0% CPU |
| HEVC Main 10-bit SDR + AAC / MP4 | **🟢 (Pass)** | **🟢 26.4% CPU** | 🟣 Native-first pass; default EOF check failed | 🟠 38.7% CPU |
| HEVC Main 10-bit SDR + AC-3 / MKV | 🔴 (Fail) | **🟢 32.2% CPU** | 🟠 Plays; EOF check failed | 🟠 38.8% CPU |
| HEVC Main 10-bit SDR + E-AC-3 / MKV | 🔴 (Fail) | **🟢 32.9% CPU** | 🟠 Plays; EOF check failed | 🟠 39.1% CPU |
| HEVC Main 10-bit SDR + DTS core / MKV | 🔴 (Fail) | **🟢 33.6% CPU** | 🟠 Plays; rate check failed | 🟠 42.6% CPU |
| AV1 8-bit + AAC / MP4 | **🟢 22.6% CPU** | 🟠 23.4% CPU | 🟣 Native-first pass; default EOF check failed | 🟠 40.4% CPU |
| AV1 10-bit SDR + Opus / MKV | 🟠 25.4% CPU | **🟢 25.0% CPU** | 🟣 Native-first pass; default EOF check failed | 🟠 40.6% CPU |
| AV1 + Opus / WebM | 🟠 23.6% CPU | **🟢 23.6% CPU** | 🟣 Native-first pass; default EOF check failed | 🟠 39.3% CPU |
| VP9 8-bit + Opus / WebM | 🟠 23.6% CPU | **🟢 21.5% CPU** | 🟣 Native-first pass; default EOF check failed | 🟠 37.5% CPU |
| VP9 10-bit SDR + Opus / WebM | 🟠 25.4% CPU | **🟢 25.3% CPU** | 🟣 Native-first pass; default EOF check failed | 🔴 open failed |
| VP8 + Vorbis / WebM | **🟢 21.9% CPU** | 🟠 21.9% CPU | 🟣 Native-first pass; default EOF check failed | 🟠 34.7% CPU |
| H.264 + AAC / MPEG-TS | 🔴 (Fail) | **🟢 25.5% CPU** | 🟠 Plays; rate check failed | 🟠 38.8% CPU |
| MPEG-2 video + AC-3 / MPEG-TS | 🔴 (Fail) | **🟢 (Pass)** | **🟢 35.0% CPU** | 🟠 37.7% CPU |
| MPEG-2 video + MP2 / MPEG-PS | 🔴 (Fail) | **🟢 (Pass)** | 🟠 Plays; seek check failed | 🟠 Plays; seek check failed |
| MPEG-4 Part 2 + MP3 / AVI | 🔴 (Fail) | **🟢 (Pass)** | 🔴 startup/audio check failed | 🟠 Plays; seek check failed |
| ProRes + PCM / MOV | 🔴 (Fail) | **🟢 (Pass)** | 🔴 startup/audio check failed | 🔴 open failed |
| H.264 + AAC / fragmented MP4 (single file) | 🟠 24.0% CPU | **🟢 23.6% CPU** | 🟣 Native-first pass; default EOF check failed | 🟠 Full File input plays; EOF check failed (default open failed) |
| H.264 video-only / MP4 | **🟢 20.8% CPU** | 🟠 22.6% CPU | 🟠 37.4% CPU | 🟠 32.1% CPU |
| H.264 + AAC + embedded SRT / MKV | 🔴 (Fail) | **🟢 (Pass)** | 🟠 Plays; subtitle check failed | 🟠 Plays; seek check failed |
| H.264 + AAC + external WebVTT / MP4 | 🟠 23.4% CPU | **🟢 23.3% CPU** | 🟣 Native-first pass; default subtitle check failed | 🔴 open failed |
| H.264 + AAC + embedded mov_text / MP4 | 🔴 (Fail) | **🟢 (Pass)** | 🟠 Plays; subtitle check failed | 🟠 Plays; seek check failed |
| H.264 + AAC + styled ASS / MKV | 🔴 (Fail) | **🟢 (Pass)** | 🟠 Plays; subtitle check failed | 🟠 Plays; seek check failed |
| HEVC + AC-3 + PGS / MKV | 🔴 (Fail) | 🔴 (Fail) | 🟠 Plays; subtitle check failed | 🟠 Plays; subtitle check failed |
| H.264 + AC-3 + VobSub / MKV | 🔴 (Fail) | **🟢 (Pass)** | 🟠 Plays; subtitle check failed | 🟠 Plays; subtitle check failed |
| AAC audio-only / M4A | **🟢 15.3% CPU** | 🟠 15.9% CPU | **🟢 (Pass)** | 🟠 20.7% CPU |
| MP3 audio-only / MP3 | 🟠 15.2% CPU | **🟢 14.9% CPU** | **🟢 (Pass)** | 🟠 Plays; seek check failed |
| FLAC audio-only / FLAC | 🟠 14.5% CPU | **🟢 13.5% CPU** | **🟢 (Pass)** | 🟠 18.5% CPU |
| Opus audio-only / Ogg | **🟢 15.9% CPU** | 🟠 15.9% CPU | **🟢 (Pass)** | 🟠 Plays; seek check failed |
| Vorbis audio-only / Ogg | **🟢 14.8% CPU** | 🟠 15.6% CPU | 🟣 Native-first pass; default seek check failed | 🟠 Plays; seek check failed |
| PCM16 audio-only / WAV | 🟠 15.9% CPU | **🟢 15.3% CPU** | **🟢 (Pass)** | 🔴 startup/audio check failed |
| PCM24 audio-only / WAV | 🟠 16.0% CPU | **🟢 15.9% CPU** | **🟢 (Pass)** | 🔴 open failed |
| HEVC Main 10 + E-AC-3 / MKV (HDR10) | 🔴 (Fail) | **🟢 (Pass)\*** | 🟠 Plays; EOF check failed | **🟢 (Pass)\*** |
| HEVC Main 10 + AAC / MP4 (HLG) | **🟢 (Pass)\*** | **🟢 (Pass)\*** | 🟣 Native-first pass\*; default EOF check failed | **🟢 (Pass)\*** |
| AV1 10-bit + Opus / WebM (HDR10) | **🟢 (Pass)\*** | **🟢 (Pass)\*** | 🟣 Native-first pass\*; default EOF check failed | **🟢 (Pass)\*** |
| HEVC + TrueHD 7.1 / MKV | 🔴 (Fail) | **🟢 (Pass)\*** | 🟠 Plays; rate check failed | 🔴 startup/audio check failed |
| HEVC + DTS-HD MA 7.1 / MKV | 🔴 (Fail) | **🟢 (Pass)\*** | 🟠 Plays; rate check failed | **🟢 (Pass)\*** |
| HEVC + E-AC-3 with Atmos metadata / MP4 | 🔴 (Fail) | **🟢 (Pass)\*** | 🟠 Plays; EOF check failed | 🟠 Plays; EOF check failed |
| Dolby Vision profile 5 HEVC + E-AC-3 / MP4 | 🔴 (Fail) | 🔴 (Fail) | 🟠 Plays; EOF check failed | **🟢 (Pass)\*** |
| Dolby Vision profile 8.1 HEVC + E-AC-3 / MKV | 🔴 (Fail) | 🔴 (Fail) | 🟠 Plays; EOF check failed | **🟢 (Pass)\*** |
| H.264 + AAC / HLS VOD (TS segments) | **🟢 (Pass)** | **🟢 (Pass)** | **🟢 (Pass)** | **🟢 (Pass)** |
| H.264 + AAC / HLS VOD (fMP4 segments) | **🟢 (Pass)** | **🟢 (Pass)** | **🟢 (Pass)** | **🟢 (Pass)** |
| HEVC + AAC / HLS VOD (fMP4 segments) | **🟢 (Pass)** | **🟢 (Pass)** | **🟢 (Pass)** | **🟢 (Pass)** |
| H.264 + AAC / DASH VOD (fMP4 segments) | 🔴 (Fail) | **🟢 (Pass)** | **🟢 (Pass)** | **🟢 (Pass)** |
| AV1 + Opus / DASH VOD (WebM segments) | 🔴 (Fail) | **🟢 (Pass)** | **🟢 (Pass)** | 🟠 Plays; seek check failed |
| H.264 + AAC / HLS live (sliding window) | 🔴 (Fail) | **🟢 (Pass)** | **🟢 (Pass)** | 🟠 Plays; live check failed |
| HEVC Main 10 + AAC / MKV | **🟢 (Pass)\*** | **🟢 (Pass)\*** | **🟢 (Pass)\*** | **🟢 (Pass)\*** |
| HEVC Main 10 + FLAC / MKV | **🟢 (Pass)\*** | **🟢 (Pass)\*** | 🟣 Native-first pass\*; default EOF check failed | **🟢 (Pass)\*** |
| HEVC Main 10 + Opus / MKV | **🟢 (Pass)\*** | **🟢 (Pass)\*** | 🟣 Native-first pass\*; default seek check failed | **🟢 (Pass)\*** |
| HEVC Main 10 + FLAC + ASS / MKV | 🔴 (Fail) | **🟢 (Pass)\*** | 🟠 Plays; subtitle check failed | 🟠 Plays; seek check failed |
| HEVC Main 10 + Opus + ASS / MKV | 🔴 (Fail) | **🟢 (Pass)\*** | 🟠 Plays; subtitle check failed | 🟠 Plays; seek check failed |
| HEVC Main 10 HDR10 + TrueHD 7.1 + PGS / MKV | 🔴 (Fail) | 🔴 (Fail) | 🟠 Plays; subtitle check failed | 🔴 startup/audio check failed |
| HEVC Main 10 HDR10 + DTS-HD MA 7.1 + PGS / MKV | 🔴 (Fail) | 🔴 (Fail) | 🟠 Plays; subtitle check failed | 🟠 Plays; subtitle check failed |
| Dolby Vision profile 5 + E-AC-3/Atmos + ASS / MKV | 🔴 (Fail) | 🔴 (Fail) | 🟠 Plays; subtitle check failed | 🟠 Plays; seek check failed |
| Dolby Vision profile 8.1 + E-AC-3/Atmos + ASS / MKV | 🔴 (Fail) | 🔴 (Fail) | 🟠 Plays; subtitle check failed | 🟠 Plays; seek check failed |

See [versions, evidence, and configured alternatives](docs/HEAD-TO-HEAD-ROUTES.md)
and the [rerun guide](docs/HEAD-TO-HEAD.md).

The [specialist and library screen](results/head-to-head/specialist-report-01/REPORT.md) also tests explicit Software mode: all four Dolby Vision combinations pass its bounded playback checks, despite failing automatic selection or Hybrid lifecycle checks above. This does not qualify Dolby Vision color or Atmos object rendering. Both HDR10+PGS combinations still lose subtitles after seeking in Hybrid and Software.

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

Playback tier promotion, opt-in Native + mpv subtitles, and bounded background preparation are documented in [Playback tier policy](docs/PLAYBACK-TIER-POLICY.md). The new subtitle route remains opt-in pending broader Firefox seek qualification.
