# Demuxe Fast Inspector: routing evidence experiment

Experiment date: 2026-09-25. Demuxe baseline HEAD: `f2e35538caf98e9e6e2efbbe1766e9b0fae1c8ea`. Browser: headless Google Chrome 153.0.8010.53 on the local macOS host. The original measurements preceded the guarded production integration described in §8.

## Conclusion

A bounded, routing-specific parser can cover the ordinary MP4/MOV, Matroska/WebM, simple audio, and recognized embedded-subtitle examples in this fixture set. It avoids the 3,258,453-byte `engine-remux/remux.wasm` inspection download when the eventual route can proceed without that inspector. It does **not** replace FFmpeg playback services: subtitle-bearing files that selected `native-direct-mpv` still loaded `engine-subtitles/service.wasm`, and some AC-3 cases also loaded selective and hybrid assets through current preparation. The strongest result is route parity and reduced inspection loading, not a claim about steady-state CPU.

The preferred next design is `cheapMP4Probe → Fast Inspector → FFmpeg inspector on unknown`, initially for **immutable local files** and narrowly qualified automatic routes. Keep the existing cheap MP4 parser. In the focused matrix, 17 Native Direct cases that missed `cheapMP4Probe` and eight subtitle-assisted Native Direct cases could avoid loading `engine-remux` merely for inspection. The subtitle routes still need their separate mpv service. A production integration needs a real fallback on `unknown`, explicit readiness for the selected plan, and malformed-file tests; the experiment shim intentionally covers only known-qualified files.

## 1. Current inspection and route flow

For automatic local `open()`, [`unified-player.ts`](../../src/unified-player.ts) dynamically imports `web/cheap-mp4-probe.js` if no explicit demuxer, media filters, or forced remux policy disqualifies the cheap path. A successful simple MP4 probe supplies `Probe` directly. Otherwise, when cross-origin isolated, it imports `web/source-probe.js`, awaits a prepared `engine-remux` module if present, starts source/probe workers, instantiates the remux FFmpeg engine, and calls `_rm_probe`. The resulting track list, duration, format, and hybrid rejection are passed through `nativeRejection`, `nativeBrowserCapabilities`, and `Player.admissible`. Optional mpv subtitle or selective-audio asset availability is also checked before final admission. A source can therefore finish with `native-direct` or `native-direct-mpv` after an FFmpeg inspection. Subsequent Native playback uses the existing `<video>` path, optionally with mpv subtitles; the inspection engine is not thereby the playback demuxer.

```text
local file
  → cheapMP4Probe, if eligible
  → on miss: source-probe.js → source worker → engine-remux WASM → _rm_probe
  → Probe tracks/duration/format → nativeRejection + browser capability + planAdmission
  → Native Direct / Native Direct + mpv subtitles / Remux / Hybrid / Software

experiment-only local file
  → bounded Fast Inspector → same Probe/planAdmission
  → on unknown: proposed FFmpeg inspector fallback (not wired into production)
```

The experiment's `sufficientFor` is deliberately limited. Plain qualified files supply initial Native Direct evidence. Recognized subtitle files supply the embedded track census and Native Direct rejection / Native Direct + mpv subtitle admission evidence. Remux packet preparation, selective audio, subtitle rendering, and other routes can still require FFmpeg.

## 2. Prototype and guardrails

The parser, now in [`web/fast-source-inspector.js`](../../web/fast-source-inspector.js) and re-exported by [`benchmark/fast-inspector.mjs`](benchmark/fast-inspector.mjs), reads a maximum of 96 file slices and 2 MiB of source bytes, with a 1 MiB metadata-object cap. It returns `qualified` only after a bounded complete track census; otherwise it returns `unknown` with a reason. It never reads coded packets or builds sample tables/Clusters.

