# Demuxe — R70–R75 research results

**17 September 2026 · Six executed pilots · No production source changes**

**Baseline reviewed:** `9abfd1b22300cf273fc0bd1a8290261281c8f3f3`. **Evidence boundary:** host FFmpeg, one Chromium MSE harness, a native C component model and a synthetic Node index. None is a measured whole-Demuxe or matching Emscripten performance improvement.

## Decision summary

| Card | Disposition | Measured observation | What it actually establishes |
|---|---|---|---|
| R70 | Validated lab improvement only | 47.4% less CPU; 47.5% less wall time | One-pass host packaging replaces the prior two-process fixture pipeline; production already prepares AAC configuration. |
| R71 | Keep level 5 default | Level 0 saves about 9% CPU but grows output 8–53% | Compression effort is a content-dependent tradeoff, not a free speedup. |
| R72 | Promising, coarse previews only | 87.7% less CPU; 79.3% less wall time | Six keyframe previews match the full-decode reference. |
| R73 | Promising, clustered exact previews | 87.9% less CPU; 89.4% less wall time | Twelve requested outputs remain exact while process/seek/decode work is shared. |
| R74 | Promising, component only | 84.8–90.4% less modeled stage CPU | Remove redundant packed-PCM staging while retaining real FIFO ownership and S24 checks. |
| R75 | Conditional memory tradeoff | 55.2–59.9% fewer retained array bytes; slower lookups | Useful only when real seek-index memory warrants extra representation complexity. |

**Recommended implementation investigation order: R74 → R72 → R73.** This is an engineering judgment based on a concrete source target and useful preview contracts, not a ranking of proven whole-player speedups. Keep R75 conditional, keep the FLAC default unchanged, and apply R70 only to lab preparation.

Raw measurements and checks are in [summary.json](results/summary.json), the individual result files linked below and [qa.json](results/qa.json). The [agent catalogue](R70-R75-agent-catalog.json) supplies per-card limits, admission gates and rejection criteria.

## Environment and method

The recorded environment is Chromium 144.0.7559.96, FFmpeg 7.1.5, libavutil ABI 59, Node 22.16.0, GCC 14.2.0, Python 3.13.5 and Playwright 1.57.0, on x86-64 Linux. Full version strings are in [environment.json](results/environment.json). All media was generated locally from synthetic sources.

Host timing measures child-process CPU and elapsed wall time. There is one warmup per variant, rotating variant order and seven measured repetitions, except R73's five repetitions. Numbers below are medians; raw runs remain available. Files are reused after warmup, so these are not cold-disk benchmarks. Process startup, probing, container work and output hashing are included where present; no subtraction is presented as an isolated decoder cost. Small samples and synthetic content do not establish stable production effect sizes.

The browser runs on about:blank with injected complete media bytes, window-owned MSE, a real click to begin playback and Web Audio signal observation. It checks initial playback, a middle seek and a separate near-end seek followed by EOF. It does not continuously watch every frame from start to end. The page is not a secure context; VideoDecoder and ImageDecoder are absent there. These pilots neither bypass origin restrictions nor qualify HTTP delivery, live playback, worker MSE, hardware decoding or a browser matrix. Browser results are functional observations, not repeated performance benchmarks.

## R70 — Remove the intermediate host remux

**Question.** Can selected H.264/AAC from a two-program transport stream be packaged directly into fragmented MP4 instead of first producing an ordinary MP4? This extends R65's construction rather than introducing a new player route.

The six-second fixture contains red H.264 video plus a 440 Hz AAC signal in program 100, with unrelated blue video and 880 Hz AC-3 in program 200. The candidate selects program 100, applies `aac_adtstoasc` and uses `delay_moov` with fragmentation. The negative control removes `delay_moov` from that CLI construction. FFmpeg documents that this flag postpones the initial movie header until the first fragment cut or flush; it does not promise faster first-frame presentation. [F1]

Median total preparation CPU fell from **140.95 ms to 74.12 ms**; wall time fell from **140.43 ms to 73.72 ms**. All **433 ordered packet records**, including payload SHA-256 and printed PTS/DTS/duration fields, matched the two-pass reference. Reordering program declarations preserved those records. The positive browser variants showed the red video, a roughly 439.45 Hz spectral peak, working seeks and EOF at 6.037333 seconds. The negative's MIME probe succeeded, but append failed: capability probing alone was insufficient.

