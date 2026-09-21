<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Batch 10: native operations, numerical boundaries, and useful negatives

## Executive result

Four bounded questions were actually executed: D48 MP3 window decoding, D49 CSS display cropping, D50 integer-safe MP4 epoch reduction, and D51 browser-native crossfades. These are research extensions/subcases, not claims of four novel inventions.

The useful positives are native display-only cropping in the tested one-to-one profile and native float crossfades within a declared numerical tolerance. The strict browser MP3 window contract failed even when host floating-point output was exact. Timestamp rebasing is a useful correctness stress test, not evidence of a large common-format opportunity.

| ID | Outcome | Scientific disposition |
|---|---|---|
| D48 | Nine-packet host windows match four requested excerpts, but no tested browser short window is bit-exact. Repeat and full-prefix controls isolate a stable boundary effect. | Stop strict browser short-window candidate; do not assume more warm-up establishes exactness. |
| D49 | 12/12 one-to-one crops exact; 8/12 two-times-DPI crops exact. Remaining four differ by one 8-bit level at 278 components in total. | Pursue explicitly display-only profile; high-DPI exactness not generally qualified. |
| D50 | Integer rebasing restores all nine fragments byte for byte in Python and actual browser JavaScript. A normal offset already works; an extreme offset fails and lossy subtraction shifts timing. | Add precision guards at actual integer-to-time boundaries, not a universal normalization stage. |
| D51 | Three native crossfades meet absolute error <=2e-7 across 591,676 scalar samples; unaffected regions exact. Incorrect scheduling and k-rate controls fail. | Pursue already-decoded/bounded playback or preview consumers under that float contract. |

## Execution and evidence limits

Pinned repository review: `efd9e1537666b3120936ed24a34431645506e953`. See [REPO_LINEAGE.md](REPO_LINEAGE.md). No maintained-player code was built, executed, edited or pushed.

Actual environment: Chromium 144.0.7559.96; FFmpeg 7.1.5; Python 3.13.5; Linux; NumPy, Pillow and Python Playwright. `about:blank` had opaque origin, `isSecureContext=false`, and no `VideoDecoder`/`AudioDecoder` globals. Tests used ordinary media elements/MSE, CSS, browser whole-file audio decoding, and OfflineAudioContext. This is not a current browser-support survey.

There are no measured CPU, energy, memory-residency, throughput or hardware-decoder benefits. Buffer sizes and byte counts are structural counts. No physical speakers, HDR display, network service, encrypted presentation or GPU-overlay qualification was attempted. A retained JavaScript object does not prove a retained internal decoder instance.

Sources are locally authored. Video is 160x96, 25 fps, three seconds, AVC with no B pictures, one-second keyframe groups, explicit BT.709 limited-range metadata, and 90,000 media ticks/second. Audio includes independently seeded stereo samples, tones, changing frequencies, noise and level changes. Encoded fixtures are not claimed representative of real media distributions.

## D48 — Byte availability is not the complete MP3 output state

### Question and contract

For a small sample request, can a browser decode a short compressed MP3 window with sufficient preceding bytes/history and produce the exact same Float32 values as its own full-source decode?

The reference is the endpoint's decoded no-Xing MP3 output, not pre-encoding source PCM. The authored file contains 252 MPEG-1 Layer III stereo frames at 48 kHz and 128 kb/s. Both full decoders return 290,304 stereo sample frames. Four targets are inside packets 20, 73, 145 and 210; each requests 4,093 frames beginning 137 samples into the packet, totaling 32,744 scalar values across one policy's four requests.

The restricted parser validates MPEG version/layer, rates, channels, bounds and frame lengths, reads `main_data_begin`, and copies the original packet bytes. It supports this fixed configuration only. A reservoir-byte-only policy includes enough preceding main-data bytes to cover the target frame's stated borrow. This is deliberately NOT described as complete semantic decoder-state closure: earlier warm-up frames can themselves have dependencies and imperfect output.

### Tests and outcome

Policies: no preceding frame; reservoir-byte coverage; coverage plus one, three, or eight additional preceding frames. Every window ends seven packet ordinals after the target boundary. The smallest successful host policy consists of nine unchanged packets rather than the full 252.

