# Demuxe microcodec PoC — 2026-09-28

**Decision: do not build production microcodec loading/routing yet. Prioritize qualifying the minimized common/adaptation builds.** Packet-only AC-3/E-AC-3 is technically successful, but most transfer savings come from pruning FFmpeg and applying LTO/size optimization. Decomposition adds multiple instances, copies and a handoff contract for only a small additional compressed saving. No production files, routing, Player API, native-video/mpv strategy, MSE architecture, or asynchronous bridge infrastructure were changed.

This is a bounded synthetic research result, not a browser playback qualification. TrueHD/MLP was deferred: the main comparison does not justify expanding the codec matrix. No object-audio/Atmos preservation is claimed. Existing mpv fallback remains necessary for unsupported representations.

## Artifacts and reproduction

Build recipes, C ABIs, Node/browser Workers, fixture generator, runtime audit, and benchmark runners are in [`experiments/microcodec`](experiments/microcodec/README.md). External `.wasm` and glue files are in `build/microcodec/<profile>-<optimization>/module.{wasm,mjs}`. Raw measurements are in [`results/microcodec`](results/microcodec/). No SINGLE_FILE build, production cache, loader, package manifest, or asset installation was added.

## Sizes

Bytes, not KiB. gzip level 9 and Brotli quality 11 compress **each external asset independently**; combined columns sum Wasm + JS. These are runtime module assets, not package/deployment totals. Reference-only test adapters are excluded from path totals.

| Component | Raw Wasm | Raw JS | Wasm gzip | Wasm Brotli | Combined gzip | Combined Brotli |
| --- | --- | --- | --- | --- | --- | --- |
| current-adaptation | 4,476,688 | 36,995 | 1,832,637 | 1,463,898 | 1,843,522 | 1,473,737 |
| current-remux | 3,260,685 | 36,324 | 1,289,618 | 1,030,015 | 1,300,234 | 1,039,629 |
| adaptation-Oz | 1,921,557 | 37,057 | 989,223 | 817,022 | 1,000,326 | 827,040 |
| remux-Oz | 1,132,819 | 36,398 | 569,664 | 469,881 | 580,507 | 479,662 |
| ac3-Oz | 414,144 | 15,212 | 190,527 | 156,826 | 195,754 | 161,582 |
| ac3-Os | 450,287 | 15,628 | 203,181 | 167,001 | 208,576 | 171,916 |
| ac3-O2 | 531,527 | 16,200 | 230,270 | 184,396 | 235,775 | 189,404 |
| dts-Oz | 540,892 | 15,212 | 276,209 | 235,868 | 281,436 | 240,624 |
| flac-Oz | 251,814 | 15,185 | 115,583 | 99,188 | 120,791 | 103,933 |
| libflac-Oz | 162,936 | 10,417 | 66,022 | 55,401 | 69,642 | 58,678 |

Decomposition with FFmpeg FLAC saves 122,780 raw Wasm bytes and 81,863 combined Brotli bytes versus minimized adaptation.

Decomposition with direct libFLAC (size model; not the composition run) saves 211,658 raw Wasm bytes and 127,118 combined Brotli bytes versus minimized adaptation.

The baseline also changes optimization/LTO and allocator settings relative to the installed engine. Thus A→B measures the practical minimized build, not the causal effect of component removal alone. B→C uses matched `-Oz` + LTO and the same common components. No claim that all A→B savings are architectural is warranted.

## Codec timing and memory

Node Workers, arm64 macOS, Node v23.5.0. Each row: one worker/fixture startup, then median of 12 complete 3.008-second decode loops. Compile is `WebAssembly.compile`; instantiate is synchronous `new WebAssembly.Instance`; factory includes glue initialization; init opens the decoder. Inputs are already packetized and resident. Times are local-process observations, not network, cold-browser distributions, or playback CPU. Node CPU includes context recreation and process/V8 activity; wall throughput includes packet copies/drain calls, excludes collected PCM copies in timed loops. Peak is maximum Wasm linear-memory capacity, not live allocator use or total JS/Worker/RSS.