**Do not overstate equivalence.** The files are not byte-identical. ffprobe's video stream-level duration is 5.979 seconds for the two-pass file versus 6.000 seconds for the direct file, despite matching packet records. AAC initialization is two bytes in the positive files and absent in the negative. The browser's overall duration agrees for positives, but a broader metadata/edit/priming audit remains necessary for other sources.

**Production audit changes the conclusion.** Current `rm_open` already prefetched AAC under explicit bounds and derives AudioSpecificConfig before output construction. A separate Opus branch already uses delayed movie-header handling. R70 is therefore a useful lab simplification, not a missing production optimization. [D1]

Evidence: [host commands and packet audit](results/r70_host.json), [browser observations](results/browser.json), [source audit](source/source-audit.md).

## R71 — Tune FLAC effort without changing frame duration

**Question.** Does lower compression effort materially reduce preparation cost without an excessive byte penalty? This isolates encoder effort, rather than claiming another lossless audio route. The reviewed source already defaults `DEMUXE_FLAC_LEVEL` to 5. [D2]

Two deterministic 30-second, 48 kHz stereo S16 signals were encoded at levels 0, 5 and 8 with a fixed 4,608-sample frame size. One is tonal; the other adds seeded noise. This fixed-frame-size host setup is not a matching production encoder configuration.

| Signal | Level | CPU ms | Wall ms | FLAC bytes | Host decoded PCM |
|---|---:|---:|---:|---:|---|
| Tonal | 0 | 155.47 | 144.12 | 1,474,889 | Exact |
| Tonal | 5 | 159.30 | 147.14 | 962,844 | Exact |
| Tonal | 8 | 234.58 | 220.13 | 912,044 | Exact |
| Noisy | 0 | 172.90 | 162.70 | 4,932,818 | Exact |
| Noisy | 5 | 173.58 | 158.54 | 4,569,863 | Exact |
| Noisy | 8 | 257.81 | 239.63 | 4,566,877 | Exact |

All six decoded PCM hashes exactly match their source samples. Each output has 313 packets: full frames and a final 2,304-sample frame. The three tonal FLAC-in-MP4 browser variants pass playback, seeking and near-end/EOF observations. Their short stream-copy extracts are **4.032 seconds**, not exact four-second cuts. Browser signal presence is not a complete bit-exact digital-output or physical-device audit.

Relative to level 5, level 0 saves **2.4% / 0.4% CPU** on tonal/noisy input, but adds **53.2% / 7.9% bytes**. Level 8 costs **47.3% / 48.5% more CPU**, saving **5.28% / 0.07% bytes**. Keep level 5 pending representative source material and actual Wasm measurements. An explicit low-effort temporary profile could be investigated, but an automatic default is not justified.

Evidence: [six encodings and raw timings](results/r71_host.json), [browser observations](results/browser.json).

## R72 — Decode only keyframes for coarse previews

**Question.** When the requested output is a sparse keyframe storyboard, can non-keyframe reconstruction be skipped? This is different from R64's reduced-resolution reconstruction and R55's preview caching. The documented `skip_frame=nokey` control discards non-keyframes. It does not provide arbitrary exact-frame access. [F2]

The reference fully decodes a 12-second 1280×720 H.264 fixture, selects its I frames and scales them to 320×180. The candidate decodes keyframes only and uses the same scaler. The fixture has a closed 60-frame GOP, B frames and no scene-cut keyframes; the selected frames are 0, 60, 120, 180, 240 and 300.

All six resized-frame hashes and complete frame records match. Median CPU is **828.87 → 101.55 ms**; wall time is **464.74 → 96.39 ms**. The candidate does less temporal work without changing these selected images in this fixture.

**Admission contract:** explicitly coarse previews, never normal playback or exact scrubbing. Use a separate preview decoder, preserve source identity and geometry, and bound decode time and retained images. Expand the oracle to long/open GOPs, VFR, interlaced content, other codecs and cancellation before integrating. No browser preview UI or Emscripten decode was benchmarked here.

Evidence: [frame records and timings](results/r72_host.json), [script](scripts/r72.py).

