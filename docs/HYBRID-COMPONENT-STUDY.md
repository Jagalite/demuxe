<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Remaining Hybrid cases: component isolation study

This study tests explicit component substitutions against the remaining 16 Hybrid rows. It does **not** change automatic routing or the README's production routing results. A smaller ownership boundary is a candidate, not a performance claim: equivalent selected output and lifecycle checks must pass before a paired CPU comparison is admitted.

## Experimental boundary

The player is frozen from the reviewed plain-WebVTT implementation (`5694e2e` source lineage). The study derives a new asset snapshot from `assets-component-vtt-review-fix-02`, verifies parent hashes, and adds a freshly linked optional Native libass renderer. The current research worktree is not compiled into this experiment. Both variants use identical media, player and runtime bytes. Runtime and source hashes, link provenance, frozen harnesses, commands, screenshots and request logs accompany the results.

The test-only `component-trials.mjs` supplies three narrow strategies:

- **Subtitles:** fetch and extract the single authored subtitle stream, then open the unchanged original media with browser-owned A/V. Plain SRT/tx3g becomes a checked WebVTT file attachment. ASS retains its script header, dialogue timing and styling and uses the existing explicitly enabled independent libass renderer. PCM24 + external ASS needs no extraction. Extraction/download and attachment-related reloads count toward startup measurements. Candidates explicitly select Native, so startup compares these implemented lab routes with automatic Hybrid discovery; it does not predict the cost of a future automatic discovery integration.
- **Audio:** request the existing lossless FLAC adaptation path with packet-copied video. Existing codec, integer-precision and mono/stereo constraints remain enforced. This is a test of the available adapter, not a newly qualified independent decoded-audio clock.
- **DASH:** a fixture-scoped finite MPD loader appends the original selected initialization/media segments to separate browser MSE A/V buffers. It accepts only a small static single-period/two-representation profile and prefetches the complete finite presentation. It is not an adaptive/live streaming implementation. Direct Native live HLS is a separate diagnostic trial.

The extractor's 32 MiB whole-file profile is deliberately narrow. It is not a range-efficient general Matroska/MP4 parser. The fixtures have one selected video, audio and subtitle stream; multitrack extraction and general tx3g styling remain unqualified. Embedded ASS uses the authored vector drawing fixture, not a general styled-text/font corpus.

## Where ownership is coupled

[`nativeRejection`](../src/internal/selection.ts) excludes selected embedded subtitles because Native cannot prove their delivery. [`planAdmission`](../src/internal/playback-plans.ts) separately gates file attachments: plain WebVTT is admitted, while ASS needs the explicit optional renderer. The four successful subtitle trials leave the original media container and A/V streams unchanged; the missing component is selected subtitle extraction/rendering, not an A/V container or presentation limitation on this browser.

[`NativePlayer.verifyOutput`](../src/internal/native-player.ts) detects the audio failures after Native video has already presented. [`unified-player.ts`](../src/unified-player.ts) then selects a whole executable backend/plan. Existing component owner fields describe finite implemented combinations; they do not yet supply an independently decoded-audio producer and synchronized browser-video consumer. The narrower FLAC path's exact codec/layout/precision rejections are enforced in [`native/adaptation/flac.h`](../native/adaptation/flac.h).

[`nativeManifestRejection`](../src/internal/selection.ts) excludes DASH and live timelines before Native admission. [`streaming-manifest.js`](../web/streaming-manifest.js) currently prepares bounded manifests for mpv/FFmpeg, which retains segment demux/timeline ownership. The finite DASH trial replaces that controller while the browser handles the original segment bytes. This establishes a viable seam for these authored VOD fixtures, not general manifest support.

No tested row demonstrated a container-only or video-presentation-only blocker in this browser’s bounded screen. The bitmap rows have **two** independent blockers: required subtitle composition and failed selected audio. The HDR row also retains a separate display-fidelity qualification gap even if its audio were repaired.

## Correctness gates

The existing comparator checks actual marked selected A/V, subtitle text or colored drawing, pause/resume, rate, seeks and rewind, EOF, surfaces, audio contexts and workers. Additional subtitle checks cover cue start/end boundaries, visibility, selected/unselected attachments, track changes, malformed-caption rollback, source replacement, caption URL release and renderer worker removal. Extraction timestamps are checked against FFprobe; reconstructed ASS matches FFmpeg's extracted script. Truncation negative controls reject.