Host floating-point FFmpeg decoding: all four no-preroll and all four reservoir-only controls differ. Adding one or more preceding frame beyond reservoir coverage makes all four requested excerpts exact. For this fixture, that means two packets/48 ms before the target packet; this is not a universal preroll bound.

Browser decoding: all 20 tested windows differ from the full browser decode. The 12 extended-warm-up windows have small but nonzero maximum error, up to **0.000030547380447387695**, approximately one 16-bit sample step. No exactness gate was relaxed after seeing that result.

Follow-ups:

- Decoding the full byte-identical source again matches exactly.
- Decoding each byte-identical short window again matches exactly.
- Keeping each original prefix, while truncating it after the required packet range, gives exact requested browser samples at all four targets.
- An explicitly selected host fixed-point MP3 decoder also produces a one-integer-step discrepancy on the short windows. Its different-sample counts for the +1 policy match the browser's combined channel counts (3,701; 1,053; 2,962; 3,809). This is consistent with a decoder arithmetic/state effect, but the browser's internal decoder selection was not traced and is not claimed proven.
- Malformed sync and truncated final packet inputs reject in the parser.

### Decision

Stop this strict browser short-window exactness profile. Retaining compressed bytes and enough reservoir data does not guarantee identical numerical output after a cold start. Do not infer that the host floating-point proof establishes the browser contract. A separately declared error-bounded operation, a known decoder implementation/state API, or full-prefix history could be researched, but none is promoted here as an exact bounded replacement.

This advances a destination question adjacent to R230. It does not reopen R230's failed host-subprocess performance comparison. A production candidate would also require source-bound indices, complete source/seek cancellation, bounded retention, end trimming and total request cost.

Evidence: [mp3_manifest.json](evidence/mp3_manifest.json), [browser_mp3.json](evidence/browser_mp3.json), [mp3_followup.json](evidence/mp3_followup.json). Constructors: `scripts/build.py`; browser test: `scripts/audio.js`; arithmetic follow-up: `scripts/mp3_followup.py`.

## D49 — Crop the native presentation, not the encoded image

### Question and contract

A previous metadata-only crop failed browser geometry. Can an explicitly requested display-only crop instead stay on the ordinary video element, using CSS clipping and positioning with no encoded-media mutation and no Canvas renderer in the candidate path?

The candidate places the original video at negative source x/y coordinates inside an `overflow:hidden` viewport. The dimensions are source display-pixel coordinates, assuming square pixels, no rotation, no source configuration changes, integer rectangle boundaries, and no additional display scaling other than the tested device scale.

The oracle is an independently cropped screenshot of an uncropped video at the SAME browser presentation time. This deliberately preserves the browser's own color/chroma rendering contract; it is not a match to an independent FFmpeg raster. A separate Canvas hash and callback timestamp check verifies that both media elements are on the same complete source picture. Canvas is only a witness, not the crop renderer.

### Tests and outcome

Three rectangles: `(8,8,144,80)`, `(23,7,115,83)`, `(40,20,64,52)`. Four seek times include returning backward. Each is tested at device-pixel ratios 1 and 2.

- At DPR1, all **12/12** screenshots are component-exact to the independently cropped display reference.
- At DPR2, **8/12** are exact. All four failures are the `(23,7,115,83)` rectangle: 68, 37, 55 and 118 differing components at the four times, each differing by one 8-bit level. Their exactness failure is retained. Rendering precision/interpolation is a possible explanation, not an isolated cause.
- All 24 complete-frame hash and timestamp controls agree.
- All 24 actual pointer clicks map back to the expected source coordinates.
- A one-pixel wrong-origin control differs substantially at both DPIs (13,472 and 63,204 components).
- Eight invalid-rectangle tests reject negative, zero, fractional or out-of-bounds coordinates.
- Each route completes subsequent playback and EOF at three seconds. Its video URL is unchanged, and only one loadedmetadata event occurs despite changing crop rectangles. Resources are cleaned up.

### Decision