| Family | Implemented routing facts | Immediate unknown |
|---|---|---|
| ISO BMFF MP4/MOV | `ftyp`, `moov`, `trak`, `mdhd`, `tkhd`, `hdlr`, one `stsd`; H.264/HEVC/AV1/VP9, AAC LC/MP3/Opus/FLAC/PCM; track IDs/order, dimensions, channels/rate, language, `tx3g`/QuickTime text → `mov_text` | fragments, encryption, complex edits, rotation, alternate A/V tracks, unknown sample entries, large/ambiguous metadata |
| Matroska/WebM | EBML/Segment/Info/Tracks; common A/V CodecIDs/private headers, default/forced/enabled, language/title, subtitle CodecIDs, bounded attachment metadata | content encoding, linked segments, unknown CodecID, non-font/ambiguous attachments, absent required private data, metadata/read budget exceeded |
| Simple audio | WAV PCM16/24, FLAC STREAMINFO, MP3 with bounded ID3 and two agreeing frames, ADTS AAC LC | attached picture, changing/unsupported frames, more complicated metadata |
| Ogg, MPEG-TS, HLS | Screened only | FFmpeg or existing manifest path; no general page/serial, PAT/PMT, or manifest parser was added |

Parser structure is cursor-based with bounded skips. The EBML path visits top-level element headers to prove whether attachments exist, skips Cluster and attachment payloads by size, and interprets only font name/MIME metadata. Small header read windows may overlap payload bytes, but no payload is decoded or scanned. The proof can become too costly on files with many top-level elements; it then declines rather than guessing. `S_TEXT/ASS`, `S_TEXT/SSA`, `S_TEXT/UTF8`, `S_HDMV/PGS`, and `S_VOBSUB` map to Demuxe's `ass`, `ssa`, `subrip`, `hdmv_pgs_subtitle`, and `dvd_subtitle`. MP4/MOV `sbtl`/`subt`/`text`/`clcp` handlers are accepted only with recognized `tx3g` or QuickTime `text` sample entries. No subtitle packets, ASS events, bitmap data, or rendering are parsed. The `SSA` mapping has no independent file fixture in this run; ASS, SRT, PGS, VobSub, and `mov_text` do.

Two experiment-only byte mutations of `fixtures/m0.mkv` checked the conservative boundary: replacing `S_TEXT/ASS` with `S_TEXT/XYZ` returned `unknown` after 4,160 bytes, and changing the `.ttf` attachment name to `.bin` returned `unknown` after 4,416 bytes. They are parser rejection probes, not valid media playback fixtures; results are in `notes/subtitle-negative.json`.

## 3. Method and artifacts

[`benchmark/run.mjs`](benchmark/run.mjs) compares the fast parser, the pinned MediaBunny 1.60.0 adapter, current FFmpeg/WASM source inspection, and `cheapMP4Probe` in independent no-store browser contexts. It passes each resulting `Probe` to the existing `Player.admissible` with the same browser capability queries. [`benchmark/playback.mjs`](benchmark/playback.mjs) tests unchanged `Player.open()` and first video frame with an experiment-only import interception of `source-probe.js`; its shim accepts only `qualified` results and throws on `unknown`. It is **not** a production fallback implementation. [`benchmark/screen-catalogue.mjs`](benchmark/screen-catalogue.mjs) screens available fixture trees read-only. Raw observations are in [`result.json`](result.json) and `notes/*.json`.

The benchmark page also has a `cascade` method that uses the fast result when qualified and invokes the unchanged FFmpeg inspector after `unknown`. Its five-case smoke run returned the same route as FFmpeg for simple MP4, fragmented MP4, ProRes MOV, Ogg Opus, and MPEG-TS. In one fresh-context sample each, unknown-case cascades took about **68–73 ms** versus **42–60 ms** for FFmpeg directly. The extra fast pass therefore has a cost on known fallback formats. A production router should bypass the fast module for obvious Ogg/TS/manifest signatures where its current coverage is zero; this proposed signature gate has not been timed here.

Reproduce locally: generate shared synthetic files with `python3 experiments/mediabunny-inspector/benchmark/prepare.py`, then `python3 experiments/fast-inspector/benchmark/prepare-extra.py`; run `node experiments/fast-inspector/benchmark/run.mjs` and `node experiments/fast-inspector/benchmark/screen-catalogue.mjs`. Benchmark files are local `File` inputs, not HTTP range sources. Fresh browser **contexts** were used; the browser process and OS filesystem cache were reused. The first measured row often includes JIT/host outliers, so paired medians and raw rows are retained. JS/WASM sizes are uncompressed server response bytes. Renderer task/heap deltas do not include FFmpeg worker CPU or WASM heap; process peak memory and GC were not established.

