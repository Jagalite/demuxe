# Matched Hybrid and unsupported-audio CPU comparison — 2026-09-24

## Result

The controlled H.264 runs show a large, repeatable-direction cost for the forced Hybrid stack even with browser-compatible AAC: **+30.76 core percentage points**, or **+54.74% relative to Native**, in paired rounds. Replacing AAC with AC-3 inside Hybrid added no stable CPU cost: **−0.96 points** (−1.11% relative), with the paired difference changing sign. The HEVC Main10 check showed the same pattern.

The Hybrid comparison includes the full route change: WebCodecs video and retained-frame presentation plus Hybrid's mpv/PCM/AudioWorklet audio path, compared with browser-native video and AAC. It does not isolate canvas time or video decoding by itself. The AAC-to-AC-3 comparison does isolate the audio codec change while keeping the Hybrid video route fixed.

No production routing, defaults, or playback behavior changed. The runner and fixture generator are research-only.

## CPU results

Each value is the median of five accepted, fresh-Chrome windows and is expressed as a percent of **one CPU core**. Renderer, GPU, and Audio service are Chrome process-role totals; Whole Chrome is their total plus other Chrome process roles. They are not direct subsystem timers.

| Arm | Video | Audio | Selected route | Whole CPU | Renderer | GPU | Audio service |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: |
| A — Native reference | H.264 1080p60 | AAC | `native-direct` (automatic) | 55.11% | 6.11% | 14.59% | 0.81% |
| B — Hybrid control | H.264 1080p60 | AAC | `hybrid` (forced) | 86.14% | 20.62% | 23.67% | 0.58% |
| C — Unsupported audio | H.264 1080p60 | AC-3 | `hybrid` (automatic) | 85.63% | 20.09% | 23.37% | 0.65% |
| A — Native reference | HEVC Main10 1080p30 | AAC | `native-direct` (automatic) | 48.69% | 4.55% | 12.51% | 0.80% |
| B — Hybrid control | HEVC Main10 1080p30 | AAC | `hybrid` (forced) | 74.09% | 16.96% | 16.91% | 0.69% |
| C — Unsupported audio | HEVC Main10 1080p30 | AC-3 | `hybrid` (automatic) | 73.25% | 16.41% | 16.36% | 0.63% |
| B — E-AC-3 pair control | H.264 1080p60 | AAC | `hybrid` (forced) | 86.31% | 20.40% | 23.27% | 0.69% |
| C — E-AC-3 variant | H.264 1080p60 | E-AC-3 | `hybrid` (automatic) | 87.33% | 20.03% | 24.50% | 0.57% |
| B — DTS pair control | H.264 1080p60 | AAC | `hybrid` (forced) | 86.19% | 20.84% | 23.24% | 0.63% |
| C — DTS variant | H.264 1080p60 | DTS core | `hybrid` (automatic) | 86.41% | 20.54% | 23.44% | 0.59% |

## Paired differences and reproducibility

“pp” means absolute percentage points of one core. Relative percentages use the corresponding paired baseline arm as the denominator and are the median of the five per-round ratios (so they need not equal a ratio calculated from the two arm medians). Ranges below are the minimum and maximum of the five within-round differences, not confidence intervals. The exact two-sided sign test is reported as a small-sample direction check.

| Comparison | Paired median | Relative median | Paired range | Positive rounds | Exact sign-test p |
| --- | ---: | ---: | ---: | ---: | ---: |
| H.264 Hybrid AAC − Native AAC | **+30.76 pp** | **+54.74%** | +28.12 to +32.28 pp | 5/5 | 0.0625 |
| H.264 Hybrid AC-3 − Hybrid AAC | −0.96 pp | −1.11% | −1.18 to +2.24 pp | 2/5 | 1.000 |
| HEVC Hybrid AAC − Native AAC | **+24.88 pp** | **+51.90%** | +24.47 to +26.00 pp | 5/5 | 0.0625 |
| HEVC Hybrid AC-3 − Hybrid AAC | −0.86 pp | −1.16% | −1.53 to +2.03 pp | 2/5 | 1.000 |
| H.264 Hybrid E-AC-3 − Hybrid AAC | +1.11 pp | +1.29% | −1.83 to +2.21 pp | 4/5 | 0.375 |
| H.264 Hybrid DTS − Hybrid AAC | +0.09 pp | +0.10% | −1.44 to +2.78 pp | 3/5 | 1.000 |

