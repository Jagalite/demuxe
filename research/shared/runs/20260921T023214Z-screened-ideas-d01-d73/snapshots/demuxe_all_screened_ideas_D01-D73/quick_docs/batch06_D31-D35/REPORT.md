# Demuxe focused research — batch 6: D31–D35

**Executed:** September 20, 2026. **Repository read:** `Jagalite/demuxe`, main at `01611bdaa2d9a21903bd2f1086fe0d786df6d5d1`.

This package contains five new bounded questions/subcases and actual component tests. They are not five newly invented mechanisms or five accepted production routes. D31 extends existing Opus repacketization research, D34 advances an explicit existing JPEG XL fixture/API gate, and D35 uses an established Web Audio operation as an alternative to the failed D33 metadata route. Temporary D-labels are not canonical R-numbers.

**No Demuxe runtime execution or repository modification occurred.** No performance gate was run. No hardware decoding, energy, CPU saving, physical output fidelity, cross-browser guarantee or real-world prevalence is claimed.

## Executive findings

| Item | Actual result | Disposition |
|---|---|---|
| D31: phase-adaptive Opus grouping | 856 2.5 ms packets become 135 packets, retaining the first 32 individually and grouping the rest into 20 ms units. All constituent frames and whole-file decoded samples remain exact. MSE plays, but its reported duration differs by 0.5 ms. | Pursue the submission-count tradeoff; strict streaming timeline pending. |
| D32: finite G.711 AU → WAVE | Both original AU files fail browser decoding; a header rewrap, without sample conversion, enables direct browser playback and exact agreement with a browser PCM-WAVE reference. | Pursue finite-file route only. |
| D33: metadata-only exact MP4 audio edits | Single and two-part edit views preserve media data, but complete decoded output has wrong tails or joins. Direct elements play and advertise the intended duration; their exact sample output is not certified. | Stop the tested exact whole-file edit route. |
| D34: JPEG-origin JPEG XL reconstruction | Actual host libjxl recovers four original JPEGs byte for byte; the browser rejects JXL but renders recovered JPEGs exactly like the originals, including orientation and ICC metadata. | Fixture/host API pass; browser/Wasm reconstruction not run. |
| D35: source-bound sample-window scheduling | Browser-native AudioBufferSource scheduling renders the single and two-part audio edits sample exactly for both AAC and FLAC sources. | Pursue bounded decoded-buffer workflows, not full-file streaming replacement. |

## Environment and method

Chromium **144.0.7559.96**; FFmpeg **7.1.5-0+deb13u1**; host libjxl **0.11.1**; Python **3.13.5**; Playwright; NumPy; Pillow; system libopus. The browser page has an opaque origin and is not a secure context: `VideoDecoder` and `AudioDecoder` are undefined there. This batch uses actual MSE, media elements, Canvas, decodeAudioData, and OfflineAudioContext; it does not infer WebCodecs availability on other origins.

All fixtures are authored synthetic data. Browser fixture bytes are passed through the test bridge, not a live network source. Host decoding is used for reference comparisons, not relabeled as browser decoding. JPEG XL reconstruction is deliberately identified as host work. `evidence/environment.json`, `commands.jsonl`, and the stage-specific browser records contain the actual observations.

Exact whole-file output is compared against the corresponding unmodified source decoded by the same endpoint. This preserves the decoded signal, not pre-encoding samples for lossy AAC/Opus. Independent host and explicit integer oracles are added where specified. Host and browser may share a decoder implementation family; they are separate executions, not necessarily independent codec implementations.

Media-element lifecycle records verify selected seeks, EOF, and a non-silent signal at the Web Audio capture boundary. The callback sample counts/RMS values are not exact streaming PCM or tail oracles. No actual video was played in this batch: these are audio and image components, not full synchronized A/V routes.

## D31 — Change packet grouping after startup rather than imposing one latency policy

**Relation:** phase-adaptive extension of `R203.regroup-existing-opus-frames-without-re-encoding`. The existing record already proves fixed grouping; the question here is whether the startup representation can remain fine-grained while steady-state packets become larger.

**Construction:** A 2.137-second mono 48 kHz source is encoded into 856 single-frame, 2.5 ms Opus packets. The candidate retains the first 32 packets (80 ms of coded duration, not 80 ms of post-preskip audible output), then groups the remaining compatible frames eight at a time. Actual libopus repacketizer calls construct output packets. Splitting the result back yields byte-identical original single-frame packets. Mixed configuration and unsupported policy/empty-packet cases reject. Ogg headers retain pre-skip and final granule; an FFmpeg packet-copy remux supplies WebM.

