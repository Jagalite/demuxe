<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Component routing: preserving browser playback

This staged change admits **plain external WebVTT on Native A/V** through `addSubtitle(File)`. It does not qualify embedded extraction, rich subtitle overlays, independently decoded audio, or a new manifest owner. The earlier [17-case Hybrid audit](HEAD-TO-HEAD-HYBRID.md) remains the before-change record. Hybrid is not presumed slower.

## Architecture and first change

`selection.ts` rejects Native when selected embedded subtitles need rendering. `playback-plans.ts` previously required every file subtitle attachment to have an explicitly admitted ASS component; consequently even WebVTT selected mpv. `unified-player.ts` replayed all attachments onto the chosen backend. `NativePlayer.addTextTrack` already supported browser captions, including remux timeline bias, but `addSubtitle(File)` did not use it.

The new narrow adapter classifies UTF-8 WebVTT with plain cue text and timestamps, without settings, markup, entities, CSS, regions, identifiers or timestamp maps. Other formats retain existing routing. Invalid UTF-8 and malformed admitted plain timing reject before changing the active session. The browser must load exactly the admitted cue count, text and timing before acceptance; remux bias is included in that comparison. Caption Blob URLs belong to the backend and are revoked on failure, replacement, close and destruction.

File attachments retain their external ordinal identity across backends. Explicit track selection, new selected attachments, visibility and unselected attachments remain distinct. Source replacement clears attachments. Native A/V output verification and all embedded-subtitle/audio/transport requirements still apply. Caption admission on manifest timelines or adapted FLAC/Opus audio remains excluded pending combination qualification.

Execution plans now expose separate `owners.video`, `audio`, `subtitle`, `demux` and `presentation` fields. These describe existing executable component combinations; they do not promise arbitrary recombination. Native remux uses FFmpeg preparation with browser A/V decoding/presentation. Hybrid keeps WebCodecs video with mpv demux/audio and the retained presenter. Gain and audio-adaptation details remain explicit in the existing plan fields.

The first implementation still uses the transactional replacement machinery when adding a file caption. Avoiding that reload is a separate optimization: preserve rollback, concurrent cancellation and selected-track identities before measuring its benefit.

## Remaining subtitle work

| Case | Present reason for Hybrid | Smallest plausible next component | Qualification still required |
| --- | --- | --- | --- |
| H.264/AAC + external WebVTT / MP4 | File-API coupling, now removed for admitted plain captions | Browser text track | Broader VTT syntax/styles and browser/platform matrix remain outside this profile |
| H.264/AAC + embedded SRT / MKV | Embedded selected subtitle semantic gate | Selected stream extraction → native cues | Extraction bounds, codec-private data, timestamps, track identity, cancellation and real combined-player lifecycle |
| H.264/AAC + embedded mov_text / MP4 | Same gate | Selected MP4 sample extraction → text track | tx3g style semantics must be inspected; cannot label all mov_text plain text |
| H.264/AAC + styled ASS / MKV | Embedded extraction plus libass rendering | Native A/V + independent selected ASS/font extractor and libass overlay | Complete selected track/font/timestamp contract, renderer asset deployment and composition lifecycle |
| H.264/PCM24 + external ASS / MKV | Default file-attachment renderer is mpv; optional Native ASS not enabled | Existing explicit Native ASS plan, if qualified | `engine-ass` absent in current asset snapshot; current host-libass comparison is not built-in integration proof |
| HEVC/AC-3 + PGS / MKV | Embedded bitmap renderer gate, plus potential AC-3 incompatibility | Independent bitmap overlay plus separately qualified audio solution | Existing marked PGS rendering test fails; audio blocker must be isolated; general PGS object/palette/event semantics |
| H.264/AC-3 + VobSub / MKV | Embedded bitmap renderer gate, plus potential AC-3 incompatibility | Independent bitmap overlay plus separately qualified audio solution | Palette/composition/timing, seek/replacement, audio compatibility independently |

[R041](../research/items/R041.route-simple-subrip-captions-to-native-text-tracks/README.md) qualifies a strict **external** plain SRT research component. It is not embedded extraction. [R019](../research/items/R019.extract-embedded-ass-while-leaving-video-native/README.md) demonstrates restricted Matroska ASS/font extraction and libass agreement, but includes 8,372 small reads and does not qualify general container/production ownership. [R020](../research/items/R020.render-bitmap-subtitles-without-burning-them-into-video/README.md) qualifies a restricted PGS overlay component, not general RLE, fragmented objects or colored palettes. None is silently imported into production by this change.