Pursue explicitly display-only native video cropping in the qualified profile; do not declare general high-DPI pixel exactness. Do not infer less video decoding, smaller downloads, GPU-overlay retention, physical-display equivalence, or CPU savings. The whole coded frame is still supplied and decoded.

This does not create an exported cropped file or redefine codec geometry. Native controls, picture-in-picture/fullscreen, subtitles, arbitrary scaling, HDR, rotated/non-square-pixel inputs, changing frame geometry, and source-replacement behavior need separate qualification.

R008's maintained hybrid/software chroma-edge fidelity failure remains unresolved. Comparing the SAME browser render path here avoids that cross-decoder question; it does not disprove it.

Evidence: [browser_crop.json](evidence/browser_crop.json), `evidence/crop_*.png`. Actual replay: `scripts/run_crop.py`.

## D50 — Reduce an epoch while timestamps are still integers

### Question and contract

For an explicitly zero-based view of a timestamped fragmented source, should a large integer epoch be removed before converting timestamps to floating-point seconds or forwarding them to MSE?

The constructor adds a common integer origin to each version-1 `tfdt`; all other fragment bytes and coded payloads remain unchanged. Origins are `2^32+137`, `2^53+137`, and `2^62+137`, in 90 kHz ticks. The two largest are deliberately unrealistic clock-range stress cases, NOT typical movie timestamps or evidence of common-format prevalence.

Three approaches are compared: MSE `timestampOffset` applied to original large timestamps; exact integer subtraction in fragment metadata; and deliberately lossy double-precision subtraction followed by writing integers back.

### Results

| Origin | Native seconds offset | Exact integer rebase | Lossy subtraction |
|---|---|---|---|
| 4,294,967,433 ticks (~13.26 h) | All selected pictures/times, duration 3 s and EOF match. | Matches, but unnecessary for this profile. | Also matches. |
| 9,007,199,254,741,129 ticks | Plays but buffered interval and duration shifted by 5 microseconds. | Exact 3 s reference restored. | This fixture's particular subtraction happens to restore the exact deltas. |
| 4,611,686,018,427,388,041 ticks | Append error despite offset. | Exact 3 s reference restored. | Plays the same pictures at shifted times; duration **3.002488 s**. |

At the largest origin, lossy subtraction changes the three fragment decode origins from `[0,90000,180000]` to `[0,90112,180224]` ticks. The browser displays the expected checked picture hashes but their timestamps after the first fragment are shifted by 1.244 ms and 2.488 ms. Checking pictures and EOF alone would miss the changed timeline.

Python's integer constructor restores all nine original fragments byte for byte. An actual browser JavaScript adapter using `DataView.getBigUint64`, `BigInt` subtraction and `setBigUint64` independently returns the exact same reference fragment hashes. These are the same bytes whose MSE outcomes were recorded. It rejects seven tests covering source digest mismatch, missing precise origin, negative result, overflow, truncation, missing `tfdt`, and unsupported `tfdt` version. The digest and origin are supplied by the authored trusted manifest; the adapter cannot infer which origin is semantically correct for an arbitrary source.

### Decision

Use as a bounded precision/ownership regression at real integer-to-browser-time boundaries, not as an unconditional normalization layer. The modest-offset source already works untouched with `timestampOffset`. R220 already handles its scoped transport rollover and should not acquire a second post-demux normalizer.

Only one video track, one `traf`, version-1 `tfdt`, relative sample addressing, no edit lists, no indexes needing updates, no encryption, and a declared common origin are tested. Audio/video relative offsets, composition offsets, mixed timescales, subtitle clocks, `sidx`/`prft`/events and discontinuity policy need a fuller contract before broad adaptation. Large artificial failures are not a performance or market-coverage result.

Evidence: [clock_manifest.json](evidence/clock_manifest.json), [browser_clock.json](evidence/browser_clock.json), [browser_rebase.json](evidence/browser_rebase.json). Code: `scripts/rebase.js`, `scripts/build.py`, `scripts/run_clock.py`.

## D51 — Express a requested crossfade in the browser audio graph

### Question and contract

