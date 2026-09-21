<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Demuxe focused research — batch 9: D44–D47

## Read this first

These are four standalone component screens, executed in the conversation's Linux container. They are not maintained Demuxe-player tests, a compatibility census, or performance qualification. The GitHub connection resolved `Jagalite/demuxe` main to **015004be024fc04cb0234f523290b4c377870257** during this batch, newer than the commit used for the previous batches. No repository files were changed or pushed.

The runtime was Chromium **144.0.7559.96**, FFmpeg **7.1.5**, and libVorbis **1.3.7**. The Chromium launch arguments were `--no-sandbox` and `--autoplay-policy=no-user-gesture-required`. Tests used an ordinary blank page, Blob URLs, MSE, Canvas, browser audio decoding and OfflineAudioContext. WebCodecs was not used; the tested page is not a secure context. Hardware acceleration, browser-internal decoder identity, live A/V synchronization, process memory, CPU, energy, representative usage frequency and production integration are **unmeasured**.

These are new subcases and destination tests, not four entirely new inventions. Research IDs are provisional conversation labels, not repository R-number allocations.

## Executive findings

| Item | Hypothesis tested | Actual decision |
|---|---|---|
| D44 | Can multiple MP4 decoder descriptions be projected into single-description intervals to preserve native playback? | Both the projection and **unchanged source fragments through MSE** work. Direct playback fails. Prefer the working unmodified destination on this profile; do not add the projection by default. |
| D45 | Can native playback start at an AVC recovery point, exposing only pictures after its declared recovery delay? | Host reconstruction becomes correct after eight pictures, but all four native cold-start variants produce no buffered media. Stop the tested MSE candidate, not the broader software recovery mechanism. |
| D46 | Is rewriting container color information sufficient when codec and container disagree? | No. Both tested browser destinations follow the AVC bitstream in these cases. An explicitly authorized normalization of both layers preserves coded pictures and achieves the chosen reference appearance. |
| D47 | Can small Vorbis windows with short/long block transitions be decoded independently by the browser? | Yes for the six tested requests, with preserved packets, required predecessor and explicit output trimming/scheduling. All 40,346 requested scalar samples match. Untrimmed browser results contain extra tail samples and are **not** exact clips. |

`evidence/verification.json` records **79 passing post-run consistency checks**, including checks that detect rejected or incorrect candidates. This is not 79 experiments or four successful production routes.

## D44 — Try an unchanged native destination before projecting sample descriptions

### Scope and candidate

Two independently encoded AVC sources have the same explicitly signaled color interpretation and sample rate, but different dimensions and parameter-set IDs: A is 160×96, B is 240×144. A newly authored three-second fragmented MP4 contains a sample-description table with both configurations. Its three intervals reference description 1, description 2, then description 1, forming A/B/A.

The bounded prototype writes the multi-entry initialization record and explicit fragment description indexes. The candidate projection emits the correct single-description initialization at each boundary and remaps that interval's fragment index to 1. It leaves the original media payloads and fragment positions intact. Unknown description indexes are rejected.

This is related to R091's configuration-transition work and prior D27, but tests **indexed sample descriptions**, not merely an in-band parameter-set change or a configuration-equivalence assertion.

### Execution and results

* All 60 packet hashes in the authored A/B/A file match the corresponding source packets in order.
* The original file fails native-direct Blob playback with a recorded video decode error at the configuration transition.
* **The original multi-description init plus original fragments succeed through one MSE SourceBuffer without normalization.**
* The projected single-description route also succeeds through one SourceBuffer.
* Both MSE routes match 12 requested picture/hash/dimension/timestamp witnesses against their independent single-source browser controls, including return seeks. Both report three seconds and reach EOF.
* Direct and MSE versions of each single-source control agree on the sampled pictures.
* Incorrectly mapping all intervals to the first description without supplying the second configuration fails actual browser decoding. Index 3, absent from the table, is rejected by the prototype guard.

### Decision and remaining gate

The useful discovery is **destination selection**, not an obligation to transform the file. No bytes need to be normalized for the accepted original MSE profile. Test whether the maintained route already attempts this path after direct admission fails. A new generic sample-description projector is unjustified for this specific consumer.

This is an authored, unencrypted, single-video-track, same-codec profile with independent interval boundaries. It does not qualify mixed codecs, encrypted sample entries, audio, arbitrary configuration changes, every picture in continuous playback, or internal hardware-decoder continuity. The checks are 12 output witnesses, not a 60-frame browser capture.

Evidence: `description_manifest.json`, `desc_multi.mp4.probe.json`, `browser_descriptions.json`, and `analysis.json`.

## D45 — A recovery point is not necessarily a native cold-start point

### Scope

A five-second AVC source uses periodic intra refresh instead of a new IDR at each one-second boundary. A restricted NAL/SEI parser verifies that the tested later boundaries have non-IDR coded slices plus a recovery message declaring `recovery_frame_cnt=8`, `exact_match=1`, `broken_link=0`. FFprobe labels their first packets as keyframes. No attempt is made to promote false keyframes or rewrite decoding dependencies.