## Audio split investigation

The seven audio-driven cases already demonstrated browser-decoded Native pictures before selected audio verification failed. AC-3/E-AC-3 fail the tested audio MSE configuration; DTS lacks a Demuxe remux construction contract, which is not proof of browser incapability. The existing Wasm backend owns AudioContext, PCM ring, output layout, mpv command transport, demux, and retained video presentation together. Merely hiding its video surface would still pay for its decoder/presenter and would introduce two unsynchronized owners.

The viable seam is a selected-audio producer with explicit source generation, source-time-to-PCM-frame mapping, bounded buffering, starvation state, drain/EOF, seek cancellation and resource ownership. Browser video must follow an independently verified common clock. [R086](../research/items/R086.native-video-with-an-independent-generated-pcm-clock/README.md) validates generated PCM feedback with a 35ms settled digital-clock bound, not decoded AC-3/E-AC-3/DTS, acoustic sync or pitch preservation. [R031](../research/items/R031.raw-aac-mp3-audio-beside-fragmented-video/README.md) and [R032](../research/items/R032.use-different-output-containers-for-different-tracks/README.md) investigate browser-owned compressed tracks with six-second complete appends. They are not independently decoded surround-audio adapters.

No automatic audio route changes here. Admission requires marked decoded output, seek/rewind, pause/resume, rate and pitch, forced starvation/recovery, bounded drift, source replacement, stale-generation rejection, cleanup and long playback. Surround channel fidelity and HDR output remain unqualified wherever the existing catalogue says screen only.

## Manifest/timeline investigation

`nativeManifestRejection` intentionally permits only plain HLS VOD without explicit rendition/track/custom-demux requirements. DASH and live HLS are excluded before a Native trial; these are policy/ownership exclusions, not video-codec verdicts. `streaming-manifest.js` selects bounded representations and rewrites supported finite periods, but FFmpeg still demuxes segments and owns packet timelines. File Native preparation is not a live/DASH scheduler.

- **DASH H.264/AAC fMP4:** the recorded Hybrid case presents marked video/audio and a moving image, then the **pause command** times out (`run.mjs` correctness pause step). This narrows the fault to command/timeline responsiveness; it does not establish the internal blocking cause. Direct `<video src=MPD>` also failed in the existing browser comparison. A browser-owned MSE scheduler could be viable, but must preserve representation selection, timestamp offsets, segment ordering and cancellation.
- **DASH AV1/Opus:** Hybrid passes the existing bounded checks; direct MPD playback fails in the comparator. WebM media compatibility and MPD loading are separate contracts. A new manifest-to-MSE component needs its own correctness proof.
- **Live HLS:** policy retains mpv inspection/timeline ownership. Existing Hybrid evidence is only bounded window progression. The existing plain-browser live comparison plays but fails its playback-rate progression check. Native VOD passes do not establish live-window eviction, discontinuities, refresh failures, live-edge recovery or rendition changes.

No manifest gate is bypassed. A pause-timeout root-cause investigation and a production Native manifest controller remain separate work.

## Qualification and measurement

Run the maintained marked-output harness for old and new automatic routes on identical fixture bytes. Add `component-captions.mjs` for cue/selection/malformed/replacement/URL lifecycle coverage. Keep hidden-subtitle and covered-video negative controls failing. Only after matching headed correctness passes, run `component-performance.mjs` with no concurrent builds/tests and `--exclusive`.

The measured baseline and candidate use byte-identical media, caption files, engine binaries and non-generated runtime JavaScript; executable differences are the Native caption adapter, plan ownership/admission and unified API changes.

The paired benchmark uses three alternating baseline/candidate pairs, fresh headed Chrome processes, five-second warmup and twenty-second steady playback; each trial also seeks forward/backward and reaches EOF/cleanup. It records startup wall/CPU, whole Chrome process CPU, summed RSS, renderer main-thread task/script time, seek costs, worker URLs and player diagnostics. Total memory is not summed RSS; shared pages can be counted twice. Browser-internal copy bytes and isolated mpv/Wasm CPU are unavailable and must remain null. Raw worker counters/heap/ownership are retained without converting them into unsupported CPU attribution. OS caches are not flushed. Percent differences are per metric and per workload, never combined across formats.

Reproduce into fresh directories (retain the baseline snapshot):

