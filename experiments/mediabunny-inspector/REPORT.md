# MediaBunny as a Demuxe source inspector

**Scope:** MediaBunny 1.60.0, local-file automatic routing, Chrome 153.0.8010.53, Demuxe `f2e35538caf98e9e6e2efbbe1766e9b0fae1c8ea`, 2026-09-25. Production routing and playback files were not edited. [Raw measurements](notes/cold-probe.json), [runner](benchmark/run.mjs), and [probe adapter](benchmark/inspector.mjs) are experiment only.

Fixtures and SHA-256 hashes are in [notes/fixtures.json](notes/fixtures.json). Several format variants were generated in `/tmp` by [benchmark/prepare.py](benchmark/prepare.py); rerun that generator before this benchmark if those temporary files are absent. The remaining fixtures are existing Demuxe files.

## 1. Current inspection flow

```text
Player.open(File / URL)
  → select()
      → explicit demuxer, filters, or forced non-Native mode? skip normal tier probe
      → local File and nativeRemux != "always"? cheapMP4Probe (bounded at 256 KiB metadata)
      → if still unknown and crossOriginIsolated:
           import web/source-probe.js
           await optional prepared engine-remux module
           source worker: LocalFileReader or authenticated RangeReader
           probe worker: import engine-remux/remux.mjs
                         instantiate engine-remux/remux.wasm
                         _rm_probe(size)
                           → avformat_open_input + avformat_find_stream_info
                           → FFmpeg track/config/timeline metadata
                         → hybridPreflight()
      → nativeRejection() and store Probe
      → admissible(): planAdmission + browser canPlayType/MSE queries
      → discover(): trial in plan order, runtime startup verification
```

The source is inspected **before** the plan is chosen. `_rm_probe` is not a decode step, but it does initialize the remux FFmpeg WASM engine, allocate its workers/mailbox, and run container/stream discovery. The browser then may choose `native-direct`, using the original `<video>` source for playback. That occurred for seven of seven complete non-cheap candidates tested with actual Player startup below. FFmpeg was loaded solely for inspection in six of those trials; the AC-3 trial also requested other engine assets later, so it is not evidence that the whole session stays FFmpeg-free.

`cheapMP4Probe` is tried only for local input, at the beginning of automatic/native selection, without filters/tone mapping or explicit demuxer, and when `nativeRemux !== 'always'`. It accepts a very narrow single-H.264/AAC MP4 shape, returning duration `0` and no WASM work. Remote URLs do not use it. Without cross-origin isolation, the FFmpeg probe is skipped and native routes remain possible with unknown inspection. `prepare('inspector')` can download/compile remux WASM earlier; in that case the cost is moved earlier, not eliminated. Manual Software and WebGPU qualification have separate probe calls.

The `Probe` influences more than a codec name: per-type stream IDs, global stream indices, default/forced tracks, embedded subtitle rejection, browser codec strings, duration, selected audio, AC-3 packet-copy rejection, selective audio and lossless adaptation gates, subtitle service assets, startup expectations, and Hybrid preflight. Remote inspection also supplies source identity for transport checks. A replacement must keep these decisions or defer to FFmpeg.

## 2. Experiment-only MediaBunny probe

`inspectFile(File)` creates a MediaBunny `BlobSource` and `Input({formats: ALL_FORMATS})`. It reads format, tracks, codec parameter strings, dispositions, dimensions, sample rate/channels, metadata duration, and tags. It maps stream IDs by **per-type ordinal**, matching Demuxe's `_rm_probe`; a global ordinal was initially wrong for audio and was corrected before the retained run. It then performs two independent, bounded checks over the original file:

- ISO BMFF: count every `trak` in `moov`, including tracks MediaBunny omitted. Reject fragmented, ambiguous, malformed, or oversized metadata.
- Matroska/WebM: walk top-level EBML elements, count `TrackEntry`, and detect `Attachments`. Reject unknown-sized children, incomplete structure, or budget overflow.

The adapter returns `{probe, complete, reasons, bytesRead, stages}`. `complete` here means *candidate metadata for the tested simple, default-track Native Direct admission*. It does **not** certify every future route or malformed-file behavior. The experimental playback shim substitutes this probe only for complete candidates and otherwise throws; a production trial must invoke the existing inspector on unknown results **and before trying another route if Native Direct fails**. Remote sources, explicit alternate track selection, multiple audio/video streams, PCM adaptation, and MPEG-TS remain FFmpeg-first.