| Representation | Codec packets | Ogg bytes | WebM bytes |
|---|---:|---:|---:|
| Original FFmpeg-muxed source | 856 | 24,833 | Not generated |
| One-packet-per-page unbatched control | 856 | 47,837 | 29,406 |
| Adaptive: first 32 unchanged, then groups of eight | 135 | 27,738 | 25,273 |
| Uniform groups of eight | 107 | 26,958 | 25,113 |

The fair same-writer comparison reduces packet count from 856 to 135. The adaptive Ogg remains **larger than the originally muxed Ogg**, so a packet-count reduction is not an unconditional bandwidth win. WebM sizes compare the same FFmpeg muxer policy.

All output variants preserve **102,576 whole-file decoded mono samples** in host libopus execution and browser decodeAudioData, including the Ogg and WebM destinations. The wrong-final-granule control removes 120 samples and fails the same equivalence test. Thus a granule error cannot hide behind preserved constituent codec frames.

Actual WebM MSE playback seeks to 0.25 and 0.85 seconds, replays from 0.01, produces a non-silent captured signal, and reaches EOF for all three variants. However, MSE reports **2.1405 s** for the unbatched control and **2.141 s** for both grouped versions. The decoded audio is 2.137 s. The **0.5 ms between representations is retained as a strict streaming-presentation gap**, not waved away because PCM is exact at a different API boundary. Timecode quantization is a follow-up hypothesis, not a diagnosed cause.

The first 32 packets need no grouping wait. Under serial just-in-time delivery, the first frame in a full 20 ms group would wait up to an additional **17.5 ms** for its peers. This follows from the chosen packet durations; end-to-end startup/latency was not benchmarked. Fewer codec packets also do not prove fewer JavaScript MSE append calls, since an append can carry many packets.

**Next smallest gate:** a real packet-submit or mux-owner workload with an explicit latency budget; exact WebM timestamp/tail audit; only then paired complete-cost measurements. Do not create a new generic repacketizer subsystem or revive a bandwidth claim unsupported by these files.

**Evidence:** `opus_component.json`, `browser_decode.json:opus`, `browser_opuslife.json`, `scripts/opus_group.py`.

## D32 — Rewrap G.711 telephony audio rather than decoding it in application code

**Question:** Is the missing capability the compressed audio itself, or its AU file wrapper?

The prototype parses finite AU headers for mono/stereo G.711 mu-law or A-law, checks the declared rate, byte count and sample alignment, and constructs a WAVE header (`fmt`, `fact`, `data`). The coded sample bytes are copied intact; the adapter never expands or recompresses them. It is not an AU general-purpose converter and does not preserve arbitrary annotation metadata.

For each of two 8 kHz mono fixtures:

- Original AU: **10,728 bytes**, rejected by browser whole-file decoding and the direct media element.
- Wrapped WAVE: **10,754 bytes**, with all **10,696 coded bytes** unchanged.
- Host decode of both representations matches exactly; an independently implemented G.711 lookup calculation also reproduces every source integer sample.
- Browser decoded output matches the corresponding host-decoded-to-PCM-WAVE browser reference for all **10,696 samples**.
- Direct playback seeks to 0.25 and 0.85 s, produces the expected nonzero audio signal and reaches EOF at a reported 1.337 s.

An additional 771-sample fixture covers all **256 companded byte values** for each law. It matches the browser PCM-WAVE reference exactly and matches the manual integer oracle in host decoding. The wrong-law label still decodes, but all 10,696 signal samples differ. Unknown length, truncation and unsupported encoding guards reject.

### Numerical boundary and streaming restrictions

A stricter `signed_integer / 32768` Float32 contract **does not match** this browser destination for every positive sample: 382 mu-law and 386 A-law values differ in the 771-value fixtures; maximum absolute errors are approximately **2.99e-5** and **3.00e-5**. The browser's PCM-WAVE control shows the same values as the companded WAVE route. This is reference-relative browser equivalence, not universal normalization equality.

All four tested streaming MIME strings (`audio/wav`, two law-specific WAVE strings, `audio/basic`) return false from MSE support queries. IMA-WAVE and Microsoft ADPCM WAVE fixtures also fail the initial whole-file destination screen, while the PCM-WAVE control succeeds. Do not generalize the G.711 result to arbitrary WAVE codecs or a unified MSE A/V path.

**Next smallest gate:** real bounded AU/call-recording sources, metadata policy and stream/seek behavior on intended platforms. Use finite browser audio where it fits; keep the fallback for unsupported ADPCM and live/unbounded forms. This is not a physical-speaker or sample-exact post-seek capture qualification.

**Evidence:** `audio_destination_probe.json`, `au_component.json`, `browser_decode.json:pcm_*`, `browser_aulife.json`, `scripts/au_wrap.py`.

## D33 — Can finite MP4 edit metadata express exact audio excerpts?