```sh
python3 tests/head-to-head/setup.py --output build/head-to-head/assets-component-next --fixtures-from build/head-to-head/assets-native-hls-fix-01 --lab /Volumes/seed2/demuxe-head-to-head-lab-20260916T131744Z/head-to-head-20260916T131744Z
node tests/head-to-head/component-captions.mjs build/head-to-head/assets-component-next results/head-to-head/captions-next
node tests/head-to-head/component-captions.mjs build/head-to-head/assets-component-next results/head-to-head/captions-remux-next remux
node tests/head-to-head/run.mjs --assets build/head-to-head/assets-component-next --catalogue --cases demuxe.auto.h264-vtt --headed --output results/head-to-head/vtt-candidate-next
node tests/head-to-head/run.mjs --assets build/head-to-head/assets-native-hls-fix-01 --catalogue --cases demuxe.auto.h264-vtt --headed --output results/head-to-head/vtt-baseline-next
node tests/head-to-head/component-performance.mjs build/head-to-head/assets-native-hls-fix-01 build/head-to-head/assets-component-next results/head-to-head/vtt-baseline-next results/head-to-head/vtt-candidate-next results/head-to-head/vtt-performance-next --exclusive
```

The lab argument supplies cached, hash-checked dependencies; omit it to fetch pinned dependencies. The local immutable asset directories are generated artifacts, not committed binaries. Each retained result includes asset hashes and frozen tooling/source evidence. Failed preliminary runs remain recorded; do not overwrite them.

## Case status and component owners

Only the plain external WebVTT row changes ownership. Existing outcomes for unchanged cases are retained from the linked Hybrid audit; SRT, mov_text and ASS also passed fresh candidate regression runs. “Screen only” remains fidelity-unqualified. Dashes mean not measured, not zero. CPU and memory differences refer only to the same-format old-Hybrid/new-Native comparison, not competing players.

| Case | Video owner | Audio owner | Subtitle owner | Demux owner | Result | CPU delta | Memory delta |
| --- | --- | --- | --- | --- | --- | --- | --- |
| H.264 + PCM24 / MKV + ASS | WebCodecs | mpv PCM/worklet | mpv/libass | mpv/FFmpeg | Passed | — | — |
| H.264 + AC-3 5.1 / MKV | WebCodecs | mpv PCM/worklet | None requested | mpv/FFmpeg | Screen only | — | — |
| H.264 + E-AC-3 5.1 / MKV | WebCodecs | mpv PCM/worklet | None requested | mpv/FFmpeg | Screen only | — | — |
| H.264 + DTS core 5.1 / MKV | WebCodecs | mpv PCM/worklet | None requested | mpv/FFmpeg | Screen only | — | — |
| HEVC Main 10-bit SDR + AC-3 / MKV | WebCodecs | mpv PCM/worklet | None requested | mpv/FFmpeg | Passed | — | — |
| HEVC Main 10-bit SDR + E-AC-3 / MKV | WebCodecs | mpv PCM/worklet | None requested | mpv/FFmpeg | Passed | — | — |
| HEVC Main 10-bit SDR + DTS core / MKV | WebCodecs | mpv PCM/worklet | None requested | mpv/FFmpeg | Passed | — | — |
| H.264 + AAC + embedded SRT / MKV | WebCodecs | mpv PCM/worklet | mpv/libass | mpv/FFmpeg | Passed | — | — |
| H.264 + AAC + external WebVTT / MP4 (before) | WebCodecs | mpv PCM/worklet | mpv/libass | mpv/FFmpeg | Fresh headed pass | baseline | baseline |
| H.264 + AAC + external WebVTT / MP4 (after) | Browser media element | Browser media element | Browser text track | Browser | Fresh headed + lifecycle pass | -48.7% CPU¹ | -5.9% summed RSS¹ |
| H.264 + AAC + embedded mov_text / MP4 | WebCodecs | mpv PCM/worklet | mpv/libass | mpv/FFmpeg | Passed | — | — |
| H.264 + AAC + styled ASS / MKV | WebCodecs | mpv PCM/worklet | mpv/libass | mpv/FFmpeg | Passed | — | — |
| HEVC + AC-3 + PGS / MKV | WebCodecs | mpv PCM/worklet | mpv bitmap | mpv/FFmpeg | Fail: required subtitle marker | — | — |
| H.264 + AC-3 + VobSub / MKV | WebCodecs | mpv PCM/worklet | mpv bitmap | mpv/FFmpeg | Passed | — | — |
| HEVC Main 10 + E-AC-3 / MKV (HDR10) | WebCodecs | mpv PCM/worklet | None requested | mpv/FFmpeg | Screen only | — | — |
| H.264 + AAC / DASH VOD (fMP4 segments) | WebCodecs | mpv PCM/worklet | None requested | mpv/FFmpeg | Fail: pause command timeout | — | — |
| AV1 + Opus / DASH VOD (WebM segments) | WebCodecs | mpv PCM/worklet | None requested | mpv/FFmpeg | Passed | — | — |
| H.264 + AAC / HLS live (sliding window) | WebCodecs | mpv PCM/worklet | None requested | mpv/FFmpeg | Passed | — | — |