The benchmark directory vendors MediaBunny 1.60.0 and its license solely for the comparison arm, plus a byte-identical copy of the instrumented FFmpeg source inspector from the prior experiment. A post-copy three-arm smoke run is in `notes/self-contained-smoke.json`. The Fast Inspector itself imports neither MediaBunny nor FFmpeg.

## 4. Probe and route parity

The 31-case focused matrix contains ordinary A/V, audio-only, difficult containers, and eight embedded-subtitle cases. The final parser qualifies 26/31; all qualified cases select the same first eligible admission plan as the FFmpeg probe. In the earlier no-subtitle set, it covered all 12/12 files marked complete by the **conservative MediaBunny routing adapter**, plus simple audio/MOV cases. That ratio is not MediaBunny's full parser coverage. The five intended declines are fragmented MP4, ProRes MOV, Ogg Opus/Vorbis, and MPEG-TS; route selection for these remains FFmpeg's job. `cheapMP4Probe` qualified only the simple H.264/AAC MP4 among the focused ISO samples.

For qualified files, track order, type, codec, per-type ID, and selected/default/forced state matched the current FFmpeg `Probe` on the focused subtitle set. The fast parser omits FFmpeg's packet-derived start/end times, initial padding, bitrates, and support annotations. Those are material for selective audio, adaptation, and other admission paths. The `Probe` extension `attachments` records recognized Matroska fonts; current FFmpeg `Probe` does not expose attachments, although a separate `ffprobe` stream inventory confirmed the `DejaVuSans.ttf` attachment in `fixtures/m0.mkv`. When no language/title exists, FFmpeg uses empty strings and the fast parser now does likewise; QuickTime's `0x7fff` unspecified language is normalized to `und`.

| Subtitle fixture | Fast codec | FFmpeg codec | Default/forced, order | Initial admission | Actual unchanged Player route |
|---|---|---|---|---|---|
| H.264/AAC + `mov_text` MP4 | `mov_text` | same | match | `hybrid` in asset-free harness | `native-direct-mpv` in both arms |
| H.264/AAC + ASS + font MKV | `ass` | same | match; font detected | `hybrid` | `native-direct-mpv` in both |
| H.264/AAC + ASS MKV | `ass` | same | match | `hybrid` | `native-direct-mpv` in both |
| H.264/AC-3 + ASS MKV | `ass` | same | match | `hybrid` | `native-direct-mpv` in both |
| H.264/AAC + SRT MKV | `subrip` | same | match | `hybrid` | `native-direct-mpv` in both |
| H.264/AAC + PGS MKV | `hdmv_pgs_subtitle` | same | match | `hybrid` | `native-direct-mpv` in both |
| HEVC/AC-3 + PGS MKV | `hdmv_pgs_subtitle` | same | match | `hybrid` | `native-direct-mpv` in both |
| H.264/AC-3 + VobSub MKV | `dvd_subtitle` | same | match | `hybrid` | `native-direct-mpv` in both |

The asset-free admission harness cannot mark `native-direct-mpv` eligible because it does not perform Player's optional subtitle-service HEAD checks. Actual `open()` does, and matched 24/24 paired subtitle opens across eight fixtures and three fresh contexts per arm. All reached a first video frame without an error. This proves route and video-start behavior on these fixtures; it does not prove every subtitle event renders correctly. The current route itself still owns subtitle rendering.

| Actual Player fixture | Current first video frame median | Fast first video frame median | Current `open()` median | Fast `open()` median |
|---|---:|---:|---:|---:|
| MP4 `mov_text` | 89 ms | 36 ms | 289 ms | 251 ms |
| MKV ASS + font | 71 ms | 33 ms | 310 ms | 290 ms |
| MKV H.264/AAC ASS | 68 ms | 51 ms | 342 ms | 318 ms |
| MKV H.264/AC-3 ASS | 129 ms | 84 ms | 497 ms | 536 ms |
| MKV SRT | 58 ms | 52 ms | 282 ms | 270 ms |
| MKV PGS | 80 ms | 45 ms | 231 ms | 221 ms |
| MKV HEVC/AC-3 PGS | 159 ms | 79 ms | 471 ms | 368 ms |
| MKV H.264/AC-3 VobSub | 141 ms | 48 ms | 355 ms | 295 ms |

