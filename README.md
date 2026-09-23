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

## Representative head-to-head media evidence (default routes plus forced Software)

This table records complete-file experiments, not an exhaustive compatibility
matrix. Use **[component capabilities](docs/CAPABILITIES.md)** to identify which
subsystem or requirement determines a route. The
[head-to-head catalogue](docs/HEAD-TO-HEAD-CATALOGUE.md) retains the demonstrated
combinations and their exact evidence.

The **Demuxe (auto)** column records automatic plan selection. The separately
recorded **Demuxe (forced software)** lane pins each media case to
`mode: 'software'`. Its [60-case correctness run](results/head-to-head/demuxe-software-matrix-20260922-02/REPORT.md)
recorded 46 passes, no failures and 14 screen or fixture blocks. The [14-case
specialist screen](results/head-to-head/demuxe-software-specialists-20260922-01/REPORT.md)
passed all cases; five prepared fixtures cover blocked base attempts, and nine
add specialist rows. Together they cover the 69 originally catalogued cases. A
separate [H.264/AAC bitmap-subtitle screen](results/head-to-head/demuxe-software-bitmap-isolation-20260923-01/REPORT.md)
passed VobSub through its seeks; PGS displayed initially but lost its subtitle
after seeking.

The [forced software CPU report](results/head-to-head/demuxe-software-performance-20260922-02/CPU-REPORT.md)
contains 45 accepted three-round medians. The live HLS correctness screen passed
bounded window progression, while two of its three 20-second CPU windows stopped
advancing and were excluded. Software CPU values come from a separate campaign,
so they are descriptive and do not enter the matched-lane bold minimums below.

The [exploratory pass-cell CPU report](results/head-to-head/passing-cell-cpu-exploratory-20260923-01/measurement/CPU-REPORT.md) adds readings to 100 of the 111 green pass cells that previously lacked CPU values, including all 47 Pass* cells. Three CPU-only rounds were attempted per cell without applying content-fidelity checks. Ninety-three cells have at least one accepted steady-window median (90 have three accepted rounds); seven more have only stalled-window readings, and 11 could not be measured because their source fixture was unavailable. † marks the median of 1–3 full, focused CPU windows advancing at approximately 1×; ‡ marks full stable CPU windows that stalled and must not be read as steady-playback cost. Historical playback labels remain unchanged.

The forced-software column shows one-core CPU medians for 45 cases with three
accepted measurement rounds. Other rows show a bounded pass or a failed check. See
the linked reports for correctness limits and exact outcomes. Detailed routes,
historical outcomes and tested alternatives remain in the [complete-file
catalogue](docs/HEAD-TO-HEAD-CATALOGUE.md).

**These are bounded playback tests, not a format-support scorecard.** Movi
0.4.0 and AVPlayer 1.3.1 are pinned versions. Their correctness cells below use
[fresh default and configured-route tests](results/head-to-head/configured-alternatives-20260921-report-04/REPORT.md).
This supplemental campaign adds CPU values only to previously blank green pass cells; existing CPU values remain from their original campaigns. Except for the PCM24+ASS follow-up below, previously measured Demuxe auto and competitor values retain the earlier campaign; configured competitor reruns collected no CPU data. Forced software CPU values elsewhere are from the separate campaign linked above.

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

Every numeric cell shows median CPU usage as a percentage of one Chrome process-family core (it can exceed 100%), not a relative gain. The **bold numeric cell** identifies the lowest median among lanes from the same matched campaign. Exploratory †/‡ readings do not enter that ranking. Existing matched medians use three accepted rounds; this is not a claim about unmeasured players or statistical superiority. † marks the separate pass-cell campaign: median of 1–3 focused, stable-process 20-second windows that advanced at approximately 1×. ‡ marks a median from full, focused stable-process CPU windows that stalled instead of advancing at approximately 1×; it is a measured stalled window, not steady-playback CPU. Round counts, ranges and records are in the linked CPU report. **Green (Pass)** preserves the historical bounded-playback result; supplemental CPU windows did not rerun its content-fidelity checks. `(Pass)*` marks the historical bounded screen with its stated fidelity, profile or duration limit. `(Fail)` means that lane’s playback correctness check failed; it does not establish an unsupported format. N/A means no demonstrated playback result for this scope. Pinned Chrome/macOS evidence; supplemental real-bitstream screening is separate; renderer counters do not certify equal physical smoothness. Native in the original ASS case includes the host ASS renderer.

