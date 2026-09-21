<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Demuxe focused research — batch 12

## Scope and verdict

Three standalone preliminary screens, **D56–D58**. These labels continue the conversation series and are not newly allocated repository R-numbers. Lineage was read at `0060c26c23290d20041f8433452e2eb088b31f59`. No maintained Demuxe application execution, repository modification, PR, CPU/energy benchmark, physical-memory measurement, or hardware-decoder attribution is claimed.

Chromium 144.0.7559.96, FFmpeg 7.1.5, Python 3.13 and NumPy ran the tests. Test inputs are locally authored/generated. Each conclusion is specific to the declared endpoint, requested output and fixture, not a general browser compatibility promise.

| Question | Decision |
|---|---|
| D56. VP9 one-byte display recalls versus long-duration samples | Recall capability works, but stop a default recall-for-simple-hold optimization: the simpler long-hold baseline works and is smaller. |
| D57. Sparse WAVE `wavl` to native scheduled data/constant spans | Pursue the restricted PCM scheduling adapter, with exact signed-16-bit / 32768 output semantics. No live or general WAVE route qualification. |
| D58. Error-budgeted native IIR preview windows | Pursue this fixed, stable first-order browser endpoint under the declared tolerance; do not promote it to bit-exact or formally certified arbitrary floating-point DSP. |

The final consistency suite has **74 passing checks**. Many validate the detection of incorrect output. This is three research questions, not 74 experiments or three production passes. Raw evidence is in `evidence/`; `evidence/analysis.json` summarizes the numbers.

## D56 — Preserve an explicit cadence with coded picture recalls

### Question and construction

Can an explicitly requested 20-sample/second presentation of three held pictures use VP9 `show_existing_frame` commands rather than repeat the compressed picture payload? Does this beat simply making each original picture last longer?

The admitted producer emits three 128 × 80 profile-0 shown keyframes. Each keyframe refreshes all reference slots. A recall of slot 0 therefore refers only to the latest admitted keyframe; this is not an arbitrary persistent multi-picture dictionary. The builder verifies the elementary header class. A one-byte `0x88` instruction recalls that slot. No source picture is reconstructed during the rewrite.

The request shows A for one second, B for one second, then C for one second. The three-second alternatives are:

| Representation | Coded samples | Coded payload bytes | Complete WebM bytes |
|---|---:|---:|---:|
| Naïve repeated-keyframe control | 60 | 245,400 | 246,018 |
| Three keyframes + 57 one-byte recalls | 60 | 12,327 | 12,885 |
| Three keyframes with one-second holds | 3 | 12,270 | 12,507 |

The repeated-keyframe control is intentionally simple, **not an optimized ordinary VP9 encoder**. Size differences cannot establish a compression advantage over all encoders.

### Executed evidence

Two host implementations, FFmpeg's `vp9` decoder and `libvpx-vp9`, independently recover all 60 expected pictures exactly for the repeat and recall representations. The three-frame hold representation recovers the three exact source pictures.

Direct Blob playback and MSE both pass 12 picture/dimension checks, return seeks and three-second EOF for all three positive representations. Recall timestamps agree with the 20 Hz reference. Hold timestamps deliberately identify the one-second held sample instead; its visual output agrees, but its sample/callback cadence is different.

Separate complete, natural-speed MSE runs observed 59 callbacks for repeat, 59 for recall, and two for long holds; the first displayed picture preceded callback observation. Every observed positive picture matches its expected interval. Browser `totalVideoFrames` reports 60, 60 and 3 respectively. These counters are not hardware-decode counts or CPU measurements.

### Decisive controls

A stale reference presentation, which forgets to load B and C, still decodes, has correct timestamps and reaches EOF. It fails 7/12 requested-picture checks in each endpoint and displays 40 wrong observed pictures in the continuous run. A cold recall before any keyframe leaves MSE buffered only over [1,3]; direct playback can return the later B picture for early requests and still reach EOF. Keyframe/header guards reject the tested unsupported inputs.

### Decision and next gate