The Hybrid tax had the same large positive direction in all five H.264 rounds and all five HEVC rounds, with non-overlapping Native and Hybrid whole-CPU ranges. This is strong directional replication, but five pairs yield an exact sign-test p-value of 0.0625; treat it as compelling descriptive evidence rather than a conventional p<0.05 result. AC-3 crossed zero in both matched codec families. E-AC-3 was positive in four of five rounds but also crossed zero. DTS was mixed and used a substantially higher encoded bitrate, so it is only a qualified codec-family check.

## Fixture identity

H.264 A/B/C share the exact same copied 1080p60 High-profile video packets: **1,800 packets**, 3,640,594 bit/s, 29.999 s video duration, identical packet PTS/DTS, sizes, SHA-256 payload hashes, and keyframe indices `[0, 249, 499, 749, 976, 1208, 1458, 1646]`. The combined packet-signature SHA-256 is `cd34a31cc50cb250fd28b3936c73a24f001e6dd79b9f0f750b7a598c31e58c9a`; all comparisons have zero mismatches. Audio is 48 kHz stereo. AAC and AC-3/E-AC-3 payload rates are approximately 193.4 and 192.1 kb/s. Container duration differs by 21 ms from AAC packetization; the video packets and duration are unchanged.

The HEVC sanity set is 1080p30 Main10 at 2,637,811 bit/s, with **900 identical video packets** and zero PTS/DTS/size/hash mismatches; its packet-signature SHA-256 is `85adfa0f496f4b1044498709b77354b2671c9340e2818486ef23a935ff97c544`. AAC and AC-3 are both 48 kHz stereo. The H.264 and HEVC results are each compared only within their own matched set; their frame rates and encode settings differ.

The optional E-AC-3 and DTS variants reuse the same H.264 packet sequence and differ only in audio packets. E-AC-3 is also about 192.1 kb/s. The available experimental FFmpeg DTS encoder required 768 kb/s (measured 768.2 kb/s), versus about 193.4 kb/s for its AAC control; this increases audio packet/demux work and prevents a codec-only interpretation of the DTS result. All audio arms are two-channel output from the same 48 kHz source audio with the same stereo conversion settings.

The 30-second H.264 source is Big Buck Bunny: moving, full-resolution encoded video, but animated rather than live-action footage. HEVC Main10 is an x265 30 fps encode of the same source. This is a useful motion-bearing sanity set, not a broad content sample.

## Measurement and cost attribution

- Host: Apple M1, macOS, headed Chrome `153.0.8010.53`. Each arm used a fresh Chrome launch, 4 s warmup, and a roughly 20 s window. The three-arm campaigns used five rotated orders; E-AC-3 and DTS each used five alternating B/C orders.
- Accepted windows: H.264 15/15, HEVC 15/15, E-AC-3 10/10, DTS 10/10. The first/middle/last Chrome process set remained stable in every accepted window; no browser errors were recorded. Native and Hybrid routes passed the route/cadence gates. Hybrid windows had zero AudioWorklet underruns.
- In the H.264 B−A paired comparison, median process-role changes were Browser **+7.43 pp**, Renderer **+14.51 pp**, GPU **+9.08 pp**, and Audio service **−0.21 pp**. These buckets locate the additional Chrome work but do not assign it to a specific decoder, canvas call, or audio function. Renderer CPU includes mpv audio/demux work, PCM handling, AudioWorklet, scheduling, and other renderer work; GPU CPU includes Chrome GPU/compositor and any decoder work placed there.
- Hybrid H.264 windows processed roughly 1,200 WebCodecs submissions, decoded outputs, and retained draws per 20 s. Packet bridge activity was about 10.86 MB/window, with shared packet inputs and zero shared-packet fallbacks. `decoderCopyMs` was zero. Retained queues peaked at four frames and pending queues at one. Native windows advanced about 1,200 frames with zero HTML video drops. mpv's per-window `frame-drop-count` increment was 0–1 on H.264 Hybrid; `decoder-frame-drop-count` stayed zero, and the retained presenter reported zero missing-frame events. Output-count minus draw-count is not treated as a drop count because the counters are sampled at window boundaries.
- The worklet consumed about 960,768–961,024 stereo frames per window, equivalent to roughly 7.69 MB of float32 stereo samples (`frames × 8`); this is a traffic estimate, not measured copy time. H.264 mpv `avsync` stayed about 2–13 ms. Worklet-consumption versus media-position drift had a median near −1 ms, with ranges of −18 to 0 ms (AAC) and −12.7 to +4.3 ms (AC-3). No underruns occurred.
- mpv reported the selected 48 kHz stereo audio codec (AAC/AC-3/E-AC-3/DTS) and selected tracks. Its audio parameter/output parameter and filter-graph properties were absent, as were internal demux, audio decode, and filter CPU timers. The AudioWorklet has no independent CPU timer. Presentation draw/select/receive timing is also unavailable; zero placeholders in the old raw harness fields do **not** mean zero presentation cost. WebCodecs was active with `hardwareAcceleration: no-preference`; actual hardware-versus-software decoder selection was not observable.