For already-decoded, bounded source buffers, can the browser schedule a linear overlap using native gain automation instead of generating a mixed intermediate input buffer or encoding a new compressed bridge?

The contract here is explicit floating-point playback rendering: exact unchanged prefix/suffix samples and maximum absolute error <=**2e-7** in the complete output against independently indexed Float32 arithmetic. That tolerance is encoded in `scripts/audio.js` as written before the first run. This is not R068's quantized-integer compressed-export contract.

Two stereo source buffers contain 48,013 and 56,007 frames at 48 kHz. The candidate references the original buffers through two AudioBufferSourceNodes, routes them through two GainNodes, and uses a-rate `linearRampToValueAtTime`. Fade lengths are 128, 4,093 and 12,001 samples. Buffer construction is fixture generation; the candidate does not construct a concatenated/mixed input buffer.

### Results

Across the three outputs, **591,676 scalar samples** are compared. The 128-sample fade is exact. The two longer fades differ in some overlap samples due to numerical arithmetic, with maximum errors of approximately 5.96e-8 and 7.45e-8. Every unchanged prefix and suffix is Float32-exact. Every positive stays within the declared 2e-7 bound.

Two controls run for every fade length:

1. Start the second source one sample late. The complete comparison fails, with errors up to about 0.05446.
2. Change gain automation to k-rate. Output fails the bound, with errors up to about 0.15852; the gain can remain incorrect beyond the overlap boundary in this fixture. Coarser control-rate automation is not the same sample-level fade.

### Decision and costs not measured

Pursue only where decoded buffers already exist or a bounded decode consumer is justified. The two inputs retain **832,160 bytes** of Float32 sample data; the largest output retains another 831,136 sample bytes. Browser internal buffers and temporary oracle storage are additional. These are logical counts, not peak-memory measurements.

No real-time audio device, live deadlines, audible seam test, A/V clock, source cancellation or user-gesture behavior is qualified by OfflineAudioContext. No reduction in software decoding is established. This does avoid requesting a new mixed input representation at the application boundary, but it is not proof of browser-internal zero-copy or a cheaper complete route.

Do not reopen R068's stopped Python/subprocess encoding profile on these results: this is a different output destination with a different numerical contract. Compare against the maintained player and an ordinary native graph before adding a new pipeline.

Evidence: [browser_crossfade.json](evidence/browser_crossfade.json); code: `scripts/audio.js`.

## Overall advancement order

1. D49: a small explicitly display-only API/regression, preserving the exact narrow output contract and high-DPI negative. Check whether the UI already clips native video.
2. D51: bounded preview/edit scheduling, only under the declared float contract and after checking current audio-graph ownership.
3. D50: integer-boundary tests and guards, not a new transform on normal media.
4. D48: retain as a strict numerical stop and a decoder-state reproducer. Do not turn a host pass into a browser pass.

The 83 passing consistency assertions include confirming these negative outcomes. They are not 83 experiments, four successful routes, or a complete player correctness gate. The package preserves the browser MP3 failure, high-DPI crop differences, time shifts, and non-bit-exact long crossfades.

## Standards/background used

These sources ground the mechanisms, not this container's empirical outcomes:

- MPEG audio framing and reservoir background: https://www.rfc-editor.org/rfc/rfc5219.html
- CSS clipping/overflow: https://www.w3.org/TR/css-overflow-3/
- ISO BMFF MSE segment requirements: https://www.w3.org/TR/mse-byte-stream-format-isobmff/
- ECMAScript numerical operations: https://tc39.es/ecma262/multipage/abstract-operations.html
- Web Audio gain automation, a-rate/k-rate, buffer scheduling: https://www.w3.org/TR/webaudio-1.0/

## Operational notes

No candidate failed run was replaced with a fake success. Follow-up tests have separate evidence files. One ad hoc screenshot-localization inspection initially omitted RGBA conversion and raised an array-shape error; this was not the candidate verifier (which already converts both images to RGBA), did not change its results, and did not contribute a pass. Full-source and window repetition controls were added after the MP3 discrepancy to distinguish unstable decoding from stable boundary differences. The executable crossfade tolerance was not relaxed to fit the results.