The embedded SRT and styled ASS Demuxe CPU cells come from a newer matched
Native + mpv versus forced Hybrid campaign. Their other-player cells retain
the separately cited historical screens; those CPU numbers are not a matched
cross-player ranking for the new route.

[Raw values, ranges and exclusions](results/head-to-head/cpu-specialist-usage-02/REPORT.md) · [Measurement protocol](docs/CPU-BASELINE.md).

The [PCM24+ASS follow-up](docs/COMPARISON-GAP-CLOSEOUT.md) replaces that row’s
CPU figures with a fresh matched campaign: Demuxe 46.6% versus native plus
host ASS 45.6%. Demuxe’s fresh Hybrid baseline was 56.8%, making the
new Native ASS route 18.0% lower in median CPU. These absolute values
should not be compared directly with the older campaign’s host conditions.

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

| Media format | Native video | Demuxe (auto) | Demuxe (forced software decode) | Movi 0.4.0 (default) | AVPlayer 1.3.1 (default) |
| --- | --- | --- | --- | --- | --- |
| H.264 + AAC / MP4 | 🟠 21.9% CPU | **🟢 20.2% CPU** | 52.4% CPU | 🟣 Native-first pass; default EOF check failed | 🟠 38.0% CPU |
| H.264 + AAC / MKV | **🟢 (Pass)** · 35.6% CPU† | **🟢 22.1% CPU** | 52.0% CPU | 🟣 Native-first pass; default EOF check failed | 🟠 37.3% CPU |
| H.264 + PCM24 / MKV | **🟢 21.2% CPU** | 🟠 21.7% CPU | 68.0% CPU | **🟢 (Pass)** · 40.3% CPU† | 🔴 startup/audio check failed |
| H.264 + PCM24 / MKV + ASS | **🟢 45.6% CPU** | 🟠 46.6% CPU | 62.1% CPU | 🟣 Native-first + host ASS pass; default subtitle check failed | 🔴 startup/audio check failed |
| H.264 + AAC 5.1 / MP4 | **🟢 (Pass)\*** · 50.5% CPU† | **🟢 (Pass)\*** · 49.5% CPU† | 🟢 (Pass)* · 65.6% CPU† | 🟣 Native-first pass\*; default seek check failed | **🟢 (Pass)\*** · 61.7% CPU† |
| H.264 + MP3 stereo / MP4 | **🟢 22.0% CPU** | 🟠 22.2% CPU | 67.1% CPU | 🟣 Native-first pass; default EOF check failed | 🟠 37.5% CPU |
| H.264 + AC-3 5.1 / MKV | 🔴 (Fail) | **🟢 (Pass)\*** · 61.2% CPU† | 🟢 (Pass)* · 68.9% CPU† | 🟠 Plays; EOF check failed | **🟢 (Pass)\*** · 52.1% CPU† |
| H.264 + E-AC-3 5.1 / MKV | 🔴 (Fail) | **🟢 (Pass)\*** · 66.3% CPU† | 🟢 (Pass)* · 69.4% CPU† | 🟠 Plays; EOF check failed | **🟢 (Pass)\*** · 65.8% CPU† |
| H.264 + DTS core 5.1 / MKV | 🔴 (Fail) | **🟢 (Pass)\*** · 36.9% CPU† | 🟢 (Pass)* · 72.4% CPU† | 🟠 Plays; rate check failed | **🟢 (Pass)\*** · 69.0% CPU† |
| H.264 + FLAC stereo / MKV | **🟢 23.0% CPU** | 🟠 23.6% CPU | 48.9% CPU | 🟣 Native-first pass; default EOF check failed | 🟠 35.7% CPU |
| H.264 + FLAC 5.1 / MKV | **🟢 (Pass)\*** · 45.0% CPU† | **🟢 (Pass)\*** · 52.1% CPU† | 🟢 (Pass)* · 66.1% CPU† | 🟣 Native-first pass\*; default seek check failed | **🟢 (Pass)\*** · 48.6% CPU† |
| H.264 + Opus stereo / MKV | 🟠 24.9% CPU | **🟢 24.5% CPU** | 48.0% CPU | **🟢 (Pass)** · 45.1% CPU† | 🟠 39.8% CPU |
| H.264 + PCM16 stereo / MKV | 🟠 22.7% CPU | **🟢 22.1% CPU** | 48.5% CPU | 🟣 Native-first pass; default EOF check failed | 🔴 startup/audio check failed |
| H.264 + PCM24 5.1 / MKV | **🟢 (Pass)\*** · 46.0% CPU† | **🟢 (Pass)\*** · 45.5% CPU† | 🟢 (Pass)* · 59.5% CPU† | **🟢 (Pass)\*** · 54.6% CPU† | 🔴 startup/audio check failed |
| HEVC Main 8-bit + AAC / MP4 (hvc1) | 🟠 23.6% CPU | **🟢 23.3% CPU** | 49.0% CPU | 🟣 Native-first pass; default EOF check failed | 🟠 36.4% CPU |
| HEVC Main 8-bit + AAC / MP4 (hev1) | **🟢 (Pass)** · 36.9% CPU† | **🟢 22.5% CPU** | 50.6% CPU | 🟣 Native-first pass; default EOF check failed | 🟠 35.0% CPU |
| HEVC Main 10-bit SDR + AAC / MP4 | **🟢 (Pass)** · 46.2% CPU† | **🟢 26.4% CPU** | 48.3% CPU | 🟣 Native-first pass; default EOF check failed | 🟠 38.7% CPU |
| HEVC Main 10-bit SDR + AC-3 / MKV | 🔴 (Fail) | **🟢 32.2% CPU** | 47.8% CPU | 🟠 Plays; EOF check failed | 🟠 38.8% CPU |
| HEVC Main 10-bit SDR + E-AC-3 / MKV | 🔴 (Fail) | **🟢 32.9% CPU** | 47.5% CPU | 🟠 Plays; EOF check failed | 🟠 39.1% CPU |
| HEVC Main 10-bit SDR + DTS core / MKV | 🔴 (Fail) | **🟢 33.6% CPU** | 54.2% CPU | 🟠 Plays; rate check failed | 🟠 42.6% CPU |
| AV1 8-bit + AAC / MP4 | **🟢 22.6% CPU** | 🟠 23.4% CPU | 45.5% CPU | 🟣 Native-first pass; default EOF check failed | 🟠 40.4% CPU |
| AV1 10-bit SDR + Opus / MKV | 🟠 25.4% CPU | **🟢 25.0% CPU** | 47.1% CPU | 🟣 Native-first pass; default EOF check failed | 🟠 40.6% CPU |
| AV1 + Opus / WebM | 🟠 23.6% CPU | **🟢 23.6% CPU** | 46.1% CPU | 🟣 Native-first pass; default EOF check failed | 🟠 39.3% CPU |
| VP9 8-bit + Opus / WebM | 🟠 23.6% CPU | **🟢 21.5% CPU** | 48.8% CPU | 🟣 Native-first pass; default EOF check failed | 🟠 37.5% CPU |
| VP9 10-bit SDR + Opus / WebM | 🟠 25.4% CPU | **🟢 25.3% CPU** | 51.5% CPU | 🟣 Native-first pass; default EOF check failed | 🔴 open failed |
| VP8 + Vorbis / WebM | **🟢 21.9% CPU** | 🟠 21.9% CPU | 48.7% CPU | 🟣 Native-first pass; default EOF check failed | 🟠 34.7% CPU |
| H.264 + AAC / MPEG-TS | 🔴 (Fail) | **🟢 25.5% CPU** | 45.0% CPU | 🟠 Plays; rate check failed | 🟠 38.8% CPU |
| MPEG-2 video + AC-3 / MPEG-TS | 🔴 (Fail) | **🟢 (Pass)** · 55.5% CPU† | 48.0% CPU | **🟢 35.0% CPU** | 🟠 37.7% CPU |
| MPEG-2 video + MP2 / MPEG-PS | 🔴 (Fail) | **🟢 (Pass)** · 51.2% CPU† | 48.2% CPU | 🟠 Plays; seek check failed | 🟠 Plays; seek check failed |
| MPEG-4 Part 2 + MP3 / AVI | 🔴 (Fail) | **🟢 (Pass)** · 61.0% CPU† | 35.3% CPU | 🔴 startup/audio check failed | 🟠 Plays; seek check failed |
| ProRes + PCM / MOV | 🔴 (Fail) | **🟢 (Pass)** · 41.6% CPU† | 48.4% CPU | 🔴 startup/audio check failed | 🔴 open failed |
| H.264 + AAC / fragmented MP4 (single file) | 🟠 24.0% CPU | **🟢 23.6% CPU** | 54.6% CPU | 🟣 Native-first pass; default EOF check failed | 🟠 Full File input plays; EOF check failed (default open failed) |
| H.264 video-only / MP4 | **🟢 20.8% CPU** | 🟠 22.6% CPU | 50.1% CPU | 🟠 37.4% CPU | 🟠 32.1% CPU |
| H.264 + AAC + embedded SRT / MKV | 🔴 (Fail) | **🟢 40.2% CPU (Native Direct + mpv subtitles)** | 59.1% CPU | 🟠 Plays; subtitle check failed | 🟠 Plays; seek check failed |
| H.264 + AAC + external WebVTT / MP4 | 🟠 23.4% CPU | **🟢 23.3% CPU** | 59.1% CPU | 🟣 Native-first pass; default subtitle check failed | 🔴 open failed |
| H.264 + AAC + embedded mov_text / MP4 | 🔴 (Fail) | **🟢 Pass (Native Direct + mpv subtitles)** · 53.3% CPU† | 64.2% CPU | 🟠 Plays; subtitle check failed | 🟠 Plays; seek check failed |
| H.264 + AAC + styled ASS / MKV | 🔴 (Fail) | **🟢 51.6% CPU (Native Direct + mpv subtitles)** | 54.6% CPU | 🟠 Plays; subtitle check failed | 🟠 Plays; seek check failed |
| HEVC + AC-3 + PGS / MKV | 🔴 (Fail) | **🟢 (Pass)** · 69.8% CPU† | 49.2% CPU | 🟠 Plays; subtitle check failed | 🟠 Plays; subtitle check failed |
| H.264 + AC-3 + VobSub / MKV | 🔴 (Fail) | **🟢 (Pass)** · 65.0% CPU† | 57.0% CPU | 🟠 Plays; subtitle check failed | 🟠 Plays; subtitle check failed |
| H.264 + AAC + PGS / MKV (subtitle isolation) | Not tested | **🟢 Pass (Native Direct + mpv subtitles)** · 58.6% CPU† | 🔴 (Fail) | Not tested | Not tested |
| H.264 + AAC + VobSub / MKV (subtitle isolation) | Not tested | **🟢 Pass (Native Direct + mpv subtitles)** · 46.2% CPU† | 🟢 (Pass)* · 70.9% CPU† | Not tested | Not tested |
| AAC audio-only / M4A | **🟢 15.3% CPU** | 🟠 15.9% CPU | 44.0% CPU | **🟢 (Pass)** · 40.1% CPU‡ | 🟠 20.7% CPU |
| MP3 audio-only / MP3 | 🟠 15.2% CPU | **🟢 14.9% CPU** | 39.3% CPU | **🟢 (Pass)** · 44.0% CPU‡ | 🟠 Plays; seek check failed |
| FLAC audio-only / FLAC | 🟠 14.5% CPU | **🟢 13.5% CPU** | 34.9% CPU | **🟢 (Pass)** · 49.8% CPU‡ | 🟠 18.5% CPU |
| Opus audio-only / Ogg | **🟢 15.9% CPU** | 🟠 15.9% CPU | 48.3% CPU | **🟢 (Pass)** · 48.7% CPU‡ | 🟠 Plays; seek check failed |
| Vorbis audio-only / Ogg | **🟢 14.8% CPU** | 🟠 15.6% CPU | 39.3% CPU | 🟣 Native-first pass; default seek check failed | 🟠 Plays; seek check failed |
| PCM16 audio-only / WAV | 🟠 15.9% CPU | **🟢 15.3% CPU** | 42.2% CPU | **🟢 (Pass)** · 49.2% CPU‡ | 🔴 startup/audio check failed |
| PCM24 audio-only / WAV | 🟠 16.0% CPU | **🟢 15.9% CPU** | 32.5% CPU | **🟢 (Pass)** · 43.4% CPU‡ | 🔴 open failed |
| HEVC Main 10 + E-AC-3 / MKV (HDR10) | 🔴 (Fail) | **🟢 (Pass)\*** · 60.2% CPU† | 🟢 (Pass)* · 66.5% CPU† | 🟠 Plays; EOF check failed | **🟢 (Pass)\*** · 44.1% CPU† |
| HEVC Main 10 + AAC / MP4 (HLG) | **🟢 (Pass)\*** · 53.2% CPU† | **🟢 (Pass)\*** · 52.3% CPU† | 🟢 (Pass)* · 68.7% CPU† | 🟣 Native-first pass\*; default EOF check failed | **🟢 (Pass)\*** · 66.6% CPU† |
| AV1 10-bit + Opus / WebM (HDR10) | **🟢 (Pass)\*** · 49.5% CPU† | **🟢 (Pass)\*** · 52.9% CPU† | 🟢 (Pass)* · 73.2% CPU† | 🟣 Native-first pass\*; default EOF check failed | **🟢 (Pass)\*** · 66.8% CPU† |
| HEVC + TrueHD 7.1 / MKV | 🔴 (Fail) | **🟢 (Pass)\*** · 57.8% CPU† | 🟢 (Pass)* · 72.4% CPU† | 🟠 Plays; rate check failed | 🔴 startup/audio check failed |
| HEVC + DTS-HD MA 7.1 / MKV | 🔴 (Fail) | **🟢 (Pass)\*** | 🟢 (Pass)* | 🟠 Plays; rate check failed | **🟢 (Pass)\*** |
| HEVC + E-AC-3 with Atmos metadata / MP4 | 🔴 (Fail) | **🟢 (Pass)\*** | 🟢 (Pass)* | 🟠 Plays; EOF check failed | 🟠 Plays; EOF check failed |
| Dolby Vision profile 5 HEVC + E-AC-3 / MP4 | 🔴 (Fail) | **🟢 (Pass)\*** | 🟢 (Pass)* | 🟠 Plays; EOF check failed | **🟢 (Pass)\*** |
| Dolby Vision profile 8.1 HEVC + E-AC-3 / MKV | 🔴 (Fail) | **🟢 (Pass)\*** | 🟢 (Pass)* | 🟠 Plays; EOF check failed | **🟢 (Pass)\*** |
| H.264 + AAC / HLS VOD (TS segments) | **🟢 (Pass)** · 50.3% CPU† | **🟢 (Pass)** · 50.4% CPU† | 63.2% CPU | **🟢 (Pass)** · 66.9% CPU† | **🟢 (Pass)** · 65.0% CPU† |
| H.264 + AAC / HLS VOD (fMP4 segments) | **🟢 (Pass)** · 49.9% CPU† | **🟢 (Pass)** · 51.5% CPU† | 49.9% CPU | **🟢 (Pass)** · 67.5% CPU† | **🟢 (Pass)** · 65.7% CPU† |
| HEVC + AAC / HLS VOD (fMP4 segments) | **🟢 (Pass)** · 50.5% CPU† | **🟢 (Pass)** · 50.5% CPU† | 52.8% CPU | **🟢 (Pass)** · 65.6% CPU† | **🟢 (Pass)** · 65.6% CPU† |
| H.264 + AAC / DASH VOD (fMP4 segments) | 🔴 (Fail) | **🟢 (Pass)** · 51.4% CPU† | 51.3% CPU | **🟢 (Pass)** · 66.8% CPU† | **🟢 (Pass)** · 66.5% CPU† |
| AV1 + Opus / DASH VOD (WebM segments) | 🔴 (Fail) | **🟢 (Pass)** · 53.3% CPU† | 66.9% CPU | **🟢 (Pass)** · 66.1% CPU† | 🟠 Plays; seek check failed |
| H.264 + AAC / HLS live (sliding window) | 🔴 (Fail) | **🟢 (Pass)** · 30.3% CPU† | 🟢 (Pass)* · 68.1% CPU† | **🟢 (Pass)** · 36.3% CPU† | 🟠 Plays; live check failed |
| HEVC Main 10 + AAC / MKV | **🟢 (Pass)\*** · 51.5% CPU† | **🟢 (Pass)\*** · 53.4% CPU† | 🟢 (Pass)* · 59.5% CPU† | **🟢 (Pass)\*** · 58.7% CPU‡ | **🟢 (Pass)\*** · 68.0% CPU† |
| HEVC Main 10 + FLAC / MKV | **🟢 (Pass)\*** · 52.3% CPU† | **🟢 (Pass)\*** · 53.0% CPU† | 🟢 (Pass)* · 70.7% CPU† | 🟣 Native-first pass\*; default EOF check failed | **🟢 (Pass)\*** · 66.9% CPU† |
| HEVC Main 10 + Opus / MKV | **🟢 (Pass)\*** · 52.0% CPU† | **🟢 (Pass)\*** · 54.0% CPU† | 🟢 (Pass)* · 72.5% CPU† | 🟣 Native-first pass\*; default seek check failed | **🟢 (Pass)\*** · 67.4% CPU† |
| HEVC Main 10 + FLAC + ASS / MKV | 🔴 (Fail) | **🟢 (Pass)\*** · 68.5% CPU† | 🟢 (Pass)* · 70.2% CPU† | 🟠 Plays; subtitle check failed | 🟠 Plays; seek check failed |
| HEVC Main 10 + Opus + ASS / MKV | 🔴 (Fail) | **🟢 (Pass)\*** · 71.0% CPU† | 🟢 (Pass)* · 69.8% CPU† | 🟠 Plays; subtitle check failed | 🟠 Plays; seek check failed |
| HEVC Main 10 HDR10 + TrueHD 7.1 + PGS / MKV | 🔴 (Fail) | **🟢 (Pass)\*** · 69.5% CPU† | 🟢 (Pass)* · 70.9% CPU† | 🟠 Plays; subtitle check failed | 🔴 startup/audio check failed |
| HEVC Main 10 HDR10 + DTS-HD MA 7.1 + PGS / MKV | 🔴 (Fail) | **🟢 (Pass)\*** · 63.6% CPU† | 🟢 (Pass)* · 67.0% CPU† | 🟠 Plays; subtitle check failed | 🟠 Plays; subtitle check failed |
| Dolby Vision profile 5 + E-AC-3/Atmos + ASS / MKV | 🔴 (Fail) | **🟢 (Pass)\*** · 99.9% CPU† | 🟢 (Pass)* · 92.1% CPU† | 🟠 Plays; subtitle check failed | 🟠 Plays; seek check failed |
| Dolby Vision profile 8.1 + E-AC-3/Atmos + ASS / MKV | 🔴 (Fail) | **🟢 (Pass)\*** · 101.2% CPU† | 🟢 (Pass)* · 96.9% CPU† | 🟠 Plays; subtitle check failed | 🟠 Plays; seek check failed |