Use long-duration samples for this simple display-hold request. The recall mechanism is only worth reopening for a real consumer requiring the original fixed coded-sample cadence or a demonstrable operational benefit. It does not create random-access pictures; it requires valid reference state. AV1 R106 already covers a related, more capable dictionary mechanism. This is a different-codec endpoint screen, not an invention of display recall.

Evidence: `video_manifest.json`, `browser_video.json`, `browser_continuous.json`, and per-decoder frame hashes.

## D57 — Sparse audio can be scheduled without expanding its held spans

### Source semantics

The original IBM/Microsoft WAVE specification allows a `LIST` of type `wavl`, containing `data` and `slnt` chunks. Despite the name, a later `slnt` span holds the last sample value, rather than necessarily inserting zeros. The first span in this fixture has no prior value and starts at zero. The requested seek semantics preserve the values of uninterrupted source playback, including the last known per-channel value.

The source is stereo S16 at 48 kHz and contains:

- 257 initial zero frames;
- 1,003 explicit data frames, ending at left +0.25 / right −0.375 after normalization;
- 48,003 held frames;
- 2,051 new data frames, ending at left −0.5 / right +0.125;
- 7,211 held frames.

Total: **58,525 stereo frames**, 117,050 scalar sample values. The corrected source, including its required `fact` chunk, is **12,328 bytes**. Dense S16 WAVE is 234,144 bytes. Browser decoding/direct playback and host FFmpeg reject the sparse source in this environment.

### Actual adapter and independent references

Two restricted parsers (Python and JavaScript) validate RIFF/chunk extents, the admitted format, frame alignment, mandatory sample count and total duration cap. The JavaScript candidate creates ordinary AudioBuffers only for explicit `data` intervals. For a held interval it schedules one ConstantSourceNode per channel through a channel merger. A seek into a held span uses the parsed source history to recover the held values without decoding the preceding data into an AudioBuffer.

The independent reference is authored from the source-generation plan, not the parser's result. The declared numerical interpretation is **S16 / 32768**. Full native offline scheduling matches all 117,050 values exactly. Four additional irregular windows also match, for **124,116 positive scalar comparisons** in total. Two windows entirely within held spans create no input AudioBuffer at all.

The complete sparse render allocates 24,432 bytes of input AudioBuffer sample payload, versus 468,200 bytes for an expanded stereo Float32 source. It also creates native nodes; the output render buffer and reference source remain allocated. These are explicit input-sample storage counts, **not total-memory or speed measurements**.

A dense Float32 WAVE reference representing the same /32768 values decodes exactly in the browser. In contrast, browser decoding of dense S16 WAVE differs at 58,243 scalar values, maximum approximately 1.58e−5. This known endpoint-normalization distinction is retained: the candidate is not a promise to preserve the browser's prior S16-WAVE scaling.

### Controls and source correction

Treating all holds as zero fails 55,214 values per channel. Swapping held channel values also fails. Missing `fact`, inconsistent `fact`, truncation, unsupported format, excessive duration and invalid output-window controls reject.

The initial authored fixture omitted the mandatory `fact` chunk. The original output was saved as `initial_without_fact_*` and is **excluded from source-admission evidence**. The source and both parsers were corrected, and browser/host checks were rerun. The corrected source still fails those monolithic endpoints; the native scheduling adapter still passes. `sparse_without_fact.wav` remains an explicit negative, reproducible by the final builder.

### Decision and next gate

Pursue only with a real sparse/held-audio consumer. Check the existing source worker before adding a parser. This does not generalize to compressed WAVE, cue/playlists, changed sample rates, arbitrary channel layouts, live scheduling, gapless playback or A/V synchronization. DC holds here follow the source's intended sample semantics; do not invent held values for lost data.

Evidence: `sparse_manifest.json`, `browser_sparse.json`, and separately marked initial invalid-source results.

## D58 — Give a native IIR filter only enough history for a declared error budget

### Contract and bound

Test the actual browser IIRFilterNode, not a custom filter pretending to represent it:

