# Demuxe media/browser frontier — R116–R131 executed results

**Run date:** 17 September 2026  
**Environment:** Chromium 144.0.7559.96, FFmpeg 7.1.5, Linux x86-64.  
**Scope:** routing, muxing, container-timeline manipulation, MSE behavior and Chrome playback. No Demuxe production source changes.

## Result summary

| ID | Verdict | Result |
|---|---|---|
| R116 | **PROMISING** | MSE `sequence` mode placed three zero-based H.264 clips adjacently with no timestamp rewrite: 6.0 s, red→green→blue. |
| R117 | **PROMISING** | `timestampOffset` built the same edit in `segments` mode while preserving the original fragments. |
| R118 | **PROMISING / BOUNDED** | `appendWindowStart/End` filtered a 4 s encoded source to ~1.067–2.900 s while preserving the desired red/blue samples. |
| R119 | **PROMISING** | Removed the future 2–4 s range and inserted a new green clip on the same SourceBuffer; output became red→green. |
| R120 | **PROMISING / STORAGE-EDITING** | Three repeated edit-list entries turned one 2 s `mdat` into ~5.967 s red/green×3; only metadata grew. Chrome still decoded repeated samples each pass. |
| R121 | **PROMISING / TIMELINE EFFECT** | A middle empty edit produced a 1 s hold of the red frame, then resumed green, with unchanged `mdat`; no decode/presentation-work saving. |
| R122 | **PROMISING / STRONG** | `stts`/duration metadata alone changed three coded frames from 3→6 s. `mdat` was identical and Chrome decoded only 3 frames. |
| R123 | **PROMISING** | WebM `DiscardPadding=13.5 ms` removed exactly 648 tail samples while every Opus packet payload remained unchanged. |
| R124 | **NOT QUALIFIED / REJECT NAIVE COMPOSITION** | Adding -5 ms first-block DiscardPadding on top of existing Opus delay metadata did not behave as an independent 5 ms head crop. |
| R125 | **PROMISING** | WebM `DefaultDuration` allowed the first partial VP8 block to become a 0–100 ms buffered frame; removing the 8-byte element left no buffered frame. |
| R126 | **PROMISING** | One SourceBuffer changed bytestream WebM/VP9 → MP4/VP9 and played green→blue continuously. |
| R127 | **PROMISING** | `sequence` + `changeType()` concatenated H.264/fMP4 → VP9/WebM with no explicit timestamp offset. |
| R128 | **NOT A DECODE OPTIMIZATION** | Chrome decoded all 300 frames at 1×, 4× and 16×; high rates primarily dropped presentation. |
| R129 | **PROMISING SEMANTIC / PERFORMANCE INCONCLUSIVE** | `preservesPitch=false` changed 440→~883 Hz at 2×. Small process-CPU samples lean lower but overlap. |
| R130 | **INCONCLUSIVE / REQUEST-SHAPING ONLY** | Front vs tail WebM Cues changed fetch timing, but total bytes through metadata + 50 s seek were ~786–788 KiB in both cases. |
| R131 | **PROMISING / STRONG** | Global `sidx` reduced bytes needed through metadata + 50 s seek from 3,362,971 to 1,069,611 (**68.2% less**) under capped Range responses. |

## R116–R119 — MSE as an edit engine

The MSE specification explicitly defines `sequence` mode as placing new media segments adjacent independently of their encoded timestamps, and defines append windows as filters over coded-frame presentation timestamps. The sandbox confirms those primitives can be used as real media-editing operations in Chromium 144.

**R116:** three independently generated fMP4 clips all start at source time zero. Appending their media segments in `sequence` mode produced one exact `[0,6]` buffered range and red/green/blue samples at 0.5/2.5/4.5 s. No packet timestamp rewriting was performed by the application.

**R117:** the same fragments in ordinary `segments` mode worked with explicit offsets 0/2/4 s. The observed range was `[0.066666,6.066666]`, retaining the source's H.264 timestamp lead. This highlights a useful distinction: sequence mode constructs an adjacent output timeline automatically, while direct offsetting preserves the source epoch's internal timing relationship.

**R118:** append-window filtering accepted all source bytes but retained only coded frames in the requested window. The final range was approximately `[1.066666,2.899999]`. This is useful for in-browser trimming, but it does **not** save transport bytes: Chrome still receives/parses the supplied media.

**R119:** after appending the red→blue source, the future `[2,4]` range was removed and an independent green clip was appended at offset 2. The same SourceBuffer then showed red at 1.5 s and green at 2.5/3.5 s. This demonstrates bounded in-place future replacement without reconstructing the MediaSource.

## R120–R122 — MP4 metadata as executable editing

These are the strongest new container findings.

### R120 — Repeat media without repeating `mdat`

The original MP4 contains two seconds of red→green media. Its one edit-list entry was replaced by three identical entries. The edit metadata grew by only **24 bytes**, while the `mdat` SHA-256 stayed identical. Chrome reports **5.966667 s** and presents:

`red → green → red → green → red → green`.

This is effectively a metadata-only loop/reuse operation. It is a storage and editing win, **not a decode-cache win**: Chrome reported 180 total video frames versus 60 for the original, so it processed the repeated media again.

### R121 — Insert a freeze with an empty edit

A second edit-list construction maps the first source second, inserts a one-second empty edit, then maps the second source second. Chrome holds the previous red image through the middle interval and resumes green after 2 s. The `mdat` is unchanged and the file grows only by the two additional edit records.

At 8× Chrome reported 88 total frames for the ~2.967 s presentation, so this should be understood as **metadata-directed timeline behavior**, not a sparse-decode mechanism.

### R122 — Retime existing frames without creating new pictures