These three-pair medians are small, host-sensitive samples. In particular, H.264/AC-3 ASS had a slower Fast `open()` median despite a faster first video frame; a broader campaign is needed before claiming a reliable per-format first-frame gain.

## 5. Cost and optimization observations

The previous matched simple-MP4 baseline remains directional: `cheapMP4Probe` was about **7.4 ms first / 2.4 ms repeat / 16,329 local bytes**, versus MediaBunny **22.1 ms / 3.1 ms / about 504 KB**. That is a reason to retain the tiny parser, not replace it wholesale. On five fresh-context repeats in this investigation, representative cold-probe medians were: HEVC MP4 **4.7 ms fast / 23.7 ms MediaBunny / 50.3 ms FFmpeg**, H.264/AAC MKV **6.6 / 24.3 / 48.9 ms**, and FLAC audio **3.3 / 17.1 / 39.4 ms**. These are local host measurements, not universal timings.

For an H.264/AAC MKV, the one-run asset ledger recorded about **46 KB JS + 0 WASM** for Fast Inspector, **715 KB JS + 0 WASM** for the MediaBunny adapter, and **98 KB JS + 3.26 MB WASM** for FFmpeg inspection. Common harness JS is included in each. The MediaBunny adapter fetches more media metadata than the fast parser; it is a comparison baseline, not a general conclusion that the library is slow.

| Subtitle fixture | Fast median probe | FFmpeg median probe | Fast media bytes / reads | FFmpeg fetched bytes / requests |
|---|---:|---:|---:|---:|
| `mov_text` MP4 | 4.7 ms | 48.0 ms | 41,893 / 3 | 65,536 / 1 |
| ASS + font MKV | 7.5 ms | 43.8 ms | 6,136 / 10 | 889,355 / 6 |
| H.264/AAC ASS MKV | 15.0 ms | 49.0 ms | 13,376 / 38 | 65,536 / 1 |
| H.264/AC-3 ASS MKV | 14.5 ms | 39.6 ms | 13,376 / 38 | 65,536 / 1 |
| SRT MKV | 13.9 ms | 39.4 ms | 13,376 / 38 | 65,536 / 1 |
| H.264/AAC PGS MKV | 15.9 ms | 46.6 ms | 13,376 / 38 | 65,536 / 1 |
| HEVC/AC-3 PGS MKV | 15.3 ms | 40.1 ms | 13,376 / 38 | 65,536 / 1 |
| VobSub MKV | 14.1 ms | 44.4 ms | 13,376 / 38 | 65,536 / 1 |

The H.264/AAC ASS row uses a separate seven-context repeat because the initial three-context set contained two large fast-arm host outliers (71 and 519 ms); both raw sets are retained. No data was discarded from the final source artifacts.

The 256-byte Matroska top-level header window reduced SRT metadata reads from about **148 KB to 13 KB** with a similar ~15 ms median; it did not eliminate the 38 serial `Blob.slice()` reads. On the font fixture, it reduced reads from about **29 KB to 6 KB** but added a small ~2 ms median in this short run. The previous ISO header-cache ablation saved under 1 ms cold and about 0.8 ms warm on HEVC MP4 while halving file read calls from six to three. Inlining the now **26,748-byte** parser into core was **not** tested end-to-end; the dynamic import adds a few milliseconds in the harness, but moving it into core also charges every session. The prototype still creates short-lived `DataView` objects and uses a few tiny track-list `filter` calls. No allocation profile established that eliminating them would materially improve the total route decision. Browser capability checks were kept after one metadata pass. A serial precheck before proving the full track census cannot safely rule out subtitles or encryption; no measured benefit justified it.