`y[n] = (1-r) x[n] + r y[n-1]`, with `0 < r < 1`, known zero initial state and `|x[n]| ≤ 1`.

Because the recurrence is a convex combination, the historical state remains bounded by 1 in real arithmetic. Resetting the candidate to zero and processing P preceding samples bounds its omitted-state contribution at the first requested output by `r^(P+1)`. The prototype chooses P with an analytic budget of 2.5e−6 and declares total absolute tolerance **1e−5**. The remaining 7.5e−6 is an experimentally checked numerical allowance, **not a formal browser-arithmetic proof**.

| Pole r | Chosen preceding frames P |
|---|---:|
| 0.8 | 58 |
| 0.98 | 639 |
| 0.999 | 12,893 |

Source amplitude/finite-value scans are actually performed and remain charged as work. Invalid coefficients, invalid tolerance and excessive history reject. An external trusted bound/index is not assumed free.

### Executed test

Two independently authored stereo inputs of 120,013 frames cover noise/tones/zero spans and a worst-case signed DC reversal. Each pole is tested at four irregular output intervals, giving **24 bounded native jobs**. The native filter uses explicit two-channel/discrete handling and no resampling.

All **40,560 requested scalar values** fall within the declared tolerance against both complete browser filtering and an independent NumPy float64 recurrence rounded to Float32. The worst observed absolute error is **2.5033950805664062e−6**. Complete-source browser/reference comparisons also pass the declared tolerance; tiny subnormal/zero differences are not relabeled bit-exact.

The largest job feeds 14,892 stereo frames to the native node instead of 120,013 for the full source. The complete source and reference remain in the harness; repeated context setup and scanning may erase any useful saving.

All 18 nonzero-start zero-history controls fail the tolerance. All 18 corresponding one-eighth-history controls also fail. Requests at source zero naturally do not need preceding history and are not counted as failures.

### Decision and next gate

Pursue a real bounded preview consumer with an explicit opt-in error budget. This is not a transparent replacement for exact source playback or arbitrary effects. Near-unit poles can require a large history and are capped. R341's existing Q24 integer proof/performance result is a different numerical implementation; this browser screen does not inherit it. To qualify a broad guarantee, browser arithmetic needs its own proof or a appropriately narrower contract. Live scheduling, A/V sync, filtering after decoder seeks, source replacement and full-cost measurements remain untested.

Evidence: `iir_manifest.json`, `browser_iir.json`.

## Reproduction and provenance

Copy this directory to a new location, then run `python scripts/run_all.py`; it overwrites evidence in that copy. Required local dependencies: Python + numpy + playwright, `/usr/bin/chromium`, FFmpeg with libvpx-vp9 encoder/decoder. No external media downloads, repository writes or API secrets are used. Individual stages can be run with `run_browser.py video`, `continuous`, `sparse`, or `iir` after `build.py`.

`SHA256SUMS.json` records delivered-file digests; `evidence/replay_summary.json` records the additional clean-directory replay. Code is MIT; report/handoff are CC-BY-4.0. The SHA helper was reused from the previous MIT-licensed research package. No font binaries are included.

## Primary references

- libvpx, `vp9/decoder/vp9_decodeframe.c`, `read_uncompressed_header`, show-existing handling and keyframe refresh behavior: https://chromium.googlesource.com/webm/libvpx/+/refs/heads/main/vp9/decoder/vp9_decodeframe.c
- IBM/Microsoft, *Multimedia Programming Interface and Data Specifications 1.0* (August 1991), physical PDF pages 60–61 (zero-based 59–60), storage of WAVE data and mandatory FACT: https://www.mmsp.ece.mcgill.ca/Documents/AudioFormats/WAVE/Docs/riffmci.pdf
- W3C Web Audio API, ConstantSourceNode, scheduled sources and IIRFilterNode definition: https://www.w3.org/TR/webaudio-1.1/
- Demuxe R106 and R341 at commit `0060c26c23290d20041f8433452e2eb088b31f59`; repository read through the connected GitHub tool. See `REPO_LINEAGE.md`.