R150's current repository report already establishes a software recovery-window experiment; it explicitly does not establish browser/native admission. This batch addresses that missing destination boundary, not another performance rerun of its stopped/inconclusive small subprocess profile.

### Results

At cuts one and three seconds, fresh host decoders with show-all enabled produce 20 pictures each. For both cuts, offsets 0–7 differ from the full uninterrupted decoded source, while offsets 8–19 match exactly.

An uninterrupted MSE control buffers [0,5], supplies 40 requested pictures around the two intervals, and reaches EOF. Four cold cases — early and conservative post-recovery seeks for each cut — accept the submitted bytes without a synchronous append rejection, but produce **an empty buffered range**. They are rejected before trying to present missing data. Requesting only later, theoretically recovered pictures does not change that outcome.

### Decision

**Stop this native cold-recovery candidate on the tested browser profile.** Decoder recoverability in a host program does not establish MSE admission. The existing ordinary source-start path remains the working native baseline. A different native endpoint or a software-prefix handoff would require its own experiment; neither was implemented here.

Do not generalize the result to all recovery SEI profiles, browser versions or native decoders. This was video-only. No claimed CPU saving is attached to the eight-picture recovery window.

Evidence: `refresh_manifest.json`, `browser_refresh.json`, and per-fragment probe records.

## D46 — Treat codec/container color conflicts as an authority problem

### Question and method

Prior D20 tested explicit color signaling. This follow-up tests **conflicting** signals, including matrix/primaries/transfer and full-versus-limited range. Three coherent controls use limited-range BT.709, a tested limited-range 601-family triple, and full-range BT.709. Four authored conflict files place one declaration in AVC's configuration and another in MP4 `colr`.

Both direct Blob and MSE playback are sampled at four presentation times. A separate set of resolved variants uses an explicit fixture contract: in this particular request, the container declaration is authoritative. FFmpeg's metadata bitstream filter updates the AVC declaration, and the container fields are made coherent. The policy guard rejects conflicting declarations when no authority is supplied. This is a prototype policy check, not a production provenance engine.

### Results

In all four conflict cases and both browser endpoints, displayed hashes match the **bitstream** control, not the conflicting container control. Rewriting only the container therefore does not produce the explicitly requested alternate appearance.

After the authorized normalization, all four variants match the requested coherent reference at all four checked times through both endpoints: **32 matching resolved output witnesses**. Seeks, duration and EOF complete. All 40 coded picture packets in each resolved file retain their hashes, PTS, DTS, durations and sizes compared with the corresponding conflicting source.

Across all eleven coherent, conflicting and resolved files, a host raw-component decode without pixel-format/range conversion yields one identical raw-component hash. The declaration changes presentation interpretation, not the compressed picture content.

### Decision and cautions

Pursue **source-authority-aware admission and metadata propagation**. Do not assume that changing MP4 `colr` alone fixes display output, and do not turn the observed browser precedence into a universal rule that the bitstream is always the user's intended truth.

These fixtures deliberately specify the authority. An arbitrary ambiguous real file does not. Preserve its original semantics or apply an explicitly declared repair policy rather than guessing. This is not automatic BT.709 tagging, HDR qualification, physical display calibration, arbitrary ICC handling, or a measured decoder optimization. The rewrite was executed with host FFmpeg; a maintained Wasm/browser rewrite artifact was not tested.

Evidence: `color_manifest.json`, `color_authority_controls.json`, `browser_colors.json`, and `browser_color_resolved.json`.

## D47 — Bounded Vorbis views across short/long blocks

### Candidate and distinction from prior work

The source contains 384,013 authored stereo sample frames at 48 kHz, encoded into 846 Vorbis packets. The actual source uses 538 blocks of size 256 and 308 of size 2048, with 82 block-size transitions. The three setup headers are parsed by libVorbis and its `vorbis_packet_blocksize` API supplies each actual packet's block size. The adapter does not decode samples when constructing its views.

A validated finite Ogg parser checks page CRCs, sequence/serial continuity and packet boundaries. Each requested view preserves the original three headers, the required preceding overlap packet and the following packets covering that interval. Its Ogg granules are regenerated from the true adjacent block sizes. The final granule caps output at the requested end. The browser decodes this small complete Ogg resource; the requested samples are selected using explicit integer sample coordinates.

This is a **bounded cold-preview consumer** with real short/long transitions, not R223's four parallel host subprocesses. That current repository profile was stopped on full cost. Its failure is not erased by a new destination-level correctness result.

### Six actual requests

| Requested interval, source frames | Preserved audio packets | Encoded view bytes | Returned browser frames | Extra browser tail frames |
|---|---:|---:|---:|---:|
| [12345,18321) | 19 | 6,556 | 6,336 | 111 |
| [65207,67631) | 5 | 5,033 | 2,752 | 273 |
| [139063,141487) | 7 | 5,213 | 2,560 | 81 |
| [218103,220527) | 17 | 6,219 | 3,392 | 17 |
| [296439,298863) | 16 | 6,341 | 3,712 | 337 |
| [379512,384013) | 16 | 5,883 | 5,056 | 115 |