The pinned browser bundle is 684,785 bytes ([vendor file](vendor/mediabunny-1.60.0.min.mjs), SHA-256 `ea3f1a537e64aa99e1e5af7d066977d4fac90bc6d71617200b4ab8147fb17f5a`, MPL-2.0 license alongside). This experiment uses MediaBunny for metadata only; no MediaBunny packet sink or decoder is involved.

## 3. Probe-field parity

| Field | Observed parity / consequence |
|---|---|
| Container, video/audio count, codec, dimensions, sample rate/channels, default flags | Matched for eight candidate-complete files after the ISO/EBML census. MPEG-TS default flags differed; it falls back. |
| Stream `id` and `index` | Per-type ordinal and global index matched FFmpeg for the simple files. Multiple tracks and explicit selection were not qualified. |
| Codec string | MediaBunny often supplied AAC, AV1, VP9, Opus, or AC-3 strings where FFmpeg's `Probe` omitted them. Browser query evidence changed from `unknown` to `supported` on AV1/VP9, but eligible plan sets and first plan did not change in the complete cases. This still needs a broader browser matrix before production. |
| Duration | Most fixtures matched; `fixtures/example.mp4` was 12.011 s (FFmpeg) versus 12.034 s (MediaBunny). `cheapMP4Probe` returns 0. MPEG-TS had 4.021 s versus MediaBunny's unavailable duration and fell back. |
| Per-track start/end, padding, bits, bitrate, frame rate | MediaBunny adapter did not reproduce FFmpeg's start/end, initial padding, and bits; it added some metadata bitrates. These are route inputs for selective audio and lossless adaptation. Those routes must re-probe with FFmpeg. |
| Subtitles/attachments | MediaBunny's returned tracks omitted ASS, SRT, and MOV text in tested files. Raw EBML/ISO track counts exposed the missing streams; EBML also detected the font attachment. Those sources fell back. Without the census, the ASS/SRT/MOV-text files would have been incorrectly admitted to `native-direct`. |
| Hybrid preflight | `_rm_probe` tests the FFmpeg-derived video configuration with `VideoDecoder.isConfigSupported`. The adapter does not recreate this exact evidence. If direct startup fails, rerun the FFmpeg inspector before Hybrid/Software selection. |
| Remote identity/authentication | Not mapped. Current `RangeReader` enforces identity, origin, headers, credentials, and authorization refresh. Remote sources must retain the existing inspector until those contracts have separate parity tests. |

## 4. Route-decision parity

The benchmark fed each probe into Demuxe's actual `nativeRejection`, `nativeBrowserCapabilities`, and `Player.admissible()` methods with default settings. This is exact *admission* logic, not proof of final playback; the separate Player trial below checked startup.

| Fixture | Candidate complete? | First eligible plan, FFmpeg / MediaBunny | Result |
|---|---:|---|---|
| MP4 H.264/AAC (`fixtures/example.mp4`) | yes | direct / direct | Existing cheap probe already wins. |
| MP4 HEVC/AAC; MP4 H.264/MP3 | yes | direct / direct | Useful beyond cheap probe. |
| MKV H.264/AAC; MKV HEVC/AAC; MKV AV1/Opus | yes | direct / direct | EBML census saw two A/V tracks and no attachments. |
| WebM VP9/Opus; MKV H.264/AC-3 | yes | direct / direct | AC-3 later touches other engine assets. |
| MOV H.264/PCM | no | direct / direct | PCM/timing/adaptation fields incomplete. |
| MPEG-TS H.264/AAC | no | direct / remux | Duration/default flag mismatch. |
| MP4 H.264/MOV text | no | Hybrid / direct | MediaBunny omitted subtitle track; ISO census catches it. |
| MKV H.264/AAC/ASS/font; MKV H.264/AAC/SRT | no | Hybrid / direct | MediaBunny omitted subtitle; EBML census catches it. |

All eligible-plan booleans matched across the eight complete candidates, including the simple MP4 already handled cheaply. On the seven non-cheap complete files, the first eligible plan was `native-direct` in both arms. Three subtitle files and MPEG-TS show why “MediaBunny parsed it” is not a safe promotion rule.

## 5. Cold-start measurements

