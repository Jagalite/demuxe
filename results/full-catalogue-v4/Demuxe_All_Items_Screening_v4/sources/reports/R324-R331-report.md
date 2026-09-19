# Demuxe media/browser frontier — R324–R331 executed results

**Run date:** 18 September 2026  
**Environment:** Chromium 144.0.7559.96, FFmpeg 7.1.5, Python 3.13.5, Node 22.16.0, libaom 3, libopus runtime, FLAC 1.5.0, libass 0.17.3.  
**Provenance:** exact R324–R331 definitions were recovered from the prior Demuxe Project idea-generation conversation. They had not been persisted as a standalone proposal file.  
**Scope:** controlled component/sandbox experiments; no Demuxe production source changes.

## Result summary

| ID | Verdict | Decisive result |
|---|---|---|
| R324 | **PROMISING / strong primitive; existing encoder already uses it** | Lossless A→B→A→A→C→A produced 180/180 exact displayed pictures and **42 show_existing_frame** outputs. Every show-existing picture matched a prior decoded state and its source state. Median show-existing packet **5 B** vs **17 B** ordinary display packets. Total bytes did not beat the libaom comparison because that encoder also chose show-existing. |
| R325 | **PROMISING static component** | Three WebP variants reused exactly one VP8 color payload while changing only independent raw ALPH data. Cached-color + alpha-only reconstruction was byte-exact to full FFmpeg RGBA for all three. |
| R326 | **PROMISING / strong narrow** | A 155-byte exact synthetic MPEG-2 I reference followed by **20 unchanged source P packets** decoded to the exact original suffix. Starting directly on the P suffix failed the first-frame oracle. |
| R327 | **PROMISING / strong component** | One six-channel FLAC decode fed three different rate/layout consumers. All three outputs were byte-identical to three independent decoder instances; median wall time **112.5 vs 144.8 ms (1.29×)**. |
| R328 | **PROMISING correctness / small measured gain** | With b-pyramid disabled, **127 non-reference B pictures** were skipped while all **53 visible/reference pictures** remained hash-exact. Tiny-fixture timing improved only about **5.5%**. |
| R329 | **PROMISING / strong component** | A checkpoint combining libopus decoder bytes, nonzero 44.1-kHz resampler phase, mix/IIR/meter state and presentation position resumed **66,040 output samples bit-exactly**. Omitting either phase or IIR state broke equality. |
| R330 | **PROMISING component** | Identical ASS dialogue lines at four equal local fade times generated identical libass image/scene signatures; a one-word change invalidated reuse. Reuse traversal is much cheaper than another render call, but the timing is only a component upper bound. |
| R331 | **PROMISING / strong narrow** | On an 8-channel independent FLAC, only L/R/C/LFE were reconstructed. All four selected channels and the derived stereo integer matrix matched full decode exactly. A forced mid/side stereo control triggered the required fallback gate. |

**QA: 59/59 checks passed.**

## R324 — AV1 repeated-state reuse

A libaom lossless sequence used six 30-frame states: A→B→A→A→C→A. ALTREF/show-existing was enabled and output PTS was explicitly associated back to the source frame rather than inferred from decoder output order. All 180 timestamps were present and every decoded frame matched the source state exactly. Forty-two displayed frames carried `show_existing_frame`; all 42 had an identical earlier decoded frame hash.

Those show-existing temporal units were only 5 bytes median, versus 17 bytes for ordinary displayed-frame packets. However the overlay-enabled comparison encoder produced the same total 4,353 bytes and also used show-existing. The durable result is therefore **the mechanism and its exact repeated-state behavior are real, but no new size win over this libaom baseline was demonstrated**. Direct seeking to a show-existing picture would still require its reference state; this is not a random-access representation.

## R325 — alpha-only transparent images

The controlled WebP profile consists of `VP8X + uncompressed ALPH + VP8`. One 2,396-byte VP8 color payload was reused unchanged in three files with different 12,288-byte alpha planes. The candidate decoded the color once, read only the new ALPH plane for each variant, and combined them. Every resulting RGBA byte matched FFmpeg's full WebP decode.

Chromium also accepted all three files and exposed the exact alpha plane through canvas. Canvas RGB for translucent pixels is not used as the raw-decoder oracle because browser canvas composition/premultiplication changes that observation. This result applies only to independently stored alpha; PNG-like coupled compression is not admitted automatically.