For ASS performance admission, baseline and candidate screenshots must also agree on the marked drawing's shape, position and color (magenta-mask intersection/union above 98%). General surround, HDR, font/style, acoustic synchronization, long playback and platform qualification are not inferred from these fixtures. The 5.1 and HDR rows retain their fidelity limitations.

An initial baseline run stalled during browser teardown after the Chrome child exited. It was explicitly interrupted and is not qualification evidence. Subsequent harness revisions bound browser/context teardown and retain failures instead of hanging. Player surface/context/worker cleanup and browser-harness teardown are recorded separately. The performance runner also records OS-level exit of every CDP-listed Chrome process before starting the next trial; a missing Playwright close acknowledgment is disclosed separately from observed process exit. Initial performance attempts that stopped at that acknowledgment deadline are retained and are not used as completed paired results.

## Measurement

Only cases with passed matching headed correctness and lifecycle evidence may enter `component-isolation-performance.mjs`. Each case uses three alternating pairs of fresh Chrome instances, five seconds of warmup, twenty seconds of steady playback, then seeks and EOF/cleanup. Raw CPU samples cover CDP-listed Chrome processes. Startup includes browser-side extraction/manifest work; server CPU and external system media services are outside the measured scope. Main-thread task/script time, seek cost, optional-renderer counters and worker ownership are retained.

CPU percentages are one-core equivalents. Paired differences are `(candidate − baseline) / baseline × 100`; negative means less. Memory is peak **summed RSS during the sampled steady window**, which can count shared pages more than once; transient startup peaks are not captured. Total copy bytes and isolated Wasm/mpv CPU remain unavailable, not zero. Existing background user workloads are recorded and left running; this is an exploratory shared-host comparison, not an isolated-host or general performance ranking.

## Results

All 16 remaining rows were tested. Six explicit candidates passed the bounded fixture checks; five have completed three paired performance runs. H.264 DASH has no passed Hybrid pause baseline, so its CPU remains unmeasured. The other ten candidates fail a required gate.

CPU and RSS below are median paired percentage differences. [All 30 raw performance trials, per-pair differences and exact evidence paths](../results/head-to-head/component-isolation-report-01/REPORT.md) are retained alongside the [machine-readable audit](../results/head-to-head/component-isolation-report-01/analysis.json). Failed and interrupted preliminary runs are preserved and excluded.

| Case | Exact blocker | Replacement trial | CPU delta | Summed RSS delta |
| --- | --- | --- | --- | --- |
| H.264 + PCM24 / MKV + external ASS | subtitles: Default external ASS ownership is mpv; the optional independent Native libass renderer needs explicit admission. | Pass (bounded fixture) | -35.7% | -5.7% |
| H.264 + AC-3 5.1 / MKV | audio: Selected AC-3 audio produces no Native decoded-audio progress; video is presented. | Audio codec is not qualified for lossless adaptation | — | — |
| H.264 + E-AC-3 5.1 / MKV | audio: Selected E-AC-3 audio produces no Native decoded-audio progress; video is presented. | Audio codec is not qualified for lossless adaptation | — | — |
| H.264 + DTS core 5.1 / MKV | audio: Selected DTS audio produces no Native decoded-audio progress; no DTS packet-copy mux contract exists. | FLAC adaptation requires an established mono/stereo layout and sample rate | — | — |
| HEVC Main 10-bit SDR + AC-3 / MKV | audio: Selected AC-3 audio fails Native verification; HEVC video is presented. | Audio codec is not qualified for lossless adaptation | — | — |
| HEVC Main 10-bit SDR + E-AC-3 / MKV | audio: Selected E-AC-3 audio fails Native verification; HEVC video is presented. | Audio codec is not qualified for lossless adaptation | — | — |
| HEVC Main 10-bit SDR + DTS core / MKV | audio: Selected DTS audio fails Native verification; HEVC video is presented; no DTS packet-copy mux contract exists. | Lossless FLAC requires established 16/24-bit integer precision; no quantization permitted | — | — |
| H.264 + AAC + embedded SRT / MKV | subtitles: Selected embedded SRT is not delivered by the admitted Native subtitle path; unchanged MKV A/V works. | Pass (bounded fixture) | -50.2% | -12.5% |
| H.264 + AAC + embedded mov_text / MP4 | subtitles: Selected embedded tx3g requires extraction; unchanged MP4 A/V works. Only text/timing equivalence is qualified. | Pass (bounded fixture) | -48.7% | -10.9% |
| H.264 + AAC + styled ASS / MKV | subtitles: Embedded ASS requires independent extraction and libass composition; unchanged MKV A/V works. | Pass (bounded fixture) | -36.8% | -6.0% |
| HEVC + AC-3 + PGS / MKV | subtitles + audio: PGS composition is not provided by Native; direct Native also presents video but fails AC-3 audio. Hybrid itself misses the authored drawing. | Audio codec is not qualified for lossless adaptation | — | — |
| H.264 + AC-3 + VobSub / MKV | subtitles + audio: VobSub composition is not provided by Native; direct Native also presents video but fails AC-3 audio. | Audio codec is not qualified for lossless adaptation | — | — |
| HEVC Main 10 + E-AC-3 / MKV (HDR10) | audio + fidelity: E-AC-3 audio fails Native verification; HDR transfer/display fidelity remains independently unqualified. | Audio codec is not qualified for lossless adaptation | — | — |
| H.264 + AAC / DASH VOD (fMP4 segments) | streaming / timing: Native has no admitted MPD segment/timeline owner. Finite MSE trial passes; Hybrid baseline times out on pause after marked A/V. | Pass (bounded fixture) | — | — |
| AV1 + Opus / DASH VOD (WebM segments) | streaming / timing: MPD segment/timeline ownership, not AV1/Opus decoding, excludes Native; finite MSE trial passes. | Pass (bounded fixture) | -55.7% | -8.2% |
| H.264 + AAC / HLS live (sliding window) | streaming / timing: Live manifest ownership is gated. Direct Native trial plays initially but stops advancing during the rate test. | Error: Playback-rate progression outside bounded tolerance | — | — |