Each preserves the selected compressed packets exactly. Host decode and crop match the corresponding host full-source samples. Browser decode and explicit crop independently match the corresponding browser full-source samples. Across the six requests, **20,173 stereo sample frames / 40,346 scalar samples** are exact.

A second real browser step schedules the six decoded window buffers through six AudioBufferSourceNodes into an OfflineAudioContext, using the declared source offsets, requested durations and integer-sample placement. Its 20,173-frame stereo output also matches every reference sample. The candidate nodes reference the bounded input buffers; only the oracle explicitly concatenates reference arrays.

All six omitted-predecessor controls fail sample/length equivalence. A damaged Ogg-page CRC is rejected. A complete repagination control matches each endpoint's original full-file decode.

### Important negative: granule trimming alone is insufficient here

Browser decoding returns an extra 17–337 frames beyond each view's declared end; even the original complete source returns 384,128 frames, 115 more than its authoritative 384,013-frame end. Host decoding honors that end. All tested intended-prefix values match, but **the untrimmed returned buffers are not exact clips**. The accepted operation therefore includes explicit output bounds and scheduling; the experiment does not qualify simply playing these view URLs as exact excerpts.

### Opportunity and cost limits

The largest returned candidate input AudioBuffer contains 6,336 stereo frames, equivalent to 50,688 bytes of Float32 sample data. The whole-source browser buffer contains 384,128 frames / 3,073,024 sample-data bytes. These are **logical buffer sizes**, not process-memory measurements or speedups. This harness retains the full-source reference and other outputs, so it is not a low-memory application demonstration.

The current prototype reads/indexes the full compressed source and repeats headers in each view. Source indexing/validation, setup cost, view construction, scheduling and repeated-request reuse must all be charged before a performance claim. A decoder-state interface or persistent pipeline might beat repeated small decodes. No live A/V, cancellation, general-rate conversion, mid-setup changes, multistream Ogg or arbitrary Vorbis profile is qualified.

Evidence: `vorbis_manifest.json`, `browser_vorbis.json`, `vorbis_reference.f32`, and `analysis.json`.

## Setup corrections and retained failures

1. An initial color-fixture writer omitted a `colr` box on a copy-remux output; fixture creation failed rather than testing nonexistent metadata. The writer was changed to request that box explicitly.
2. Initial controls had unspecified container primaries/transfer values, which caused direct/MSE reference disagreement. The definitive fixtures explicitly encode and carry the intended BT.709 controls. The initial observations and recipe are retained under `evidence/initial_video_profile/` as setup evidence, not merged into final qualification. The early fixture bytes were regenerated; those early reports are not a replayable alternative dataset.
3. An initial browser lifecycle helper awaited `play()` before waiting for the bounded EOF promise, which could hang when the decoder failed. It was corrected to await both concurrently. Two container invocations timed out; an interrupted partial record is retained. Timeout invocations are harness/setup failures, not additional experiments.
4. Native cold-recovery cases initially exhausted a case deadline while repeatedly seeking unavailable pictures. The final harness rejects an empty post-append buffered range immediately. Native rejection remains a failed candidate, not an environment excuse.
5. The unresolved tail discrepancies and direct-playback decoder failures remain in the final raw records. Passing checks deliberately assert their presence.

## Reproduction

Run in a fresh directory with the captured tool versions for fixture-identical results. Scripts regenerate their own synthetic fixtures. NumPy, Playwright, installed Chromium, FFmpeg/ffprobe with libx264/libVorbis support, and libVorbis are required. No dependency installation, network access, repository write or policy override occurs in the scripts.

```sh
python scripts/run_all.py
```

Individual stages can be rerun using the commands in `LOCAL_AGENT_HANDOFF.md`. `SHA256SUMS.json` records the delivered files. `evidence/commands.jsonl` records subprocess arguments, return codes and stderr, including earlier setup failures. A successful replay on a different decoder build does not automatically inherit this profile's exact recorded hashes or histogram.

## Primary references and repository lineage

* W3C ISO BMFF byte-stream format: https://www.w3.org/TR/mse-byte-stream-format-isobmff/
* FFmpeg bitstream metadata operations: https://ffmpeg.org/ffmpeg-bitstream-filters.html
* Xiph Vorbis I decode/overlap and Ogg encapsulation specification: https://xiph.org/vorbis/doc/Vorbis_I_spec.html
* R150 current report: https://github.com/Jagalite/demuxe/blob/015004be024fc04cb0234f523290b4c377870257/research/items/R150.recovery-windows-rather-than-immediate-clean-access-assumptions/README.md
* R223 current report: https://github.com/Jagalite/demuxe/blob/015004be024fc04cb0234f523290b4c377870257/research/items/R223.decode-one-vorbis-stream-in-parallel-using-small-overlapping-boundaries/README.md
* Current catalogue: https://github.com/Jagalite/demuxe/blob/015004be024fc04cb0234f523290b4c377870257/research/ITEMS.md

No external source is being cited as evidence that these new scripts ran. That evidence is the supplied executable sources, authored media, captured results, commands and checksums.