**Relation:** a negative subcase adjacent to native virtual-view/excerpt research. It does not implement `R109`'s sample-table/range-map author or its video A/B/A contract.

Two 2.137-second mono 48 kHz sources, AAC and FLAC, have a tail-positioned `moov`, one track, one original unit-rate edit, and movie/media timebases of 48,000. The prototype edits only movie/track duration and the `elst` records. Original `mdat` bytes and their positions remain unchanged. A single edit changes no file length; a two-part edit adds 12 metadata bytes.

Requested output windows, in samples of the original decoded presentation:

- Single: `[12345, 67890)`, total **55,545 samples**.
- Two-part: `[12345, 40001)` followed by `[71234, 90000)`, total **46,422 samples**.

| Codec / edit | Expected frames | Browser whole-file frames | Browser comparison |
|---|---:|---:|---|
| AAC single | 55,545 | 56,263 | Requested prefix exact; 718 extra tail samples |
| FLAC single | 55,545 | 56,775 | Requested prefix exact; 1,230 extra tail samples |
| AAC two-part | 46,422 | 46,199 | First 27,656 exact; second interval differs, and length is short |
| FLAC two-part | 46,422 | 47,559 | First 27,656 exact; all 18,766 checked samples of second interval differ |

The host FFmpeg reference execution also fails complete edited-output equivalence, sometimes differently. Its actual counts and mismatch counts are retained in `edit_component_analysis.json`; the host is not treated as an unquestionable edit oracle. The actual oracle is concatenation of the requested integer-indexed slices from each endpoint's own full-source output.

Direct audio elements reach EOF and report the intended approximately 1.157188 s and 0.967125 s durations. These direct captures establish lifecycle and non-silent output, **not complete sample alignment**. The decodeAudioData failures do not prove that every direct-media sample is wrong. Exact direct-element edit fidelity remains unqualified. No MSE multi-edit support is inferred; MSE's specific single-edit requirement is not a promise to execute arbitrary edit lists.

**Decision:** reject the tested whole-file metadata-only route for this exact-output contract. Do not infer correct tail/join behavior from unchanged coded bytes, reported duration, or EOF. Do not silently substitute waveform approximations or a lossy re-encode.

**Evidence:** `edit_component.json`, `edit_component_analysis.json`, `browser_decode.json:*_edits`, `browser_editlife.json`, `scripts/edit_view.py`.

## D34 — Recover original JPEG bytes from JPEG-origin JPEG XL, then use browser JPEG decoding

**Relation:** bounded advance of `R146.jpeg-xl-reconstruction-followed-by-browser-jpeg-decode`. The existing record specifically asks for a genuine JPEG-origin fixture, reconstruction API, exact JPEG identity and controls. This batch establishes the **host** part, not the Wasm API artifact.

Actual libjxl encoding creates reversible JPEG-origin JXL files from four authored JPEGs. Actual libjxl decoding subscribes to JPEG reconstruction, supplies a bounded JPEG output buffer, and requests **no raster output buffer**. It reconstructs the original JPEG byte stream before that JPEG is passed to the browser image decoder.

| Fixture | Original JPEG | JXL | Recovered JPEG identity | Browser picture comparison |
|---|---:|---:|---|---|
| Baseline RGB, 160 x 96 | 8,024 B | 6,563 B | Byte exact | Exact |
| Progressive RGB, 191 x 113 | 10,317 B | 9,018 B | Byte exact | Exact |
| Grayscale, 127 x 73 | 3,347 B | 3,035 B | Byte exact | Exact |
| JPEG with orientation and sRGB ICC metadata | 8,666 B | 6,847 B | Byte exact | Exact; displayed 96 x 160 |

All four JXL files are rejected by the tested browser's native image route. All four recovered JPEGs decode and have the same Canvas-visible dimensions/hash as their original JPEGs. Byte identity also preserves the original ancillary JPEG metadata in these fixtures; it does not certify arbitrary color-management behavior on every display.

The API test rejects a JPEG-origin JXL encoded **without reconstruction metadata**, a truncated JXL, and a 128-byte output cap for each fixture. Output is not published until API completion. The cap bounds the supplied JPEG output buffer, **not all internal libjxl memory**. Missing reconstruction metadata requires another route, not invented JPEG data. This does not provide an arbitrary JXL-to-JPEG lossless converter: the narrow source must have the needed reversible-JPEG representation.

**Why it remains interesting:** compatibility work can terminate at another compressed format that the browser already decodes. The application need not request a full JXL raster in this pathway. Nevertheless, libjxl reconstruction still performs work, and adding browser JPEG decoding has a cost. It is not a zero-work wrapper or a measured win.