¹ Median paired differences on this shared host; exploratory, not isolated-host qualification. Percentages are `(candidate − baseline) / baseline × 100`; negative means less. CPU is one-core-equivalent process CPU, memory is peak summed RSS during the steady window. No inference for the other formats.

## Recorded before/after results

[Baseline marked-output pass](../results/head-to-head/component-vtt-baseline-01/REPORT.md) and [candidate pass](../results/head-to-head/component-vtt-candidate-01/REPORT.md) used identical fixture bytes and headed Chrome 152. [Direct lifecycle including playing attachment](../results/head-to-head/component-captions-playing-01/result.json), [remux lifecycle and backend crossing](../results/head-to-head/component-captions-remux-crossing-01/result.json), and [cross-backend identity](../results/head-to-head/component-captions-crossing-01/result.json) passed. The [hidden-caption negative control](../results/head-to-head/component-vtt-negative-01/REPORT.md) correctly failed for missing subtitle text. [Embedded SRT, mov_text and ASS regressions](../results/head-to-head/component-subtitle-regressions-01/REPORT.md) stayed Hybrid and passed.

All six whole-player performance trials passed progression, presented-frame bounds, seeks, EOF and cleanup. Raw values below come from the [frozen performance record](../results/head-to-head/component-vtt-performance-01/result.json), including process samples, background workloads and exact commands. Paired order was baseline/candidate, candidate/baseline, baseline/candidate.

| Pair | Metric | Hybrid baseline | Native candidate | Difference |
| --- | --- | --- | --- | --- |
| 1 | Startup wall ms | 1790.498 | 1414.981 | -20.97% |
| 1 | Startup CPU s | 1.133 | 0.713 | -37.06% |
| 1 | Steady CPU, % of one core | 37.247 | 17.668 | -52.57% |
| 1 | Peak summed RSS MiB | 814.109 | 779.656 | -4.23% |
| 1 | Main-thread task ms / window | 424.478 | 86.206 | -79.69% |
| 1 | Main-thread script ms / window | 250.734 | 39.739 | -84.15% |
| 2 | Startup wall ms | 1679.884 | 1380.378 | -17.83% |
| 2 | Startup CPU s | 1.224 | 0.682 | -44.29% |
| 2 | Steady CPU, % of one core | 36.071 | 20.183 | -44.05% |
| 2 | Peak summed RSS MiB | 816.203 | 767.734 | -5.94% |
| 2 | Main-thread task ms / window | 426.667 | 89.440 | -79.04% |
| 2 | Main-thread script ms / window | 248.587 | 39.312 | -84.19% |
| 3 | Startup wall ms | 1657.237 | 1324.714 | -20.06% |
| 3 | Startup CPU s | 1.192 | 0.683 | -42.72% |
| 3 | Steady CPU, % of one core | 37.319 | 19.141 | -48.71% |
| 3 | Peak summed RSS MiB | 829.531 | 749.656 | -9.63% |
| 3 | Main-thread task ms / window | 424.756 | 81.365 | -80.84% |
| 3 | Main-thread script ms / window | 252.022 | 37.308 | -85.20% |

Steady windows were approximately 21.3 seconds including sampling overhead; CPU percentages divide by each actual window duration. Main-thread task time includes script time; do not add them together. The median paired steady CPU difference was **−48.7%** (individual pairs −52.6%, −44.0%, −48.7%); median paired summed RSS difference was **−5.9%**. Startup wall difference was **−20.1%** and startup CPU **−42.7%**. These are distinct metrics for this WebVTT workload only.

| Pair | Seek target | Hybrid wall ms | Native wall ms | Difference | Hybrid CPU s | Native CPU s | CPU difference |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 10s | 557.35 | 78.15 | -85.98% | 0.0951 | 0.0148 | -84.41% |
| 1 | 1s | 560.84 | 81.70 | -85.43% | 0.0922 | 0.0202 | -78.11% |
| 1 | 35.4s | 603.34 | 79.65 | -86.80% | 0.1168 | 0.0162 | -86.11% |
| 2 | 10s | 361.96 | 80.55 | -77.75% | 0.0957 | 0.0157 | -83.56% |
| 2 | 1s | 374.83 | 76.67 | -79.55% | 0.0829 | 0.0228 | -72.46% |
| 2 | 35.4s | 641.07 | 73.90 | -88.47% | 0.1478 | 0.0149 | -89.93% |
| 3 | 10s | 560.37 | 82.75 | -85.23% | 0.0928 | 0.0180 | -80.60% |
| 3 | 1s | 356.45 | 77.68 | -78.21% | 0.0645 | 0.0202 | -68.77% |
| 3 | 35.4s | 562.71 | 80.87 | -85.63% | 0.1690 | 0.0167 | -90.12% |