## R73 — Decode a GOP once for a pending exact-preview batch

**Question.** Can multiple already-pending thumbnail requests share decoding while still returning every exact requested image? This is neither dropping superseded scrub requests nor relying on cache hits.

Twelve requested frames between indices 123 and 177 lie in one closed GOP of the same H.264 source. The baseline launches twelve independent accurate-seek jobs. The candidate seeks once to that GOP and emits the requested frames. An independent full-decode-from-start path serves as a third oracle. All twelve output hashes agree across all three paths.

Median CPU is **1761.90 → 213.58 ms**; wall time is **1312.43 → 139.23 ms**. Process count falls from twelve to one. The measured reduction combines process launch, probing, seeking and repeated decode avoidance; it is not a claim that the decoder itself becomes eight times faster. An already-persistent Wasm decoder would have a different baseline.

Batch only work already available; do not postpone the first interactive preview to fill a batch. Bound GOP span and retained outputs, preserve cancellation/source epochs, and compare sparse distant targets, VFR and long GOPs. The experiment proves these twelve image identities, not a general scheduler or timestamp API.

Evidence: [three-way frame oracle and timings](results/r73_host.json), [script](scripts/r73.py).

## R74 — Skip redundant packed-PCM staging

**Question.** Can admitted packed lossless integer audio be written directly into the existing FIFO, avoiding a temporary allocation and per-sample copy?

The reviewed `adaptation_frames` allocates a converted AVFrame and copies sample/channel data before FIFO writing, including when data is already packed. S24 stored in S32 also requires validation that the low eight bits are zero. Planar interleaving and explicit Opus float conversion remain necessary in their respective paths. [D2]

The native C prototype uses the **real system libavutil FIFO API**, but substitutes a malloc staging buffer for production AVFrame allocation. The packed candidate skips staging; S24 validates the entire input before publishing samples. Planar cases call the same baseline function as controls. FIFO write/read is retained, so this is not a zero-copy ownership claim. [F3]

| Samples × channels | Format/layout | Baseline CPU ms | Candidate CPU ms | Reduction |
|---|---|---:|---:|---:|
| 1024 × 1 | S16, packed | 14.08 | 1.35 | 90.4% |
| 1024 × 2 | S16, packed | 21.48 | 2.06 | 90.4% |
| 1024 × 2 | S24-in-S32, packed | 51.45 | 6.86 | 86.7% |
| 4096 × 2 | S16, packed | 84.61 | 11.68 | 86.2% |
| 4096 × 2 | S24-in-S32, packed | 236.52 | 36.07 | 84.8% |
| 1024 × 2 | S16, planar control | 28.96 | 27.84 | 3.9% |
| 1024 × 2 | S24-in-S32, planar control | 53.74 | 55.22 | -2.8% |

Each number is the median CPU time for 20,000 stage calls, including FIFO write/read, across seven measured repetitions. **These percentages apply to the modeled stage only, not FLAC encoding or total player CPU.** The actual compiler, allocation path, Wasm execution and stage fraction can materially change the benefit.

All seven layouts produce byte-equal results. Overwriting source data after FIFO write verifies independent FIFO ownership. Random values plus zero/minimum/maximum samples are covered; invalid S24 low bits are rejected with the FIFO unchanged. Sample-count/channel controls also reject invalid input. A reduced-loop ASan/UBSan build passes all seven cases with empty stderr; the distribution libavutil was not itself rebuilt with sanitizers.

The first timing model allowed compiler specialization to create misleading planar differences; it was superseded. The delivered final model prevents that specialization, and planar controls show only small noise-scale differences. The first full-size sanitizer timing run hit the execution timeout; the successful sanitizer run deliberately uses 50 loops and its timing is not performance evidence.

**Next gate:** profile the actual stage, then implement only the packed lossless branch while retaining all format/layout/precision/timestamp/sample-count/capacity admission. Keep planar and Opus conversion behavior unchanged. Test real decoder frames, seeks, cancellation, memory growth and a matching Emscripten build before measuring complete sessions. For illustration, removing 90% of a stage that consumes 2% of total CPU saves only 1.8% overall; the stage fraction here is unmeasured.

Evidence: [native component measurements](results/r74_component.json), [sanitizer result](results/r74_sanitizer.json), [C source](scripts/r74_pcm.c), [production source audit](source/source-audit.md).