| Build | Fixture | Compile ms | Instantiate ms | Factory ms | Init ms | Initial MiB | Peak MiB | Decode ms | Realtime | CPU ms/clip |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ac3-Oz | ac3-stereo | 0.69 | 0.11 | 1.31 | 1.31 | 2.00 | 2.00 | 2.54 | 1183.1× | 3.63 |
| ac3-Oz | eac3-stereo | 0.69 | 0.12 | 1.30 | 1.37 | 2.00 | 2.00 | 2.54 | 1182.7× | 3.64 |
| ac3-Oz | eac3-51 | 0.67 | 0.11 | 1.35 | 1.31 | 2.00 | 2.00 | 6.04 | 497.9× | 7.04 |
| ac3-Os | ac3-stereo | 0.92 | 0.68 | 1.92 | 1.35 | 2.00 | 2.00 | 2.35 | 1280.4× | 3.71 |
| ac3-Os | eac3-stereo | 0.71 | 0.11 | 1.37 | 1.33 | 2.00 | 2.00 | 2.36 | 1274.9× | 4.22 |
| ac3-Os | eac3-51 | 0.71 | 0.12 | 1.30 | 1.35 | 2.00 | 2.00 | 5.47 | 549.9× | 6.84 |
| ac3-O2 | ac3-stereo | 0.73 | 0.13 | 1.50 | 1.47 | 2.00 | 2.00 | 2.04 | 1477.8× | 3.61 |
| ac3-O2 | eac3-stereo | 0.72 | 0.12 | 1.42 | 1.46 | 2.00 | 2.00 | 2.07 | 1453.0× | 4.65 |
| ac3-O2 | eac3-51 | 0.71 | 0.12 | 1.45 | 1.45 | 2.00 | 2.00 | 4.57 | 658.8× | 6.20 |
| dts-Oz | dts-stereo | 0.75 | 0.12 | 1.40 | 1.48 | 2.00 | 2.00 | 5.93 | 507.6× | 6.36 |
| dts-Oz | dts-51 | 0.73 | 0.13 | 1.33 | 1.44 | 2.00 | 2.00 | 16.34 | 184.1× | 16.86 |

Do not select an optimization solely by binary size. All variants comfortably beat realtime here; warm-process timings vary. `-Oz` is the smallest measured artifact. A larger real-media/browser workload is needed before selecting production optimization. Scratch allocation in the final harness is the largest packet plus padding, not the initial pilot’s unnecessary 1 MiB reserve.

## Correctness and reset

Fixtures use distinct per-channel tones at 48 kHz: AC-3 stereo, E-AC-3 stereo/5.1, DTS core stereo/5.1. The manifest retains encoder invocation, host FFmpeg version, packet offsets/PTS/durations, stream metadata and SHA256. All frames, including the encoded tail padding, are retained; this is not a gapless source-duration claim.

| Build | Fixture | Frames | Samples/channel | Layout mask | Exact PCM | Both resets exact | Bad-input recovery exact |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ac3-O2 | ac3-stereo | 94 | 144384 | 0x3 | True | True | True |
| ac3-O2 | eac3-stereo | 94 | 144384 | 0x3 | True | True | True |
| ac3-O2 | eac3-51 | 94 | 144384 | 0x60f | True | True | True |
| ac3-Os | ac3-stereo | 94 | 144384 | 0x3 | True | True | True |
| ac3-Os | eac3-stereo | 94 | 144384 | 0x3 | True | True | True |
| ac3-Os | eac3-51 | 94 | 144384 | 0x60f | True | True | True |
| ac3-Oz | ac3-stereo | 94 | 144384 | 0x3 | True | True | True |
| ac3-Oz | eac3-stereo | 94 | 144384 | 0x3 | True | True | True |
| ac3-Oz | eac3-51 | 94 | 144384 | 0x60f | True | True | True |
| dts-Oz | dts-stereo | 282 | 144384 | 0x3 | True | True | True |
| dts-Oz | dts-51 | 282 | 144384 | 0x60f | True | True | True |