The ASS trials reduced aggregate Chrome CPU while increasing renderer main-thread task duration: **+42.9%** for embedded ASS and **+57.3%** for PCM24 + external ASS (median paired differences). These costs are retained alongside the worker/renderer counters; the CPU reduction is not a reduction in every component’s work.

## Component owners by case

Passed rows show the explicit lab substitution. Other rows show the retained Hybrid owner chain; their tested replacements failed. All owners and evidence paths are also retained in the machine-readable audit.

| Case | Video owner | Audio owner | Subtitle owner | Demux / manifest owner | Presentation owner | Trial result |
| --- | --- | --- | --- | --- | --- | --- |
| H.264 + PCM24 / MKV + external ASS | browser media element | browser media element | independent libass | browser | browser media element + libass overlay | Passed bounded trial |
| H.264 + AC-3 5.1 / MKV | browser WebCodecs | mpv PCM/worklet | none | mpv/FFmpeg | Demuxe retained-frame presenter | Failed; Hybrid retained |
| H.264 + E-AC-3 5.1 / MKV | browser WebCodecs | mpv PCM/worklet | none | mpv/FFmpeg | Demuxe retained-frame presenter | Failed; Hybrid retained |
| H.264 + DTS core 5.1 / MKV | browser WebCodecs | mpv PCM/worklet | none | mpv/FFmpeg | Demuxe retained-frame presenter | Failed; Hybrid retained |
| HEVC Main 10-bit SDR + AC-3 / MKV | browser WebCodecs | mpv PCM/worklet | none | mpv/FFmpeg | Demuxe retained-frame presenter | Failed; Hybrid retained |
| HEVC Main 10-bit SDR + E-AC-3 / MKV | browser WebCodecs | mpv PCM/worklet | none | mpv/FFmpeg | Demuxe retained-frame presenter | Failed; Hybrid retained |
| HEVC Main 10-bit SDR + DTS core / MKV | browser WebCodecs | mpv PCM/worklet | none | mpv/FFmpeg | Demuxe retained-frame presenter | Failed; Hybrid retained |
| H.264 + AAC + embedded SRT / MKV | browser media element | browser media element | browser text track | browser A/V + bounded JS subtitle extraction | browser media element | Passed bounded trial |
| H.264 + AAC + embedded mov_text / MP4 | browser media element | browser media element | browser text track | browser A/V + bounded JS subtitle extraction | browser media element | Passed bounded trial |
| H.264 + AAC + styled ASS / MKV | browser media element | browser media element | independent libass | browser A/V + bounded JS subtitle extraction | browser media element + libass overlay | Passed bounded trial |
| HEVC + AC-3 + PGS / MKV | browser WebCodecs | mpv PCM/worklet | mpv bitmap | mpv/FFmpeg | Demuxe retained-frame presenter | Failed; Hybrid retained |
| H.264 + AC-3 + VobSub / MKV | browser WebCodecs | mpv PCM/worklet | mpv bitmap | mpv/FFmpeg | Demuxe retained-frame presenter | Failed; Hybrid retained |
| HEVC Main 10 + E-AC-3 / MKV (HDR10) | browser WebCodecs | mpv PCM/worklet | none | mpv/FFmpeg | Demuxe retained-frame presenter | Failed; Hybrid retained |
| H.264 + AAC / DASH VOD (fMP4 segments) | browser media element | browser media element | none | browser segments + bounded JS MPD/MSE loader | browser media element | Passed bounded trial |
| AV1 + Opus / DASH VOD (WebM segments) | browser media element | browser media element | none | browser segments + bounded JS MPD/MSE loader | browser media element | Passed bounded trial |
| H.264 + AAC / HLS live (sliding window) | browser WebCodecs | mpv PCM/worklet | none | mpv/FFmpeg | Demuxe retained-frame presenter | Failed; Hybrid retained |