See [versions, evidence, and configured alternatives](docs/HEAD-TO-HEAD-ROUTES.md)
and the [rerun guide](docs/HEAD-TO-HEAD.md).

The SRT, mov_text and ASS Demuxe cells now use automatic browser A/V with the
mpv subtitle-only service on the [exact local fixtures and current-tree
qualification](results/head-to-head/mpv-subtitle-tier-20260923-06/REPORT.md).
The SRT and ASS CPU figures are medians of three fresh, paired Chrome trials
against forced Hybrid; they are workload-specific and do not include competitor
reruns. The two H.264/AAC bitmap rows isolate subtitles by copying PGS/VobSub
from the older AC-3 cases onto browser-compatible A/V. The original AC-3
rows retain Hybrid for their audio requirement. Other-player cells on the
older rows retain their separately linked historical results; the new bitmap
derivatives were not run through those players.

The [comparison gap follow-up](docs/COMPARISON-GAP-CLOSEOUT.md) refreshes the seven Dolby Vision/PGS cells above. All four Dolby Vision combinations now pass bounded automatic playback through Software fallback. The three PGS fixtures pass in Hybrid, including subtitle recovery after seeking. These results do not qualify Dolby Vision color, physical HDR, Atmos objects or discrete surround. The [earlier specialist screen](results/head-to-head/specialist-report-01/REPORT.md) retains the historical failures and forced-Software diagnostics.

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

Playback tier promotion, automatic Native + mpv subtitles for the qualified local subset, and bounded background preparation are documented in [Playback tier policy](docs/PLAYBACK-TIER-POLICY.md). The subtitle service remains limited to its tested browser and source profiles.