## R75 — Compact large seek maps with checkpoints

**Question.** Can a source-bound immutable seek map retain less array storage by encoding time/byte deltas between absolute checkpoints? This extends R45's representation, not its cache or scan-avoidance claim.

The Node pilot constructs 100,000 synthetic monotonic time/offset entries. Offsets begin above 4 GiB and extend beyond 156 GB; times use a 90 kHz tick scale with variable intervals. The baseline uses two Float64Arrays, totaling 1,600,000 bytes. The candidate keeps absolute checkpoints, byte pointers and unsigned variable-length deltas at checkpoint sizes 16, 32, 64 and 128.

| Checkpoint interval | Retained array bytes | Saved vs dense | Dense µs/query | Candidate µs/query |
|---:|---:|---:|---:|---:|
| 16 | 716,482 | 55.22% | 0.152 | 0.455 |
| 32 | 673,707 | 57.89% | 0.140 | 0.598 |
| 64 | 652,317 | 59.23% | 0.141 | 1.000 |
| 128 | 641,636 | 59.90% | 0.140 | 1.838 |

Query figures are **averages derived from the median 100,000-query batch**, not individual-call medians or p95 latency. Exact array byte counts exclude object overhead, source arrays used by the oracle, process RSS and peak construction memory. Single observed construction times are retained in JSON but not treated as stable repeated benchmarks.

There are **404,124 comparisons** across implementations and oracles, plus eleven controls for empty/negative starts, >32-bit offsets, safe-integer boundaries, invalid source/query data and malformed varints. These are not 404,124 independent real-media seeks. Source identity/invalidation, hostile persisted-index ingestion and real demux integration remain unqualified.

Block 16 is the most plausible conditional option here: roughly 55% fewer array bytes with about 0.41 µs average lookup versus 0.14 µs dense. Do not default to this representation for ordinary files. Under an illustrative two-hour source with one index entry every two seconds, two dense Float64Arrays are only 57,600 bytes. Absolute savings may not justify another parser and validation surface.

Evidence: [Node validation and measurements](results/r75_component.json), [index prototype](scripts/seek-index.mjs), [test driver](scripts/r75.mjs).

## Handoff and remaining qualification

There are three promising implementation investigations, one conditional representation, one lab-only simplification and one decision to retain the current default. **No source edit, PR, commit, route admission or whole-player speedup is claimed.** Keep all new mechanisms opt-in or internal to a separately qualified preview/packing component until their actual integration gates pass.

The bundle contains executable scripts, original measured outputs, synthetic source/encoded fixtures, QA checks, source-audit notes and SHA-256 manifests. Regenerable raw PCM outputs, native executables and Python caches are excluded to reduce bundle size. The superseded R74 timing is retained and explicitly excluded from conclusions. See [README.md](README.md) for reproduction. The independent host oracles verify this bounded batch; they do not elevate the previous R01–R69 claims or test unrelated production behavior.

## Primary source references

[D1] [Demuxe packet-copy bridge, pinned baseline](https://github.com/Jagalite/demuxe/blob/9abfd1b22300cf273fc0bd1a8290261281c8f3f3/native/remux/remux.c). `rm_open`, `configure_aac`, `rm_start`; production AAC prefetch and output initialization.

[D2] [Demuxe audio adaptation, pinned baseline](https://github.com/Jagalite/demuxe/blob/9abfd1b22300cf273fc0bd1a8290261281c8f3f3/native/adaptation/flac.h). Default compression macro and `adaptation_frames` packing/FIFO path.

[F1] [FFmpeg Formats documentation](https://ffmpeg.org/ffmpeg-formats.html). `delay_moov` and fragmentation. Rolling documentation; installed FFmpeg behavior was tested separately.

[F2] [FFmpeg Codecs documentation](https://ffmpeg.org/ffmpeg-codecs.html). `skip_frame` / `nokey`. Rolling documentation; the measured fixture is a narrower qualification.

[F3] [FFmpeg 7.1 public audio FIFO header](https://ffmpeg.org/doxygen/7.1/audio__fifo_8h_source.html). Opaque FIFO allocation/write/read API used by the component. This is an ABI reference, not performance evidence.