In three paired contexts for each of three plain Native Direct examples, unchanged Player median first frame improved from **74.5 to 39.2 ms** (HEVC MP4), **80.3 to 39.7 ms** (H.264/AAC MKV), and **72.5 to 35.6 ms** (VP9/Opus WebM). For subtitle fixtures, actual first-frame medians were **89→36 ms** (`mov_text`), **71→33 ms** (ASS/font), **67→51 ms** (ASS), **58→52 ms** (SRT), and **80→45 ms** (PGS). AC-3 pair timings were noisier, and first-video-frame timing does not include verified subtitle output. Current subtitle arms loaded `engine-remux/remux.wasm` plus `engine-subtitles/service.wasm`; fast arms omitted only the inspection WASM. Current and fast arms kept the same playback routes.

## 6. Coverage and fallbacks

The read-only local catalogue screen contains **172** media-looking files: 76 qualified and 96 unknown. It includes 37 DASH WebM chunks and 36 HLS TS segments that are not standalone file inputs. Excluding those 73 segments gives **76/99 standalone-like files (76.8%)**. By extension: MP4 14/19, M4A 1/1, MKV 45/52, WebM 9/9 standalone, WAV 3/3, FLAC 2/2, MP3 2/2, MOV 0/2 (both ProRes), TS 0/3 standalone, Ogg 0/2, AVI 0/3, and MPG 0/1. The detailed file list and every decline reason are in `notes/catalogue-screen.json`.

The checked-in fixture `catalogue.json` has 71 named entries: 51 qualified, 10 safely declined, and 10 entries with no directly screened standalone media file (specialist placeholders or HLS/DASH manifests). This is an inventory screen, not paired browser route parity for every catalogue row. The focused 31-case matrix supplies paired FFmpeg and browser decisions. The available fixture trees and hashes are recorded in `notes/fixture-manifest.json`; no claim is made about unavailable external media or other browser configurations.

Immediate FFmpeg fallbacks remain appropriate for unknown subtitle CodecIDs/sample entries, content encodings or encryption, non-font/ambiguous attachments, linked Matroska segments, complex MP4 edit lists, rotation, fragmentation, ProRes/other unsupported codecs, Ogg, MPEG-TS, malformed files, and cases needing packet-derived duration or track bounds. Recognized subtitle metadata is sufficient to reject ordinary Native Direct and evaluate the existing mpv subtitle plan; the mpv service still reads and decodes subtitles. Files with many Matroska top-level elements may hit the 96-read budget. Expanding that indefinitely, scanning coded packets, or reconstructing exact timestamps would turn this into a general demuxer and is outside the experiment.

## 7. Recommendation and direct answers

1. **How much broader?** On the focused matrix, 26/31 after subtitle recognition, compared with one focused ISO file for `cheapMP4Probe`. The parser still has no packet iteration or seeking.
2. **Ordinary MP4/MOV and MKV/WebM?** Yes for the simple, bounded, unencrypted examples tested; Matroska subtitle CodecIDs and one embedded font are now covered. Complex packaging declines.
3. **MediaBunny useful-routing coverage matched?** All 12/12 cases completed by the prior conservative MediaBunny 1.60.0 adapter. This is an adapter-qualified subset, not a percentage of MediaBunny's total format coverage.
4. **Latency and bytes?** Representative plain-file cold medians were ~3–7 ms fast versus ~17–24 ms MediaBunny and ~39–50 ms FFmpeg; subtitle examples were ~5–16 ms fast versus ~40–50 ms FFmpeg. Host outliers are retained. Fast often reads substantially fewer media bytes, though the 38-read MKV header scan remains a latency cost.
5. **Can MediaBunny be omitted from the production inspection stack?** The evidence supports trying Fast → FFmpeg without a permanent MediaBunny inspection layer for the qualified local-file subset. It does not establish comprehensive coverage.
6. **Immediate FFmpeg fallbacks?** Ogg, TS, fragmented/encrypted/complex ISO, unsupported codecs, ambiguous subtitle or attachment semantics, and any route needing packet-derived bounds or metadata.
7. **Parser optimizations?** The ISO cache saved under 1 ms cold; the 256-byte EBML window cut bytes sharply without a clear latency gain. Core inlining remains unmeasured.
8. **Browser-informed targeting?** Existing browser checks after the bounded metadata pass are useful. An extra serial capability precheck before track census has no demonstrated benefit and can miss disqualifying tracks.
9. **Production architecture?** Keep `cheapMP4Probe`; try the Fast Inspector on plausible immutable local files; bypass it for known-unsupported signatures when cheap to identify; use the existing FFmpeg inspector on `unknown` or when the selected plan needs information not proved by the fast result. Do not replace playback paths.
10. **Smallest integration candidate?** Opt-in automatic local MKV/WebM and non-cheap MP4/MOV inspection for `native-direct`, then recognized single-subtitle `native-direct-mpv` files after explicit attachment/track parity and fallback gates. Retain detailed route and bytes telemetry.