## R326 — synthetic predictive reference boundary

The MPEG-2 source is a deliberately narrow I/P-only, no-B sequence with one reference chain and macroblock-constant content. Frame 9's already-decoded pixels were re-encoded as an exact intra reference. That 155-byte synthetic reference was followed by the original source packets for frames 10–29 without modifying their payloads.

The synthetic frame decoded exactly to source frame 9, and all 20 copied P pictures then decoded byte-exactly to the uninterrupted source. The negative control started at the P suffix with no synthetic reference: FFmpeg warned that the first frame was not a keyframe and the first decoded picture failed the oracle. This proves the concept only for a profile where matching reference pixels are sufficient; codecs with additional hidden reference state need separate qualification.

## R327 — one audio decode, several consumers

A 12-second six-channel FLAC fed three consumers: 48-kHz stereo, 44.1-kHz mono, and 32-kHz stereo with different mix matrices. The independent baseline opened three decoder instances inside one FFmpeg process. The candidate decoded once and streamed the canonical decoded frames through `asplit` into the same transforms.

Every output byte matched. Seven-run medians were 144.8 ms for three decoders and 112.5 ms for one shared decode. The candidate is streaming: it does not require retaining the whole decoded movie in memory. This is a host FFmpeg component result, not a matching Demuxe/Wasm benchmark.

## R328 — skip fully occluded non-reference pictures

The H.264 fixture has 180 frames with `b-pyramid=none`, making 127 B pictures non-reference. The controlled presentation declares every B-picture interval fully covered by a full-screen overlay. FFmpeg's non-reference discard path produced only the remaining 53 pictures. Their hashes, in display order, match the same 53 pictures from full decoding exactly.

The seven-run median changed only from 109.6 to 103.9 ms, so this fixture does **not** justify a large performance claim. Covered reference pictures remain ineligible for this optimization.

## R329 — whole audio-pipeline seek capsules

Elementary libopus used valid 2.5-ms stereo packets so a 48→44.1-kHz rational streaming resampler had a nonzero phase at packet boundaries. After packet 401, the checkpoint stores a 149,876-byte decoder snapshot plus resampler phase 12000, mix/filter/meter state, source hash, recipe identity and presentation position.

Restoring that capsule into a fresh decoder/pipeline produced the remaining 66,040 stereo output samples with the exact same float64 byte hash and final meter state as uninterrupted processing. Resetting resampler phase changed output length and bytes immediately; zeroing IIR state also diverged immediately. A production capsule should use a maintained/versioned state representation rather than assuming raw library-state bytes are portable across libopus versions.

## R330 — reusable subtitle scene objects

libass 0.17.3 rendered two identical `Hello world` dialogue events with identical style and `\fad(300,300)` at different absolute times. Four matching local times—fade-in, visible, and fade-out phases—produced identical full `ASS_Image` signatures and identical geometry/bitmap/color structure. `Hello brave world` produced a different structure, correctly invalidating reuse.

Repeated `ass_render_frame` evaluation at the same scene was about 7768 ns per call in this microprobe, whereas walking the already-materialized three-image scene was about 3.9 ns. That ratio is intentionally **not** a whole subtitle-rendering speed claim: real scene caches need lifetime management, composition, transforms, invalidation, font fallback and layout keys.

## R331 — selective FLAC channel reconstruction

The 2-second 7.1 FLAC contains 84 frames and eight independent fixed-predictor subframes. The candidate entropy-parses every subframe to remain synchronized but runs predictor reconstruction only for channels 0–3 (L/R/C/LFE), skipping reconstruction for channels 4–7. The four selected 96,000-sample channels match FFmpeg's full eight-channel decode exactly, and an integer stereo matrix derived from them is byte-exact to the same matrix computed from full PCM.

Exactly half of channel reconstruction work is removed in this profile. A forced stereo `mid_side` control reports channel-assignment code 10 and is rejected by the selective-independent gate. This result does not imply that coupled FLAC channels can be skipped independently.

## Evidence boundary

These results establish codec/container/component primitives in the recorded Linux environment. They do not establish whole-Demuxe performance, universal browser behavior, or production admission. R324's total-size comparison found no improvement over libaom's existing behavior. R330's timing omits full composition/cache management. R327/R328 timings are host FFmpeg measurements. R326 and R331 are intentionally narrow syntax profiles.