Reference: identical packet ABI linked against the installed adaptation build’s **hash-verified** libavcodec/libswresample/libavutil archives, with its original `-O2`, SIMD and pthread configuration. Every microdecoder frame’s nine metadata fields and interleaved float PCM match exactly. Independent host FFmpeg float comparison uses a predeclared maximum absolute error of `1e-5` (observed errors below `5e-8`), not a tolerance chosen after the result.

Output is FFmpeg `AV_SAMPLE_FMT_FLTP` (8), 48,000 Hz. Stereo mask 0x3 is FL/FR; 5.1-side mask 0x60f is FL/FR/FC/LFE/SL/SR, and planes retain that native order. AC-3/E-AC-3 emits 1536 samples (32 ms) per frame; DTS emits 512 (10⅔ ms). PTS is the input packet PTS in a 1/48000 time base. `AVFrame.duration` is zero for this ABI because packet duration is not supplied; consumers must compute frame duration from sample count/rate. Decoder delay and initial-padding fields are zero; this does not assert zero transform/encoder latency.

NULL-packet EOF flush returns no additional frames and receive reaches AVERROR_EOF. Both `avcodec_flush_buffers()` and recreate/reset replay exactly. Recreate plus a 480000-sample discontinuity shifts first PTS to 10 seconds while preserving PCM. Truncating the first packet to seven bytes and replacing a full packet with 0xff return invalid-data on send; receive then has no frame; recreate followed by valid packets recovers byte-exactly. These are two deterministic malformed-input cases, not a fuzzing/security qualification or a claim that every payload bit error is rejected.