## Remaining qualification boundaries

- **Audio:** the available FLAC adapter rejects AC-3/E-AC-3, DTS 5.1 layout and the stereo DTS precision contract in these trials. A decoded-audio producer plus browser video still needs seek, pause/rate, starvation/recovery, drift, replacement, cleanup and long-play qualification. [R086](../research/items/R086.native-video-with-an-independent-generated-pcm-clock/README.md) is a generated-PCM clock experiment, not that integrated decoded-audio proof. No downmix, lossy transcode or weakened precision gate is used to manufacture a result.
- **Bitmap subtitles:** PGS and VobSub need both an independent subtitle renderer and a working audio route. Changing subtitles alone cannot repair the observed AC-3 failure. [R020](../research/items/R020.render-bitmap-subtitles-without-burning-them-into-video/README.md) excludes general RLE, fragmented objects and colored palettes. The current colored PGS fixture also fails the Hybrid drawing check.
- **Manifests:** finite full-prefetch DASH success does not qualify adaptive representation changes, multi-period offsets, live windows, discontinuities or failed-refresh recovery. H.264 DASH has no passed Hybrid pause baseline for a valid paired comparison. Native live HLS's observed zero rate-test progression remains a blocker.
- **Production integration:** these successful lab substitutions have narrow authored-fixture contracts. They do not admit arbitrary SRT/tx3g/ASS files or new automatic routes. Subtitle extraction currently runs in the lab adapter before `Player.open`; production range budgets, in-flight extraction cancellation and stale-source generation handling still need integration and tests. The finite DASH loader also needs production transport budgets and a streaming scheduler. ASS remains container-overlay-only, with no new fullscreen/PiP qualification. Native caption styling for plain text is permitted by this fixture's text/timing contract; general tx3g font/style preservation is not established. Surround channel fidelity and HDR output remain unqualified.

## Reproduction

Use fresh output paths; completed evidence is never overwritten. Prepare the optional renderer using `scripts/link-native-ass.py` with the pinned engine library root, then derive the study snapshot:

```sh
python3 tests/head-to-head/prepare-component-study.py BASE_ASSETS ASS_RUNTIME NEW_ASSETS
node tests/head-to-head/component-extraction-checks.mjs NEW_ASSETS
node tests/head-to-head/run.mjs --assets NEW_ASSETS --catalogue --cases demuxe.auto.h264-srt --headed --output BASE_PROOF
node tests/head-to-head/run.mjs --assets NEW_ASSETS --catalogue --demuxe-mode native --component-trial subtitles --cases demuxe.native.h264-srt --headed --output CANDIDATE_PROOF
node tests/head-to-head/component-isolation-lifecycle.mjs NEW_ASSETS LIFECYCLE_PROOF
node tests/head-to-head/component-isolation-performance.mjs NEW_ASSETS BASE_PROOF CANDIDATE_PROOF LIFECYCLE_PROOF h264-srt PERFORMANCE_OUT --exclusive
```

Other explicit strategies are `--component-trial audio`, `dash` and `direct`; the latter is used for live HLS. None changes production admission. Exact executed commands and snapshot hashes are in each result.