The [runner](benchmark/run.mjs) uses a fresh browser context and page for each method, `Cache-Control: no-store`, a local `File` loaded through Playwright, and COOP/COEP isolation. Probe wall time includes dynamic module import through return of the `Probe`; it excludes route admission. Bytes below are server-served script/WASM body sizes, including a common ~21 KiB harness; local media-read counts come from MediaBunny source events plus raw census reads, and an [instrumented copy](benchmark/source-probe-instrumented.mjs) of Demuxe's source probe. The FFmpeg count excludes the separate ≤4 KiB local EBML format sniff; both counts include repeated reads, not unique byte ranges. Each probe timing is **one cold-context sample per fixture**, so small differences are indicative rather than stable percentiles. The same Chrome process and OS file cache were reused; these are not independent machine cold boots.

| Fixture | cheap MP4 | FFmpeg probe | MediaBunny probe | FFmpeg / MediaBunny local media reads |
|---|---:|---:|---:|---:|
| Simple MP4 H.264/AAC | 69 ms | 194 ms | 42 ms | 334 / 471 KiB |
| MP4 HEVC/AAC | 27 ms, rejects | 48 ms | 24 ms | 64 / 977 KiB |
| MKV H.264/AAC | 6 ms, rejects | 44 ms | 22 ms | 256 / 339 KiB |
| MKV HEVC/AAC | 4 ms, rejects | 50 ms | 24 ms | 64 / 252 KiB |
| MKV AV1/Opus | 6 ms, rejects | 45 ms | 22 ms | 64 / 334 KiB |
| WebM VP9/Opus | 4 ms, rejects | 37 ms | 22 ms | 64 / 332 KiB |
| MKV H.264/AC-3 | 5 ms, rejects | 41 ms | 22 ms | 256 / 378 KiB |

The direct FFmpeg probe loaded ~95 KiB JS plus one 3,258,453-byte remux WASM file (~3,277 KiB total script/WASM assets with common harness); MediaBunny loaded ~697 KiB JS and **zero WASM**. `cheapMP4Probe` loaded ~29 KiB and zero WASM. MediaBunny read *more* media bytes in these local tests, partly because `getMetadataTags()` and its source buffering do extra work. Do not infer a network saving. Chrome `Performance.getMetrics` attributed roughly 9–11 ms of **main-thread task time** to MediaBunny versus 5–6 ms for the FFmpeg arm; FFmpeg worker/WASM time is absent from that metric. Main-renderer heap deltas were roughly 1.2–1.6 MiB versus ~0.4 MiB, but FFmpeg's worker/WASM memory is absent. Neither number is a whole-process CPU or peak-memory comparison.

The real Player trial used the existing playback implementation in both arms, with Playwright serving a probe-only shim at `/web/source-probe.js` for MediaBunny. The shim passed only complete candidates. `Player.admissible()` was timestamped, and the first `<video>` frame was observed with `requestVideoFrameCallback`. Each arm ran three fresh contexts with alternating order:

| Fixture | Route both arms | Route admission current → MediaBunny | First presented frame current → MediaBunny (median) |
|---|---|---:|---:|
| MP4 HEVC/AAC | native-direct | 48 → 32 ms | 70 → 56 ms |
| MP4 H.264/MP3 | native-direct | 49 → 31 ms | 69 → 65 ms |
| MKV H.264/AAC | native-direct | 46 → 31 ms | 66 → 62 ms |
| MKV HEVC/AAC | native-direct | 43 → 29 ms | 63 → 50 ms |
| MKV AV1/Opus | native-direct | 43 → 31 ms | 67 → 51 ms |
| WebM VP9/Opus | native-direct | 44 → 30 ms | 67 → 50 ms |
| MKV H.264/AC-3 | native-direct | 100 → 48 ms | 122 → 72 ms |

The AC-3 arm was especially variable (current first-frame observations 329/122/73 ms); its session also requested selective/Hybrid assets, so its 50 ms median difference should not be generalized. One HEVC MP4 current observation was 277 ms, versus two near 70 ms. For the other six rows, first-frame median gains ranged **4–17 ms**. Route admission improved roughly 12–18 ms. These are small local fixture trials, not a population estimate or a claim about steady-state playback CPU. Video was presented in all retained trials.

## 6. When FFmpeg loading was avoided