**Next smallest gate:** build/expose the reconstruction-only API in the actual supported browser/Wasm environment, repeat these hash/output/negative cases there, then compare total initialization, reconstruction, intermediate JPEG retention and browser decode against full software JXL raster output. No existing Wasm export or Demuxe integration is claimed.

**Evidence:** `jxl_component.json`, `browser_images.json`, `jxl_stdout.txt`, `jxl_stderr.txt`, `scripts/jxl_bridge.py`.

## D35 — Preserve exact edits by moving selection to the native audio scheduler

**Question:** When edit metadata fails a sample-exact contract, must audio decoding and scheduling move into a custom software engine?

This is a scoped use of standard AudioBufferSourceNode scheduling, not a newly invented codec mechanism. It is adjacent to the existing browser-native audio-graph direction (`R061`), but it tests source selection and joins rather than channel permutations.

The browser first decodes the original AAC or FLAC source once. A bounded plan validates mono, matching 48 kHz sample rate, integer in-range source windows and a maximum output size. Each node references the **same source AudioBuffer** and uses sample-derived start/offset/duration values; the candidate does not build a new concatenated sample buffer before scheduling. The independent oracle does concatenate source slices for comparison after rendering.

OfflineAudioContext output matches **every sample** for both the 55,545-frame single edit and the 46,422-frame two-part edit, for both source codecs: **four exact results, 203,934 scalar values checked**. Shifting the requested source offset by one sample makes every compared value differ. Out-of-range windows, fractional sample positions and a different output sample rate are rejected by the scoped guard.

The source AudioBuffer contains **102,576 mono Float32 frames**, a logical payload of **410,304 bytes**, even when the requested output is shorter. The offline result buffer and other engine allocations are additional. Shared JavaScript object identity does not prove internal zero-copy or zero-allocation behavior. Complete source decode and retention may make this inappropriate for long streaming media.

**Decision:** pursue for already-decoded or deliberately bounded audio workflows, where native decode plus native scheduling fits the requested semantics. Do not replace a cheaper working compressed direct/MSE path by default. Live scheduling, physical playback, A/V synchronization, source replacement, pause/replay and long-running memory remain untested.

**Evidence:** `browser_schedule.json`, `scripts/browser.js:scheduled`, and guards in `validateWindows`.

## Qualification accounting

`evidence/verification.json` contains **105 passing post-run consistency checks**. Many check that a negative or a limitation was successfully detected. This is **not** 105 experiments, five universal route passes, or a passed performance gate. In particular, D31 retains its MSE duration discrepancy, D32 retains its strict-normalization discrepancy, D33 remains a failed exact-output candidate, and D34/D35 have unexecuted browser-Wasm/live-owner gates.

An initial environment-query JavaScript syntax error occurred before media execution because Python string escapes consumed MIME quotes. It was corrected by making that query a raw string. `harness_notes.json` records the correction; no media failure was reclassified or overwritten by it.

## Reproduction and evidence

Run from the extracted package:

```sh
python scripts/run_all.py
```

The runner installs nothing and uses no external services. It requires Python packages `playwright`, `numpy`, `Pillow`; `/usr/bin/chromium`; FFmpeg/FFprobe; libopus; and libjxl exposing the tested C API. It regenerates fixtures and raw observations, then runs verification. Metadata such as encoder serials/profile timestamps can alter regenerated file hashes; compare behavior and newly recorded manifests, not old byte hashes across unrelated fixture generations. Source-bound identity comparisons within each run remain mandatory.

Raw JSON, command logs, authored fixtures, executable adapters, malformed controls, reports and handoff are included. `SHA256SUMS.json` identifies the shipped bytes. The code is an experimental bounded profile, not a hardened untrusted-media parser.

## Source references

- Pinned research: `Jagalite/demuxe` at the commit above; R203 (Opus grouping), R146 (JPEG reconstruction), R061 (native audio graph), R109 (edited virtual MP4) read through the connected GitHub tool.
- Opus repacketizer contract: https://opus-codec.org/docs/opus_api-1.5/group__opus__repacketizer.html
- Ogg Opus framing and granules: https://www.rfc-editor.org/rfc/rfc7845.html
- G.711 RTP profile definitions: https://www.rfc-editor.org/rfc/rfc3551.html
- libjxl encoder/decoder API: https://libjxl.readthedocs.io/en/latest/api_encoder.html and https://libjxl.readthedocs.io/en/latest/api_decoder.html
- Web Audio scheduling and buffer semantics: https://www.w3.org/TR/webaudio-1.0/
- MSE ISO BMFF initialization/edit requirements: https://www.w3.org/TR/mse-byte-stream-format-isobmff/

Specification/API sources explain the mechanism, not the numerical results; the latter are supported by the executed evidence files.