The pinned AC-3 implementation has an explicit flush callback that clears frame state and reseeds dithering. Context recreation is **not required by these tested reset cases**. The browser PoC conservatively uses recreation. FFmpeg documents buffer reset in its [utility API](https://www.ffmpeg.org/doxygen/7.1/group__lavc__misc.html); the local pinned source and tests, rather than that generic promise, establish the result here.

## No asynchronous codec runtime

`runtime-audit.json` retains final import names, minified glue mappings, memory declarations, and artifact hashes. All four standalone module families have private non-shared memory, no pthread imports, no JSPI/Suspending/promising or Asyncify instrumentation, and `FILESYSTEM=0`. FFmpeg codec builds disable avformat, swresample, avfilter and all thread backends; only libavcodec/libavutil are linked. Link settings use emmalloc, SUPPORT_LONGJMP=0, SIMD enabled, LTO, 256 KiB stack and a 2 MiB initial heap.

Some libc syscall imports survive dead-code elimination (`openat`, fd read/seek/write, timer/environment/clock stubs). They do **not** imply filesystem emulation or asynchronous source I/O. Glue has no FS initialization. Instrumented complete test runs call only environment initialization and, where needed, memory growth; no source reads, filesystem calls or timer suspensions are observed. The async JS factory loads/compiles the module; packet decoding itself is synchronous. Existing remux/adaptation retain shared-memory pthread/source-worker behavior.

## FLAC encoders

Narrow FFmpeg FLAC and direct libFLAC 1.4.3 were measured at compression levels 0 and 5, stereo and six channels, signed 24-bit integer input. All eight round trips are exact. libFLAC receives right-justified integers; FFmpeg S32 input is left-justified. Float-to-FLAC composition explicitly rounds/clips to 24 bits: it is not lossless preservation of arbitrary float PCM. libFLAC’s callback-based [stream encoder API](https://www.xiph.org/flac/api/group__flac__stream__encoder.html) needs no file I/O.

| Encoder | Channels | Level | Block samples | Realtime | 200 blocks ms | Heap after open MiB | Peak MiB | Exact roundtrip |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| flac-Oz | 2 | 0 | 1152 | 355.7× | 13.49 | 7.50 | 7.50 | True |
| flac-Oz | 2 | 5 | 4608 | 375.6× | 51.11 | 9.00 | 9.00 | True |
| flac-Oz | 6 | 0 | 1152 | 179.8× | 26.70 | 9.00 | 9.00 | True |
| flac-Oz | 6 | 5 | 4608 | 140.3× | 136.80 | 9.00 | 9.00 | True |
| libflac-Oz | 2 | 0 | 4096 | 705.0× | 24.21 | 2.00 | 2.00 | True |
| libflac-Oz | 2 | 5 | 4096 | 462.8× | 36.88 | 2.00 | 2.00 | True |
| libflac-Oz | 6 | 0 | 4096 | 288.9× | 59.07 | 2.00 | 2.00 | True |
| libflac-Oz | 6 | 5 | 4096 | 222.9× | 76.58 | 2.00 | 2.00 | True |

Encoder runs reuse a module across configurations; the after-open heap can retain previous high-water capacity. Both modules declare a 2 MiB initial heap. FFmpeg FLAC allocates/grows substantially during encoder open; direct libFLAC stays smaller. Throughput covers different default block sizes and copied encoded output, so it is a practical configuration comparison, not equal-block algorithm attribution. No AAC or Opus encoder was added.

## Minimized common remux

Same `native/remux/remux.c`, no redesign. Enabled demuxers: MOV/MP4, Matroska/WebM, MPEG-TS. Outputs: MP4/WebM. Parsers: H.264, HEVC, VP8, VP9, AV1, AAC, MPEG audio, Opus, Vorbis, FLAC, AC-3 (covers E-AC-3). Explicit BSFs: aac_adtstoasc and extract_extradata. Configure also selects required internal dependencies, including vp9_superframe. H.264/HEVC internal parsing remains available for timestamp/configuration logic. Actual enabled components are retained in config_components.h and the build manifests.

`extract_extradata` was demonstrated necessary: the first narrow build failed TS opening with “Missing AVC configuration”; adding it restores configuration discovery. Packet-copy AC-3 in the audio-only Matroska control fails MP4 header writing with -28 in **both** installed and minimized bridges; no new AC-3 copy admission is claimed. The AC-3 parser remains an MP4 muxer dependency.

| Fixture | Result | Decoded source/output comparison |
| --- | --- | --- |
| mp4 | build/open/process complete | audio: DIFF, video: exact |
| mkv | build/open/process complete | audio: exact, video: exact |
| ts | build/open/process complete | video: exact |
| flac | build/open/process complete | audio: exact, video: exact |
| opus | build/open/process complete | audio: exact |
| vp9 | build/open/process complete | audio: exact, video: exact |
| vorbis | build/open/process complete | audio: exact, video: exact |

MP4/AAC priming/sample-count behavior is separately controlled against the installed bridge; do not call an existing mismatch a new minimization regression. The suite does not qualify the entire admission matrix, seeking, HEVC/AV1 edge cases, source cancellation, playback output, or MSE lifecycle. Retain the existing engine until those gates pass.

## Actual repair experiment and path comparison

All three arms produce byte-identical decoded PCM for the 3.008-second AC-3 stereo fixture, 144384 samples/channel. A/B read AC-3-in-Matroska with the unchanged source bridge and encode FLAC24 level 0. C receives pre-extracted packet boundaries, decodes and encodes in Wasm, buffers a minimal Matroska handoff, then runs unchanged remux. That handoff is intentionally fixture-scoped: original-container packet extraction and streaming backpressure are **not implemented or benchmarked** for C. This is an executed component-composition comparison, not an end-to-end production per-file route claim.

| Path | Wasm loaded | Brotli bytes incl glue | Initial MiB | Peak MiB* | Compile / instantiate / init ms | Processing wall ms | Decode CPU |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Current adaptation | current-adaptation | 1,473,737 | 64.00 | 64.00 | 4.62 / 2.05 / 15.94 | 16.80 | Not isolated |
| Minimized adaptation | adaptation-Oz | 827,040 | 64.00 | 64.00 | 2.18 / 1.16 / 9.95 | 17.10 | Not isolated |
| Remux + AC3 + FFmpeg FLAC | remux-Oz + ac3-Oz + flac-Oz | 745,177 | 68.00 | 73.50 | 6.76 / 2.15 / 10.94 | 37.70 | Not isolated |

*C memory is the sum of component high-water capacities, a conservative simultaneous-residency model; the PoC closes codec Worker before remux. It excludes JS PCM arrays, packet storage, Matroska staging, source shared buffer, compiled code and browser RSS. Peak is not a total-process claim. Decode CPU for A/B cannot be isolated from encode/demux/mux without instrumentation inside the existing bridge; their table value is processing wall time, **not decode CPU**. C’s decoder/encoder wall measurements and Node process CPU are retained separately in JSON; no fabricated CPU attribution is supplied.

Chrome: 153.0.8010.53. C decoder/PCM-conversion wall time 22.77 ms, FLAC/copy wall time 12.77 ms, no clipping. Browser compile/instantiate results are single local observations with possible engine cache effects; not cold-network or statistically stable startup claims.

## Provenance and limits

FFmpeg lock: `n9.0.2`, archive SHA256 `6e374ed621e48faa40639307dff48ba6fe574a509977956d2cce9669b7cc27e9`. Emscripten `4.0.14`; recipe verifies the version and resolves the installed SDK symlink. All current `patches/ffmpeg-adaptation/*.patch` are applied to an isolated archive extraction and hashed in each provenance manifest. No FFmpeg codec source was modified. libFLAC 1.4.3 archive SHA256 `6c58e69cd22348f441b861092b825e591d0b822e106de6eb0ee4d05d27205b70`, fetched from downloads.xiph.org, pinned by the recipe.

Per-build `provenance.json` includes configure/link commands, effective configuration hashes/CFLAGS, bridge hash, resolved SDK path, output hash and invocation duration. Build logs and full generated configs remain beside the outputs. The first pilot omitted explicit --optflags; affected objects were cleaned and rebuilt, and `pilot-config.mak` retains that evidence. Final common profiles were reconfigured with the complete BSF list. Size/runtime audits identify the measured binaries by SHA256. `provenance.json` in results records host identity and source/harness hashes.

DTS uses only the FFmpeg DCA decoder registration, with core_only enabled; stock DCA still contains extension-support code, so this is a core-decoding PoC, not a hand-pruned core-only source fork. DTS-HD/objects are not qualified. TrueHD/MLP build selection is available in the recipe but was not built/tested; complete access-unit handling, major-sync recovery, seeks and object metadata remain unresolved.

Synthetic tones, three-second clips, 48 kHz only, and bounded malformed inputs establish a narrow correctness result. There is no long-run leak soak, broad bitstream conformance corpus, arbitrary channel-layout conversion, production scheduling, sustained playback CPU or cold-start distribution. These limits are reasons to withhold integration readiness, not to change fallback policy.

## Recommendation

Proceed with a separate qualification task for the minimized common/adaptation builds. Do not add loadCodec(), cache ownership, lazy codec Workers, route changes or asset-loader APIs based on this result. The packet ABI is simple and the decoder itself is dramatically smaller/lower-memory, but the complete repair path still loads the shared remux engine and a FLAC encoder. Its incremental saving is only tens to low hundreds of KiB compressed while introducing packet extraction, copies, buffering, timestamp and lifecycle contracts. On the requested decision rule, decomposition is probably not worthwhile now.

| Component | Builds | Correct | No pthread | No JSPI/Asyncify | Size compelling | Ready for integration |
| --- | --- | --- | --- | --- | --- | --- |
| AC-3/E-AC-3 | Yes, Oz/Os/O2 | Exact tested PCM | Yes | Yes | Alone yes; composed no | No |
| DTS | Yes | Exact tested core PCM | Yes | Yes | Alone yes; composed unproven | No |
| TrueHD/MLP | Not attempted | Unqualified | Unverified | Unverified | Unknown | No |
| FLAC encoder | Both | Exact integer round trips | Yes | Yes | libFLAC smaller | No |
| Minimized common remux | Yes | Bounded fixtures; full gates pending | N/A | existing bridge | Yes | No; qualification next |

