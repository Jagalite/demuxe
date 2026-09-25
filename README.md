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
The Auto CPU cells below were refreshed in the 2026-09-25 release retest; the
other CPU columns retain their earlier campaigns.

Within Software, the production presenter uses YUV/WebGL2 only for decoded
SDR 8-bit planar YUV420P frames meeting the [exact frame and color admission
contract](docs/SOFTWARE-YUV-PRESENTER.md). Other frames use mpv RGB conversion
and an RGBA WebGL upload; the explicit RGB override uses the legacy 2D canvas
path. Matched paused-frame checks cover the bounded RGB fallback cases.
Diagnostics report the active presenter and any YUV rejection reason. The
`softwarePresenter: 'rgb'` override remains available for comparisons. The
older CPU columns below may predate this presenter change; the [matched
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

This table records complete-file experiments, not an exhaustive compatibility
matrix. Use **[component capabilities](docs/CAPABILITIES.md)** to identify which
subsystem or requirement determines a route. The
[head-to-head catalogue](docs/HEAD-TO-HEAD-CATALOGUE.md) retains the demonstrated
combinations and their exact evidence.

The software-decode column shows one-core CPU medians for 45 cases with three
accepted measurement rounds. Other rows show a bounded pass or a failed check. See
the linked reports for correctness limits and exact outcomes. Detailed routes,
historical outcomes and tested alternatives remain in the [complete-file
catalogue](docs/HEAD-TO-HEAD-CATALOGUE.md).

The **Demuxe (auto)** column records automatic plan selection. The separately
recorded **Demuxe (software decode)** lane pins each media case to
`mode: 'software'`. Its [60-case correctness run](results/head-to-head/demuxe-software-matrix-20260922-02/REPORT.md)
recorded 46 passes, no failures and 14 screen or fixture blocks. The [14-case
specialist screen](results/head-to-head/demuxe-software-specialists-20260922-01/REPORT.md)
passed all cases; five prepared fixtures cover blocked base attempts, and nine
add specialist rows. Together they cover the 69 originally catalogued cases. A
separate [H.264/AAC bitmap-subtitle screen](results/head-to-head/demuxe-software-bitmap-isolation-20260923-01/REPORT.md)
passed VobSub through its seeks; PGS displayed initially but lost its subtitle
after seeking.

The [forced software CPU report](results/head-to-head/demuxe-software-performance-20260922-02/CPU-REPORT.md) contains 45 accepted three-round medians. The live HLS correctness screen passed bounded window progression, while two of its three 20-second CPU windows stopped advancing and were excluded. Software CPU values come from a separate campaign, so they are descriptive and do not enter the matched-lane bold minimums below.

Green dots in the software-decode column mark successful bounded playback;
the PGS seek failure remains red.

The [exploratory pass-cell CPU report](results/head-to-head/passing-cell-cpu-exploratory-20260923-01/measurement/CPU-REPORT.md) adds readings to 100 of the 111 green pass cells that previously lacked CPU values, including all 47 Pass* cells. Three CPU-only rounds were attempted per cell without applying content-fidelity checks. Ninety-three cells have at least one accepted steady-window median (90 have three accepted rounds); seven more have only stalled-window readings, and 11 could not be measured because their source fixture was unavailable. † marks the median of 1–3 full, focused CPU windows advancing at approximately 1×; ‡ marks full stable CPU windows that stalled and must not be read as steady-playback cost. Historical playback labels remain unchanged.

**These are bounded playback tests, not a format-support scorecard.** Movi
0.4.0 and AVPlayer 1.3.1 are pinned versions. Their correctness cells below use
[fresh default and configured-route tests](results/head-to-head/configured-alternatives-20260921-report-04/REPORT.md).
The pass-cell supplemental campaign added historical CPU values to previously blank green cells. The Auto column was refreshed by the 2026-09-25 release retest, while the other CPU columns retain their original campaigns. The PCM24+ASS follow-up and routing-isolation supplement below have their own matched campaigns. Configured competitor reruns collected no CPU data. Forced software CPU values elsewhere are from the separate campaign linked above.

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

The embedded SRT, mov_text and styled ASS Demuxe CPU cells come from the
[unified subtitle scheduling campaign](results/subtitle-visual-scheduling/REPORT.md):
three accepted Native Direct old-scheduler versus new-scheduler pairs per row.
Their other-player cells retain the separately cited historical screens; those
CPU numbers are not a matched cross-player ranking for the new route.

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

[The routing-isolation supplement](results/head-to-head/routing-isolations-20260923-01/REPORT.md)
adds nine deterministic synthetic rows for MPEG-2 video-only, stereo audio
controls, selective audio/subtitles, dual-track switching, H.264 High 10,
interlaced MPEG-2 and HEVC Main 10 4:2:2. Its fresh matched CPU campaign used
three accepted 20-second windows per numeric cell, including the existing
MPEG-2 + AC-3 and AC-3/E-AC-3/DTS 5.1 controls. These values have no † marker.
Movi passed the HEVC 4:2:2 correctness screen, but all three CPU windows stalled,
so that cell has no steady-playback CPU value. The linked report retains ranges,
actual routes and failed-window records.

The [performance-opportunity investigation](experiments/performance-opportunities/REPORT.md)
adds separate matched MPEG-2 + AC-3 and HEVC Main10 + AC-3/E-AC-3/DTS
comparisons, route traces, and small audio-copy and text-cue probes. Its
MPEG-2 four-arm rerun did not reproduce the large apparent Movi advantage from
older, mixed campaigns; Demuxe auto and forced Software selected the same
Software route. The HEVC audio controls did not establish a material AVPlayer
advantage or isolate mpv audio CPU. These runs use their own frozen fixtures
and harnesses, so their medians do not replace or combine with the matrix
cells below. Component CPU attribution and discrete-channel fidelity remain
open for the proposed audio-service architecture.

The separate [real-resolution performance screen](results/head-to-head/real-resolution-20260923-01/REPORT.md)
uses five 1080p/4K synthetic fixtures and one fresh matched campaign. Demuxe
Auto's Native Direct H.264 1080p60 median was 53.3% of one core versus 51.4%
plain browser; 4K24 HEVC Main10 + AAC was 44.7% versus 49.6%, with overlapping
round ranges. On the same 4K HEVC video packets with TrueHD + PGS, Auto kept
browser WebCodecs video in Hybrid at 65.1% versus 127.9% forced Software.
Those measurements do not replace or combine with the compatibility matrix.

**Release Auto retest (2026-09-25):** The refreshed Auto cells use frozen URL fixtures and three accepted Chrome CPU rounds when available. Other CPU columns retain earlier campaigns and must not be compared directly. Screened specialist cells use bounded real bitstreams and do not establish HDR, spatial or physical output fidelity. Failed Movi/AVPlayer CPU figures are diagnostic observations during failed playback and are not efficiency comparisons. [Raw status, route, round ranges and exclusions](results/head-to-head/release-auto-20260925-report/REPORT.md).

| Media format | Demuxe (software decode) | Native video | Demuxe (auto) | Movi 0.4.0 (default) | AVPlayer 1.3.1 (default) |
| --- | --- | --- | --- | --- | --- |
| H.264 + AAC / MP4 | 🟢 52.4% CPU | 🟠 21.9% CPU | 🟢 (Pass) · 45.1% CPU · native-direct | 🔴 (Fail) · 54.6% CPU (diagnostic) | 🟠 38.0% CPU |
| H.264 + AAC / MKV | 🟢 52.0% CPU | **🟢 (Pass)** · 35.6% CPU† | 🟢 (Pass) · 44.7% CPU · native-direct | 🔴 (Fail) · 55.5% CPU (diagnostic) | 🟠 37.3% CPU |
| Dual-audio H.264 + AAC + AC-3 stereo / MKV | 🟢 (Pass) · 65.7% CPU | **🟢 (Pass) · 41.7% CPU** · default AAC | 🟢 (Pass) · 43.6% CPU · native-direct · AC-3 switch: hybrid | 🔴 (Fail) · 56.6% CPU (diagnostic) | 🟢 (Pass) · 59.3% CPU |
| H.264 + PCM24 / MKV | 🟢 68.0% CPU | **🟢 21.2% CPU** | 🟢 (Pass) · 67.6% CPU · hybrid | **🟢 (Pass)** · 40.3% CPU† | 🔴 (Fail) · 52.8% CPU (diagnostic) |
| H.264 + PCM24 / MKV + ASS | 🟢 62.1% CPU | **🟢 45.6% CPU** | 🟢 (Pass) · 65.8% CPU · hybrid | 🔴 (Fail) · 55.4% CPU (diagnostic) | 🔴 (Fail) · 55.3% CPU (diagnostic) |
| H.264 + AAC 5.1 / MP4 | 🟢 (Pass)* · 65.6% CPU† | **🟢 (Pass)\*** · 50.5% CPU† | 🟢 (Pass)\* · 46.2% CPU · native-direct | 🔴 (Fail) · 58.1% CPU (diagnostic) | **🟢 (Pass)\*** · 61.7% CPU† |
| H.264 + MP3 stereo / MP4 | 🟢 67.1% CPU | **🟢 22.0% CPU** | 🟢 (Pass) · 45.2% CPU · native-direct | 🔴 (Fail) · 55.3% CPU (diagnostic) | 🟠 37.5% CPU |
| H.264 + AC-3 5.1 / MKV | 🟢 (Pass)* · 68.8% CPU | 🔴 (Fail) | 🟢 (Pass)\* · 65.5% CPU · hybrid | 🔴 (Fail) · 53.6% CPU (diagnostic) | 🟢 (Pass)* · 61.8% CPU |
| H.264 + E-AC-3 5.1 / MKV | 🟢 (Pass)* · 49.6% CPU | 🔴 (Fail) | 🟢 (Pass)\* · 63.8% CPU · hybrid | 🔴 (Fail) · 57.3% CPU (diagnostic) | **🟢 (Pass)\* · 38.5% CPU** |
| H.264 + DTS core 5.1 / MKV | 🟢 (Pass)* · 65.8% CPU | 🔴 (Fail) | 🟢 (Pass)\* · 67.1% CPU · hybrid | 🔴 (Fail) · 62.5% CPU (diagnostic) | **🟢 (Pass)\* · 60.5% CPU** |
| H.264 + AC-3 stereo / MKV | **🟢 (Pass) · 52.5% CPU** | 🔴 (Fail) | 🟢 (Pass) · 64.5% CPU · hybrid | 🔴 (Fail) · 53.8% CPU (diagnostic) | 🟢 (Pass) · 57.8% CPU |
| H.264 + E-AC-3 stereo / MKV | 🟢 (Pass) · 61.8% CPU | 🔴 (Fail) | 🟢 (Pass) · 64.8% CPU · hybrid | 🔴 (Fail) · 54.6% CPU (diagnostic) | 🟢 (Pass) · 56.8% CPU |
| H.264 + DTS core stereo / MKV | 🟢 (Pass) · 64.0% CPU | 🔴 (Fail) | 🟢 (Pass) · 62.8% CPU · hybrid | 🔴 (Fail) · 64.8% CPU (diagnostic) | 🟢 (Pass) · 60.5% CPU |
| H.264 + FLAC stereo / MKV | 🟢 48.9% CPU | **🟢 23.0% CPU** | 🟢 (Pass) · 44.7% CPU · native-direct | 🔴 (Fail) · 53.6% CPU (diagnostic) | 🟠 35.7% CPU |
| H.264 + FLAC 5.1 / MKV | 🟢 (Pass)* · 66.1% CPU† | **🟢 (Pass)\*** · 45.0% CPU† | 🟢 (Pass)\* · 46.2% CPU · native-direct | 🔴 (Fail) · 47.2% CPU (diagnostic) | **🟢 (Pass)\*** · 48.6% CPU† |
| H.264 + Opus stereo / MKV | 🟢 48.0% CPU | 🟠 24.9% CPU | 🟢 (Pass) · 46.9% CPU · native-direct | **🟢 (Pass)** · 45.1% CPU† | 🟠 39.8% CPU |
| H.264 + PCM16 stereo / MKV | 🟢 48.5% CPU | 🟠 22.7% CPU | 🟢 (Pass) · 66.5% CPU · hybrid | 🔴 (Fail) · 55.4% CPU (diagnostic) | 🔴 (Fail) · 55.2% CPU (diagnostic) |
| H.264 + PCM24 5.1 / MKV | 🟢 (Pass)* · 59.5% CPU† | **🟢 (Pass)\*** · 46.0% CPU† | 🟢 (Pass)\* · 65.8% CPU · hybrid | **🟢 (Pass)\*** · 54.6% CPU† | 🔴 (Fail) · 55.1% CPU (diagnostic) |
| HEVC Main 8-bit + AAC / MP4 (hvc1) | 🟢 49.0% CPU | 🟠 23.6% CPU | 🟢 (Pass) · 47.1% CPU · native-direct | 🔴 (Fail) · 53.1% CPU (diagnostic) | 🟠 36.4% CPU |
| HEVC Main 8-bit + AAC / MP4 (hev1) | 🟢 50.6% CPU | **🟢 (Pass)** · 36.9% CPU† | 🟢 (Pass) · 47.5% CPU · native-direct | 🔴 (Fail) · 55.3% CPU (diagnostic) | 🟠 35.0% CPU |
| HEVC Main 10-bit SDR + AAC / MP4 | 🟢 48.3% CPU | **🟢 (Pass)** · 46.2% CPU† | 🟢 (Pass) · 50.0% CPU · native-direct | 🔴 (Fail) · 54.7% CPU (diagnostic) | 🟠 38.7% CPU |
| HEVC Main 10 4:2:2 + AAC / MKV | 🟢 (Pass)* · 71.1% CPU | **🟢 (Pass)\* · 49.9% CPU** | 🟢 (Pass)\* · 49.0% CPU · native-direct | 🟢 (Pass)* · CPU unavailable (three stalled windows) | 🟢 (Pass)* · 67.2% CPU |
| HEVC Main 10-bit SDR + AC-3 / MKV | 🟢 47.8% CPU | 🔴 (Fail) | 🟢 (Pass) · 67.5% CPU · hybrid | 🔴 (Fail) · 54.4% CPU (diagnostic) | 🟠 38.8% CPU |
| HEVC Main 10-bit SDR + E-AC-3 / MKV | 🟢 47.5% CPU | 🔴 (Fail) | 🟢 (Pass) · 70.2% CPU · hybrid | 🔴 (Fail) · 54.1% CPU (diagnostic) | 🟠 39.1% CPU |
| HEVC Main 10-bit SDR + DTS core / MKV | 🟢 54.2% CPU | 🔴 (Fail) | 🟢 (Pass) · 69.3% CPU · hybrid | 🔴 (Fail) · 61.4% CPU (diagnostic) | 🟠 42.6% CPU |
| AV1 8-bit + AAC / MP4 | 🟢 45.5% CPU | **🟢 22.6% CPU** | 🟢 (Pass) · 42.9% CPU · native-direct | 🔴 (Fail) · 64.0% CPU (diagnostic) | 🟠 40.4% CPU |
| AV1 10-bit SDR + Opus / MKV | 🟢 47.1% CPU | 🟠 25.4% CPU | 🟢 (Pass) · 48.1% CPU · native-direct | 🔴 (Fail) · 63.9% CPU (diagnostic) | 🟠 40.6% CPU |
| AV1 + Opus / WebM | 🟢 46.1% CPU | 🟠 23.6% CPU | 🟢 (Pass) · 45.2% CPU · native-direct | 🔴 (Fail) · 64.4% CPU (diagnostic) | 🟠 39.3% CPU |
| VP9 8-bit + Opus / WebM | 🟢 48.8% CPU | 🟠 23.6% CPU | 🟢 (Pass) · 44.3% CPU · native-direct | 🔴 (Fail) · 51.2% CPU (diagnostic) | 🟠 37.5% CPU |
| VP9 10-bit SDR + Opus / WebM | 🟢 51.5% CPU | 🟠 25.4% CPU | 🟢 (Pass) · 48.1% CPU · native-direct | 🔴 (Fail) · 57.4% CPU (diagnostic) | 🔴 (Fail) · 35.7% CPU (diagnostic) |
| VP8 + Vorbis / WebM | 🟢 48.7% CPU | **🟢 21.9% CPU** | 🟢 (Pass) · 45.3% CPU · native-direct | 🔴 (Fail) · 62.1% CPU (diagnostic) | 🟠 34.7% CPU |
| H.264 + AAC / MPEG-TS | 🟢 45.0% CPU | 🔴 (Fail) | 🟢 (Pass) · 64.8% CPU · hybrid | 🔴 (Fail) · 60.5% CPU (diagnostic) | 🟠 38.8% CPU |
| MPEG-2 video + AC-3 / MPEG-TS | 🟢 (Pass) · 62.7% CPU | 🔴 (Fail) | 🟢 (Pass) · 64.7% CPU · software | 🟢 (Pass) · 58.4% CPU | **🟢 (Pass) · 57.8% CPU** |
| Interlaced MPEG-2 + AC-3 stereo / MPEG-TS | 🟢 (Pass)* · 71.9% CPU | 🔴 (Fail) | 🟢 (Pass)\* · 63.2% CPU · software · visible combing | 🔴 (Fail) · 60.7% CPU (diagnostic) | **🟢 (Pass)\* · 65.2% CPU** |
| MPEG-2 video + MP2 / MPEG-PS | 🟢 48.2% CPU | 🔴 (Fail) | 🟢 (Pass)\* · 61.5% CPU · software | 🔴 (Fail) · 58.5% CPU (diagnostic) | 🔴 (Fail) · 49.5% CPU (diagnostic) |
| MPEG-4 Part 2 + MP3 / AVI | 🟢 35.3% CPU | 🔴 (Fail) | 🟢 (Pass)\* · 62.9% CPU · software | 🔴 (Fail) · 43.0% CPU (diagnostic) | 🔴 (Fail) · 61.3% CPU (diagnostic) |
| ProRes + PCM / MOV | 🟢 48.4% CPU | 🔴 (Fail) | 🟢 (Pass)\* · 70.3% CPU · software | 🔴 (Fail) · 52.9% CPU (diagnostic) | 🔴 (Fail) · 42.3% CPU (diagnostic) |
| H.264 + AAC / fragmented MP4 (single file) | 🟢 54.6% CPU | 🟠 24.0% CPU | 🟢 (Pass) · 45.3% CPU · native-direct | 🔴 (Fail) · 59.3% CPU (diagnostic) | 🔴 (Fail) · 44.7% CPU (diagnostic) |
| H.264 video-only / MP4 | 🟢 50.1% CPU | **🟢 20.8% CPU** | 🟢 (Pass) · 41.6% CPU · native-direct | 🟠 37.4% CPU | 🟠 32.1% CPU |
| H.264 High 10 + AAC / MKV | 🟢 (Pass)* · 71.4% CPU | **🟢 (Pass)\* · 49.3% CPU** | 🟢 (Pass)\* · 46.1% CPU · native-direct | 🔴 (Fail) · 64.6% CPU (diagnostic) | 🟢 (Pass)* · 65.8% CPU |
| MPEG-2 video-only / MPEG-TS | 🟢 (Pass) · 51.8% CPU | 🔴 (Fail) | 🟢 (Pass) · 58.4% CPU · software | 🟢 (Pass) · 43.2% CPU | **🟢 (Pass) · 32.9% CPU** |
| H.264 + AAC + embedded SRT / MKV | 🟢 59.1% CPU | 🔴 (Fail) | 🟢 (Pass) · 66.1% CPU · hybrid | 🔴 (Fail) · 54.7% CPU (diagnostic) | 🔴 (Fail) · 56.5% CPU (diagnostic) |
| H.264 + AAC + external WebVTT / MP4 | 🟢 59.1% CPU | 🟠 23.4% CPU | 🟢 (Pass) · 45.6% CPU · native-direct | 🔴 (Fail) · 55.6% CPU (diagnostic) | 🔴 (Fail) · 39.8% CPU (diagnostic) |
| H.264 + AAC + embedded mov_text / MP4 | 🟢 64.2% CPU | 🔴 (Fail) | 🟢 (Pass) · 66.2% CPU · hybrid | 🔴 (Fail) · 54.7% CPU (diagnostic) | 🔴 (Fail) · 61.9% CPU (diagnostic) |
| H.264 + AAC + styled ASS / MKV | 🟢 54.6% CPU | 🔴 (Fail) | 🟢 (Pass) · 66.8% CPU · hybrid | 🔴 (Fail) · 55.9% CPU (diagnostic) | 🔴 (Fail) · 61.9% CPU (diagnostic) |
| H.264 + AC-3 stereo + ASS / MKV | 🟢 (Pass) · 62.2% CPU | 🔴 (Fail) | 🟢 (Pass) · 61.9% CPU · hybrid | 🔴 (Fail) · 54.3% CPU (diagnostic) | 🔴 (Fail) · 59.5% CPU (diagnostic) |
| HEVC + AC-3 + PGS / MKV | 🟢 49.2% CPU | 🔴 (Fail) | 🟢 (Pass)\* · 69.5% CPU · hybrid | 🔴 (Fail) · 53.9% CPU (diagnostic) | 🔴 (Fail) · 59.4% CPU (diagnostic) |
| H.264 + AC-3 + VobSub / MKV | 🟢 57.0% CPU | 🔴 (Fail) | 🟢 (Pass)\* · 64.9% CPU · hybrid | 🔴 (Fail) · 49.4% CPU (diagnostic) | 🔴 (Fail) · 60.0% CPU (diagnostic) |
| H.264 + AAC + PGS / MKV (subtitle isolation) | 🔴 (Fail) | Not tested | 🟢 (Pass) · 65.2% CPU · hybrid | Not tested | Not tested |
| H.264 + AAC + VobSub / MKV (subtitle isolation) | 🟢 (Pass)* · 70.9% CPU† | Not tested | 🟢 (Pass) · 65.9% CPU · hybrid | Not tested | Not tested |
| AAC audio-only / M4A | 🟢 44.0% CPU | **🟢 15.3% CPU** | 🟢 (Pass) · 33.7% CPU · native-direct | **🟢 (Pass)** · 40.1% CPU‡ | 🟠 20.7% CPU |
| MP3 audio-only / MP3 | 🟢 39.3% CPU | 🟠 15.2% CPU | 🟢 (Pass) · 34.4% CPU · native-direct | **🟢 (Pass)** · 44.0% CPU‡ | 🔴 (Fail) · 40.5% CPU (diagnostic) |
| FLAC audio-only / FLAC | 🟢 34.9% CPU | 🟠 14.5% CPU | 🟢 (Pass) · 33.3% CPU · native-direct | **🟢 (Pass)** · 49.8% CPU‡ | 🟠 18.5% CPU |
| Opus audio-only / Ogg | 🟢 48.3% CPU | **🟢 15.9% CPU** | 🟢 (Pass) · 35.4% CPU · native-direct | **🟢 (Pass)** · 48.7% CPU‡ | 🔴 (Fail) · 43.6% CPU (diagnostic) |
| Vorbis audio-only / Ogg | 🟢 39.3% CPU | **🟢 14.8% CPU** | 🟢 (Pass) · 32.9% CPU · native-direct | 🔴 (Fail) · 43.3% CPU (diagnostic) | 🔴 (Fail) · 42.2% CPU (diagnostic) |
| PCM16 audio-only / WAV | 🟢 42.2% CPU | 🟠 15.9% CPU | 🟢 (Pass) · 33.5% CPU · native-direct | **🟢 (Pass)** · 49.2% CPU‡ | 🔴 (Fail) · 44.0% CPU (diagnostic) |
| PCM24 audio-only / WAV | 🟢 32.5% CPU | 🟠 16.0% CPU | 🟢 (Pass) · 33.7% CPU · native-direct | **🟢 (Pass)** · 43.4% CPU‡ | 🔴 (Fail) · 32.8% CPU (diagnostic) |
| HEVC Main 10 + E-AC-3 / MKV (HDR10) | 🟢 (Pass)* · 66.5% CPU† | 🔴 (Fail) | 🟡 (Screened)\* · 65.1% CPU · hybrid | 🔴 (Fail) · 53.6% CPU (diagnostic) | **🟢 (Pass)\*** · 44.1% CPU† |
| HEVC Main 10 + AAC / MP4 (HLG) | 🟢 (Pass)* · 68.7% CPU† | **🟢 (Pass)\*** · 53.2% CPU† | 🟡 (Screened)\* · 48.4% CPU · native-direct | 🔴 (Fail) · 53.2% CPU (diagnostic) | **🟢 (Pass)\*** · 66.6% CPU† |
| AV1 10-bit + Opus / WebM (HDR10) | 🟢 (Pass)* · 73.2% CPU† | **🟢 (Pass)\*** · 49.5% CPU† | 🟡 (Screened)\* · 47.2% CPU · native-direct | 🔴 (Fail) · 60.9% CPU (diagnostic) | **🟢 (Pass)\*** · 66.8% CPU† |
| HEVC + TrueHD 7.1 / MKV | 🟢 (Pass)* · 72.4% CPU† | 🔴 (Fail) | 🟡 (Screened)\* · 75.1% CPU · hybrid | 🔴 (Fail) · 67.2% CPU (diagnostic) | 🔴 (Fail) · 55.6% CPU (diagnostic) |
| HEVC + DTS-HD MA 7.1 / MKV | 🟢 (Pass)* | 🔴 (Fail) | 🟡 (Screened)\* · 77.4% CPU · hybrid | 🔴 (Fail) · 72.8% CPU (diagnostic) | 🟡 (Screened)\* · 77.8% CPU |
| HEVC + E-AC-3 with Atmos metadata / MP4 | 🟢 (Pass)* | 🔴 (Fail) | 🟡 (Screened)\* · 71.2% CPU · hybrid | 🔴 (Fail) · 57.7% CPU (diagnostic) | 🔴 (Fail) · 69.7% CPU (diagnostic) |
| Dolby Vision profile 5 HEVC + E-AC-3 / MP4 | 🟢 (Pass)* | 🔴 (Fail) | 🟡 (Screened)\* · 105.9% CPU · software | 🔴 (Fail) · 46.7% CPU (diagnostic) | 🔴 (Fail) · 103.5% CPU (diagnostic) |
| Dolby Vision profile 8.1 HEVC + E-AC-3 / MKV | 🟢 (Pass)* | 🔴 (Fail) | 🟡 (Screened)\* · 105.9% CPU · software | 🔴 (Fail) · 60.2% CPU (diagnostic) | 🟡 (Screened)\* · 104.6% CPU |
| H.264 + AAC / HLS VOD (TS segments) | 🟢 63.2% CPU | **🟢 (Pass)** · 50.3% CPU† | 🟢 (Pass)\* · 47.0% CPU · native-direct | **🟢 (Pass)** · 66.9% CPU† | **🟢 (Pass)** · 65.0% CPU† |
| H.264 + AAC / HLS VOD (fMP4 segments) | 🟢 49.9% CPU | **🟢 (Pass)** · 49.9% CPU† | 🟢 (Pass)\* · 46.4% CPU · native-direct | **🟢 (Pass)** · 67.5% CPU† | **🟢 (Pass)** · 65.7% CPU† |
| HEVC + AAC / HLS VOD (fMP4 segments) | 🟢 52.8% CPU | **🟢 (Pass)** · 50.5% CPU† | 🟢 (Pass) · CPU unavailable | **🟢 (Pass)** · 65.6% CPU† | **🟢 (Pass)** · 65.6% CPU† |
| H.264 + AAC / DASH VOD (fMP4 segments) | 🟢 51.3% CPU | 🔴 (Fail) | 🟢 (Pass)\* · 47.4% CPU · shaka-mse | **🟢 (Pass)** · 66.8% CPU† | **🟢 (Pass)** · 66.5% CPU† |
| AV1 + Opus / DASH VOD (WebM segments) | 🟢 66.9% CPU | 🔴 (Fail) | 🟢 (Pass)\* · 48.0% CPU · shaka-mse | **🟢 (Pass)** · 66.1% CPU† | 🔴 (Fail) · 65.1% CPU (diagnostic) |
| H.264 + AAC / HLS live (sliding window) | 🟢 (Pass)* · 68.1% CPU† | 🔴 (Fail) | 🟢 (Pass) · CPU unavailable | **🟢 (Pass)** · 36.3% CPU† | 🔴 (Fail) · 39.4% CPU (diagnostic) |
| HEVC Main 10 + AAC / MKV | 🟢 (Pass)* · 59.5% CPU† | **🟢 (Pass)\*** · 51.5% CPU† | 🟡 (Screened)\* · 44.5% CPU · native-direct | **🟢 (Pass)\*** · 58.7% CPU‡ | **🟢 (Pass)\*** · 68.0% CPU† |
| HEVC Main 10 + FLAC / MKV | 🟢 (Pass)* · 70.7% CPU† | **🟢 (Pass)\*** · 52.3% CPU† | 🟡 (Screened)\* · 46.6% CPU · native-direct | 🔴 (Fail) · 46.1% CPU (diagnostic) | **🟢 (Pass)\*** · 66.9% CPU† |
| HEVC Main 10 + Opus / MKV | 🟢 (Pass)* · 72.5% CPU† | **🟢 (Pass)\*** · 52.0% CPU† | 🟡 (Screened)\* · 48.1% CPU · native-direct | 🔴 (Fail) · 62.6% CPU (diagnostic) | 🟡 (Screened)\* · 71.0% CPU |
| HEVC Main 10 + FLAC + ASS / MKV | 🟢 (Pass)* · 70.2% CPU† | 🔴 (Fail) | 🟡 (Screened)\* · 70.5% CPU · hybrid | 🔴 (Fail) · 45.3% CPU (diagnostic) | 🔴 (Fail) · 62.9% CPU (diagnostic) |
| HEVC Main 10 + Opus + ASS / MKV | 🟢 (Pass)* · 69.8% CPU† | 🔴 (Fail) | 🟡 (Screened)\* · 70.0% CPU · hybrid | 🔴 (Fail) · 54.8% CPU (diagnostic) | 🔴 (Fail) · 64.8% CPU (diagnostic) |
| HEVC Main 10 HDR10 + TrueHD 7.1 + PGS / MKV | 🟢 (Pass)* · 70.9% CPU† | 🔴 (Fail) | 🟡 (Screened)\* · 76.5% CPU · hybrid | 🔴 (Fail) · 75.1% CPU (diagnostic) | 🔴 (Fail) · 57.1% CPU (diagnostic) |
| HEVC Main 10 HDR10 + DTS-HD MA 7.1 + PGS / MKV | 🟢 (Pass)* · 67.0% CPU† | 🔴 (Fail) | 🟡 (Screened)\* · 78.0% CPU · hybrid | 🔴 (Fail) · 77.1% CPU (diagnostic) | 🔴 (Fail) · 78.9% CPU (diagnostic) |
| Dolby Vision profile 5 + E-AC-3/Atmos + ASS / MKV | 🟢 (Pass)* · 92.1% CPU† | 🔴 (Fail) | 🟡 (Screened)\* · 107.8% CPU · software | 🔴 (Fail) · 53.5% CPU (diagnostic) | 🔴 (Fail) · 104.8% CPU (diagnostic) |
| Dolby Vision profile 8.1 + E-AC-3/Atmos + ASS / MKV | 🟢 (Pass)* · 96.9% CPU† | 🔴 (Fail) | 🟡 (Screened)\* · 107.8% CPU · software | 🔴 (Fail) · 56.4% CPU (diagnostic) | 🔴 (Fail) · 102.5% CPU (diagnostic) |

See [versions, evidence, and configured alternatives](docs/HEAD-TO-HEAD-ROUTES.md)
and the [rerun guide](docs/HEAD-TO-HEAD.md).

The SRT, mov_text and ASS Demuxe cells now use automatic browser A/V with the
mpv subtitle-only service on the [exact local fixtures and current-tree
qualification](results/head-to-head/mpv-subtitle-tier-20260923-06/REPORT.md).
The SRT, mov_text and ASS CPU figures are medians of three fresh, paired Chrome
trials of the previous 60 Hz subtitle scheduler and the production visual
scheduler; they are workload-specific and do not include competitor reruns.
The two H.264/AAC bitmap rows isolate subtitles by copying PGS/VobSub
from the older AC-3 cases onto browser-compatible A/V. The original AC-3
rows retain Hybrid for their audio requirement. Other-player cells on the
older rows retain their separately linked historical results; the new bitmap
derivatives were not run through those players. Their Demuxe CPU cells use
fresh focused 20-second windows on the [unified subtitle scheduler](results/subtitle-visual-scheduling/REPORT.md).

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