The largest visible increase is spread across the renderer, GPU, and browser process roles, not the Audio service. The AC-3 swap does not increase the Audio service bucket. Because audio decode and worklet execution are inside the renderer bucket, these data cannot claim that total audio CPU is zero; the matched AAC/AC-3 whole-Chrome difference is the controlled test of the incremental codec penalty.

## README interpretation and route decision

The README dual-audio row reports 41.7% for its Native-video column and 46.2% for Auto, with the note that Auto uses Native Direct on AAC and switches to Hybrid on AC-3 ([README row](../../README.md#L240)). That small cross-row gap does not hold route, selected audio, and campaign conditions fixed. Other H.264 AC-3/E-AC-3/DTS rows use different fixtures and 5.1-to-stereo layouts. The old values therefore cannot attribute the difference to software audio.

The matched result says the Hybrid stack itself is substantially more expensive than the browser-native path even with AAC; AC-3 adds no reproducible increment. The previous small README gap is mainly a fixture/campaign/route attribution mismatch, while the Hybrid tax is real and larger than that row suggests.

This does **not** justify a production selective native-video + software-audio route yet. The large A→B difference makes the Hybrid stack a worthwhile target for a separate test-only comparison, but A→B also changes AAC decoding/output architecture, and this campaign never measured native video paired with mpv software audio. The AC-3 result alone gives no CPU case for a selective-audio path.

## Evidence

- [H.264 three-arm raw results](20260924-three-arm-qualified/h264-1080p60-result.json), [arm summaries](20260924-three-arm-qualified/h264-1080p60-analysis.json), [full video packet manifest](20260924-three-arm-qualified/fixtures/h264-1080p60-packet-manifest.json), [fixture manifest](20260924-three-arm-qualified/fixtures/fixtures.json), [AAC fixture](20260924-three-arm-qualified/fixtures/h264-1080p60-aac.mkv), and [AC-3 fixture](20260924-three-arm-qualified/fixtures/h264-1080p60-ac3.mkv).
- [HEVC Main10 raw results](20260924-hevc-qualified/hevc-main10-1080p30-result.json), [arm summaries](20260924-hevc-qualified/hevc-main10-1080p30-analysis.json), [full video packet manifest](20260924-hevc-qualified/fixtures/hevc-main10-1080p30-packet-manifest.json), [fixture manifest](20260924-hevc-qualified/fixtures/fixtures.json), [AAC fixture](20260924-hevc-qualified/fixtures/hevc-main10-1080p30-aac.mkv), and [AC-3 fixture](20260924-hevc-qualified/fixtures/hevc-main10-1080p30-ac3.mkv).
- [E-AC-3 paired results](20260924-eac3-qualified/h264-1080p60-eac3-paired-result.json), [paired analysis](20260924-eac3-qualified/h264-1080p60-eac3-paired-analysis.json), and [E-AC-3 fixture](20260924-codec-variants/fixtures/h264-1080p60-eac3.mkv).
- [DTS paired results](20260924-dts-qualified/h264-1080p60-dts-paired-result.json) and [paired analysis](20260924-dts-qualified/h264-1080p60-dts-paired-analysis.json); [optional variant packet manifest](20260924-codec-variants/h264-1080p60-packet-manifest.json), [four-arm fixture manifest](20260924-codec-variants/fixtures.json), [AAC control fixture](20260924-codec-variants/fixtures/h264-1080p60-aac.mkv), [AC-3 fixture](20260924-codec-variants/fixtures/h264-1080p60-ac3.mkv), [E-AC-3 fixture](20260924-codec-variants/fixtures/h264-1080p60-eac3.mkv), and [DTS fixture](20260924-codec-variants/fixtures/h264-1080p60-dts.mkv).
- Research runners: [fixture preparation](../../experiments/unsupported-audio-cpu/prepare.mjs), [fresh-Chrome measurement](../../experiments/unsupported-audio-cpu/run.mjs), [three-arm analysis](../../experiments/unsupported-audio-cpu/analyze.mjs), and [paired variant analysis](../../experiments/unsupported-audio-cpu/analyze-paired.mjs).

The runtime snapshot copied the checked-out `web/` files at measurement time and records their hashes; the checkout already had unrelated dirty changes. No production files were edited for this investigation. Earlier failed/preflight attempts remain in their dated directories and were excluded from the accepted results above.

**HYBRID ARCHITECTURE IS THE MAIN COST**