The three-frame all-intra MP4 was changed from one-second to two-second sample durations by modifying timing tables and container durations only. The `mdat` is byte-identical. Chrome reports 6.0 s, shows red/green/blue for two seconds each, and reports only **3 total decoded video frames**.

This is a useful complement to R96: sparse/held presentations do not necessarily require a new video encode when the existing compressed samples already correspond to the desired visual states.

## R123–R125 — WebM timing metadata

**R123:** FFmpeg's normal Opus WebM had positive `DiscardPadding=13,500,000 ns` on the final block. Zeroing that metadata changed decoded output from **96,000 → 96,648 samples**, exactly 648 samples = 13.5 ms at 48 kHz. Concatenated Opus packet payload SHA-256 stayed identical. Chrome plays both files and reports the same nominal 2.008 s container duration, so output trimming and HTML timeline metadata are separate observations.

**R124:** RFC 9559 defines negative DiscardPadding as beginning padding. However, naively adding -5 ms to the first Opus block **on top of the file's existing Opus CodecDelay/pre-skip state** did not compose as an extra 240-sample crop: output became 96,072 samples instead of 96,000. The encoded packets remained identical. Do not treat arbitrary negative DiscardPadding insertion as a standalone head-trim operation without reconciling the codec's existing delay model.

**R125:** removing only the 8-byte `DefaultDuration` element from an otherwise identical three-frame VP8 WebM changes Chrome's behavior under a partial MSE append. With the default, one block immediately produced `[0,0.1]` buffered and one presented frame. Without it, the exact first block produced no buffered range and no frame until more timestamp information exists. This generalizes R112: parser timing information can affect output availability without changing codec data or delivery timing.

## R126–R127 — change container and codec inside one SourceBuffer

R126 changes **bytestream format while keeping VP9**: WebM/VP9 → MP4/VP9. Both MIME types are accepted, `changeType()` succeeds, and one SourceBuffer presents green then blue over ~4 s.

R127 goes farther: H.264/fMP4 → VP9/WebM. `sequence` mode keeps the independent second clip adjacent without setting `timestampOffset`; the result is a contiguous 4 s red→green presentation.

These are bounded Chrome 144 observations. A successful SourceBuffer transition does not prove decoder-object reuse internally.

## R128 — fast playback does not imply cheap decoding

On the same 300-frame H.264 source:

| Rate | Wall time | rVFC callbacks | totalVideoFrames | droppedVideoFrames |
|---:|---:|---:|---:|---:|
| 1× | 9976.9 ms | 300 | 300 | 0 |
| 4× | 2465.5 ms | 148 | 300 | 7 |
| 16× | 651.3 ms | 23 | 300 | 277 |

Chrome decoded **all 300 frames at every rate**. At 16× it presented very few callbacks and counted 277 dropped frames. Therefore a prepared dependency-valid temporal-thinning route remains meaningfully different from simply setting `playbackRate` high.

## R129 — pitch preservation is a real optional processing stage

At 2× playback, the Web Audio analyser observed ~**441.43 Hz** with pitch preservation enabled and ~**882.86 Hz** with it disabled. That matches HTML's specified semantics.

A small audio-only aggregate Chromium-process screen produced median CPU of **0.080 s** with pitch preservation and **0.070 s** without it over ~2 s runs (apparent reduction ~12.5%). These samples overlap, CPU accounting is coarse at 10 ms increments, and no physical audio-device path was measured, so this is **not** a qualified performance win. It is a plausible optional-cost removal when changed pitch is explicitly acceptable.

## R130 — WebM Cues placement changes request timing, not total work here

Under a local server that caps each HTTP Range response at 256 KiB:

| | Cues at tail | Cues at front |
|---|---:|---:|
| Bytes to metadata | 263,663 | 524,288 |
| Additional bytes for seek to 50 s | 524,288 | 262,144 |
| Total | 787,951 | 786,432 |

Tail Cues caused a small 1,519-byte tail fetch during metadata and more bytes at seek time; front Cues pulled more early and less later. Total traffic differs by only 0.19%. This looks like a latency/request-shaping policy rather than a byte-saving optimization in this workload.

## R131 — global MP4 sidx materially changes remote access

The two 60-second fMP4 files use the same codec/source construction; one contains a global `sidx`, the other uses `skip_sidx`.

Under the same 256 KiB-capped Range server:

| | global sidx | no sidx |
|---|---:|---:|
| Bytes before metadata is ready | 807,467 | 3,362,971 |
| Additional bytes for seek to 50 s | 262,144 | 0 |
| Total through the seek | 1,069,611 | 3,362,971 |

Without `sidx`, Chromium sequentially requested essentially the entire **3,362,971-byte** resource before metadata became ready. With `sidx`, the total through the same metadata+seek operation was **1,069,611 bytes**, a **68.2% reduction**.

This is a synthetic local Range server and one Chrome build; response cap, latency and server behavior can change the exact savings. But the qualitative result is strong: the index allows materially more selective access.

## Evidence boundary

- Browser tests use Chromium 144.0.7559.96 on Linux/headless software-backed presentation; no hardware decoder/overlay or power claim is made.
- Host FFmpeg is 7.1.5. Host decoding is used for exact PCM/container checks, not as a forecast of browser/Wasm cost.
- MSE tests use injected local bytes. R130/R131 use real loopback HTTP Range requests from a media element, without navigating the page to the blocked localhost origin.
- Source bytes, packet payloads, container metadata, decoded samples and presented frames are kept as separate evidence levels.
- R129 process CPU is a deliberately weak component screen; the frequency/semantic result is much stronger than the performance result.

## QA

**31/31 bounded evidence checks passed.** See `results/qa.json`, `results/summary.json`, scripts and fixtures for the complete evidence.