Hybrid retained a 128 MiB Demuxe Wasm heap and recorded 1,669–1,692 engine pump ticks and 643–646 shared compressed packet inputs per steady window. Native had no Demuxe engine worker/heap/pump. Hybrid had consumed 15,168 subtitle bitmap payload bytes by warmup and reused those tiles through the steady window; both steady-window owned-packet copy and new-subtitle-bitmap counters were zero. Those counters do **not** cover PCM ring copies, RGBA expansion, GPU transfers or browser-internal copies. Total copied bytes and isolated Wasm/mpv CPU remain unavailable; they are not reported as savings. Worker URLs, heap, decoder, presenter and raw counters are preserved in each sample.

## Open qualification work

- Embedded SRT/mov_text extraction and rich ASS/font ownership remain separate integration work; no performance percentage is assigned to them.
- PGS remains a failing required-rendering case. Restricted R020 research does not repair that production path.
- AC-3/E-AC-3/DTS split-audio routes need decoded-output synchronization and long-playback proof before admission or benchmarking. Surround/HDR fidelity remains unqualified.
- DASH pause responsiveness and Native manifest scheduling are unresolved; live window/discontinuity/recovery gates remain intact.
- Exact whole-stack copy accounting and worker/Wasm CPU attribution need additional observability; browser internals cannot be inferred from Demuxe counters. An isolated-host/platform-expanded performance run remains outstanding.

[Validation record and frozen changed source](../results/head-to-head/component-routing-validation-01/result.json): 31 unit/contract/state checks passed; 13 component evidence manifests verified, preserving the failed initial attempt and expected negative-control failure. The source captured in that validation record matches the benchmark candidate snapshot; the later review fixes below have a separate snapshot. Build and repository licensing/core-boundary checks passed. The main README table uses the separate [four-case headless follow-up](../results/head-to-head/component-catalogue-01/REPORT.md), retaining the catalogue’s browser-profile rule.

## Review fixes

File captions now use a separate backend track-ID range, while URL-backed browser track IDs are independent of file-caption insertion order. Mixed API calls must preserve both the selected public identity and its displayed cue. Parsing removes only structural trailing newlines and preserves spaces/tabs in cue text. Failure to load an owned Blob caption, or a browser cue-fidelity mismatch, is a typed component incompatibility permitting the existing Hybrid fallback. Remaining Native plans that share that caption renderer are skipped within the same discovery attempt; repackaging A/V cannot repair it. Cancellation, permission failures, URL-backed track errors and unknown failures retain their existing classification.

The review regression command is:

```sh
node tests/head-to-head/component-caption-regressions.mjs build/head-to-head/assets-component-vtt-review-fix-02 results/head-to-head/component-caption-review-fixes-next
```

The paired performance measurements above belong to `assets-component-vtt-04`, **before these review fixes**. They have not been rerun for the revised source and must not be presented as measurements of this newer snapshot.

[Review regression evidence](../results/head-to-head/component-caption-review-fixes-02/result.json) passes mixed-track identity and exact trailing-whitespace checks for both direct and remuxed Native playback. Real `media-src 'self'` rejection and injected cue mismatch reach working Hybrid output after one failed Native caption trial; injected cancellation and permission errors remain terminal. The first correction attempt is retained in `component-caption-review-fixes-01`: it exposed an unnecessary Native-remux retry ending in an MSE timeout, which the component-scoped rejection now prevents.

The revised [direct lifecycle](../results/head-to-head/component-caption-fixed-lifecycle-01/result.json), [remux lifecycle](../results/head-to-head/component-caption-fixed-remux-01/result.json), and [marked A/V/subtitle playback](../results/head-to-head/component-caption-fixed-playback-01/REPORT.md) all pass. The latter refreshes the WebVTT row in the main catalogue. [Source/evidence integrity](../results/head-to-head/component-caption-fix-validation-01/result.json) ties the fixed source to the new snapshot and preserves both correction attempts. The focused unit/state/admission/harness suite passes 32 checks.