In the seven non-cheap complete candidates, the MediaBunny arm selected the same `native-direct` route and did not request `engine-remux/remux.wasm` before route admission; the current arm did. Six of those trials remained a clean inspection-only WASM avoidance. The AC-3 trial loaded other optional engine assets later, even though initial remux inspection was bypassed. Across the ten minimum requested *format types*, five tested simple MKV/WebM types qualified beyond cheap MP4: MKV H.264/AAC, HEVC/AAC, AV1/Opus, H.264/AC-3, and WebM VP9/Opus. This is a fixture hit rate, **not** an estimate of how often user libraries contain such files.

## 7. FFmpeg fallback boundaries

- Embedded subtitles or attachments, including fonts; MediaBunny omitted the tested ASS/SRT/MOV-text tracks.
- MPEG-TS (missing duration and different default flags), PCM MOV (adaptation/timing fields), extra or unknown tracks, ambiguous/default selection, missing codec string, unsupported container, and census budget or parse failure.
- Remote URL/range sources until identity, auth refresh, request policy, and byte-use parity are measured. MediaBunny's higher local media-read counts are a warning for this case.
- Any direct playback failure before trying Remux, Hybrid, or Software, because the adapter does not supply FFmpeg's exact Hybrid preflight, per-track bounds/padding, or all specialized route inputs.
- Explicit demuxer hints, filters, manual Software policy admission, lossy controls, and unusual/malformed files not covered by the narrow local contract.

The raw result includes unknown and failed cells; the experiment never converts them into success by filling values from the FFmpeg result.

## 8. `cheapMP4Probe` comparison

Keep it. A focused [10-pair comparison](notes/cheap-vs-mediabunny.json) on `fixtures/example.mp4` used fresh Chrome contexts, alternated method order, and ran each method twice in its context. Both accepted 10/10 runs:

| Measure | `cheapMP4Probe` | MediaBunny inspector |
|---|---:|---:|
| First call, median | **7.4 ms** | 22.1 ms |
| First call, range | 6.2–54.9 ms | 19.8–136.4 ms |
| Second call in same context, median | **2.4 ms** | 3.1 ms |
| Local media bytes read, median | **16,329** | 503,873 (repeated reads counted) |
| Core parser JS asset | **7,341 bytes** | 684,785 bytes |

The first pair was slow for both methods, so the medians and spread are more useful than either first observation. These are context-cold runs in one browser process, not machine cold boots. `cheapMP4Probe` normally bypasses `source-probe.js` already; MediaBunny buys no route improvement for this accepted file. MediaBunny's useful MP4 niche is files cheap rejects, such as tested HEVC/AAC and H.264/MP3, after a separate track census.

## 9. Recommendation and direct answers

1. **Can it safely replace FFmpeg inspection for a useful subset?** Yes, as a conservative *first-pass local inspector for initial Native Direct admission*, with exact census and FFmpeg fallback. The PoC does not establish a general drop-in replacement.
2. **Which containers qualify?** Tested simple MP4, Matroska, and WebM with one video/audio pair, complete metadata, no hidden tracks/attachments, and default selection. Simple H.264/AAC MP4 is already handled by cheap probing. MOV/PCM and MPEG-TS did not qualify here.
3. **How often does this avoid loading FFmpeg before Native Direct?** Seven of 13 tested fixtures qualified beyond cheap; all seven had matching direct admission and actual direct startup. Five of the ten requested format types qualified. This does not predict real-library frequency.
4. **Cold-start/first-frame improvement?** Probe wall time was ~37–50 ms FFmpeg versus ~21–24 ms MediaBunny on representative non-cheap direct cases, with 3.26 MB remux WASM fetch removed. Route admission medians were ~12–18 ms earlier; first-frame medians improved 4–17 ms for the six clean cases, with AC-3 too noisy/specialized to generalize.
5. **Replace cheap MP4?** Complement it. Retain cheap MP4 first.
6. **Production opt-in experiment?** **Yes, narrowly:** local immutable files only; cheap MP4 first; MediaBunny + bounded container track census second; accept only the one-video/one-audio default-selection Native Direct candidate with complete codec/duration evidence; re-run FFmpeg inspection before any alternate route. Add differential tests for real files, browsers, malformed/fragmented files, alternate tracks, and URL identity before widening. Do not change playback engines.

The clearest benefit is avoiding a large engine download/initialization for a route that will play the original source. The measured first-frame gain is modest and noisy, while MediaBunny increases JS and local media reads. The opt-in slice is justified by the asset-loading reduction, provided the fallback remains strict.