The subtitle-specific result is narrower but concrete: recognized subtitle metadata on eight focused files led to the same actual existing route without `engine-remux` inspection. All eight still used the existing mpv subtitle service; the experiment neither decodes nor renders subtitles.

## 8. Production integration and review follow-up

After the experiment, the bounded parser moved to [`web/fast-source-inspector.js`](../../web/fast-source-inspector.js). The benchmark's `fast-inspector.mjs` re-exports that same implementation. Automatic local inspection retains the narrow MP4 first pass, now named `inspectSimpleMP4` in [`web/simple-mp4-inspector.js`](../../web/simple-mp4-inspector.js), then tries Fast Inspector only for ordinary local sources with automatic track selection and no external tracks. The prior `cheapMP4Probe` name remains as a compatibility export for `demuxe-core/mp4-probe` consumers. Known unsupported Ogg and TS filename families bypass the fast import. `unknown` and failure to admit an existing `native-direct` or `native-direct-mpv` plan use the unchanged FFmpeg inspector. Other playback implementations and explicit route policies are unchanged. A compatible Direct startup failure also re-inspects with FFmpeg before trying another plan. The review found and closed a second recovery path: a later Direct playback failure now re-inspects before resuming discovery at Hybrid or Software.

The real `Player.open()` production-path smoke run in [`notes/production-route-smoke.json`](notes/production-route-smoke.json) selected the expected Direct plan on all **26/26** Fast-qualified focused fixtures (18 `native-direct`, eight `native-direct-mpv`); none requested `engine-remux/remux.wasm`. The simple H.264/AAC MP4 remained on `cheapMP4Probe` and did not request Fast Inspector. [`notes/production-fallback-smoke.json`](notes/production-fallback-smoke.json) records five unknown families reaching FFmpeg: fragmented MP4, ProRes MOV, Ogg Opus, Ogg Vorbis, and MPEG-TS. Forced compatibility failures on plain and subtitle MKV in [`notes/production-direct-failure.json`](notes/production-direct-failure.json) and [`notes/production-subtitle-direct-failure.json`](notes/production-subtitle-direct-failure.json) re-inspected and selected their existing remux plans. [`notes/production-admission-fallback.json`](notes/production-admission-fallback.json) verifies that failure to admit Direct from fast metadata re-inspects before route selection. These are functional browser smoke checks; the earlier paired timing measurements remain experimental, and no new statistically powered production latency claim is made.

The review follow-up [`notes/production-later-failure-fallback.json`](notes/production-later-failure-fallback.json) exercises the resume-beyond-Direct inspection gate on the SRT MKV: Fast metadata is cleared and `engine-remux/remux.wasm` is requested before further route discovery. `npm run build` passes TypeScript and license checks. A beta packaging dry run stops at `Build record mismatch: scripts/package-beta.py` because the existing engine build record hashes the pre-change packaging script; packaging needs a fresh corresponding engine build record. The runtime asset list in that script now includes `fast-source-inspector.js`.

The naming follow-up moved the narrow parser to `simple-mp4-inspector.js`/`inspectSimpleMP4`. [`notes/renamed-simple-mp4-smoke.json`](notes/renamed-simple-mp4-smoke.json) confirms a simple H.264/AAC MP4 still selects `native-direct`, loading only the renamed inspector and no WASM. The old `cheapMP4Probe` export remains a thin compatibility alias for the core package. `npm run build:core`, the six focused parser tests, and all 13 core/license tests pass.
