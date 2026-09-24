<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Software decode-quality policy: focused qualification

`decodeQuality` defaults to `exact`; `adaptiveFrameDrop` defaults to `false`.
The public options express intent. `resolveDecodePolicy` selects only the
controls below and merges them with `max_pixels` in `vd-lavc-o`. All modes keep
the existing two decoder threads pending broader codec-specific evidence.

| Codec | Exact | Balanced | Performance | Emergency | Whole-player CPU | Quality/cadence effect | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| H.264 | Normal | `skip_loop_filter=noref` | Same | `skip_frame=noref` after pressure | 16.4 / 69.0 / 68.8% exact/balanced/performance in one short run; no attributable saving | 34–35 frames per 1.5 s; reference seek capture identical | Opt-in reconstruction admitted; CPU benefit unproven |
| HEVC | Normal | `skip_loop_filter=noref` | Same | `skip_frame=noref` after pressure | 15.1 / 33.1 / 71.7%; no attributable saving | 34–35 frames per 1.5 s; reference seek capture identical | Opt-in reconstruction admitted; CPU benefit unproven |
| AV1/libdav1d with grain | Normal grain | Exact | `filmgrain=0` | None | 14.2 / 22.8 / 19.4%; no attributable saving | 34 frames per 1.5 s; grain-omitted seek image 51.36 dB PSNR vs exact | Performance grain omission admitted only for current libdav1d build |
| MPEG-4 Part 2 | Normal | Exact | Exact | Withheld | 24.0 / 28.4 / 26.0%; no shortcut saving expected | 34–35 frames per 1.5 s; identical seek capture | Lowres and emergency skipping withheld |
| MPEG-2 | Normal | Exact | Exact | `skip_frame=noref` after pressure | 15.8 / 8.4 / 9.7%; browser-process variation prevents a saving claim | 34 frames per 1.5 s; identical seek capture | Lowres withheld; emergency seek sample passed |
| MPEG-1 | Normal | Exact | Exact | Withheld | Not measured in quality run | Emergency seek landed beyond sampled retained picture | Emergency skipping withheld |
| MJPEG | Normal | Exact | Exact | None | 9.1 / 9.4 / 13.2%; no shortcut saving expected | 34 frames per 1.5 s; identical seek capture | Lowres withheld |

CPU is summed Chrome process CPU time divided by wall time, where 100% is one
core. These are single, short headless windows on 320×180 fixtures, and the
browser process alone varied by more than 50 core points between adjacent arms.
They establish **no measured whole-player improvement** for balanced or
performance. Renderer plus GPU CPU was much steadier, but is not whole-player
CPU. The [raw browser result](../results/decode-policy/2026-09-24T01-05-25.313Z/result.json)
retains per-process samples, policy diagnostics, decoded dimensions and cadence.
All 18 arms used the production YUV presenter, passed forward/backward seek,
1.5× playback, EOF and worker cleanup. The selected paused frame matched exact
pixel for pixel except for intentional AV1 grain omission. A single seek frame
does not prove that every retained reference remains identical.

The grain fixture is generated with SVT-AV1 film-grain synthesis enabled; its
encoder log reports grain level 8. This verifies that libdav1d's private
`filmgrain=0` option changes browser output in the current build. The control
must be requalified if Demuxe changes its selected AV1 decoder.

mpv marks `vd-lavc-o` changes with `UPDATE_VD`: it destroys and recreates the
video decoder and queues an exact seek. The adaptive controller samples every
two seconds, requires three pressure samples to degrade and five recovery
samples to step back, and imposes a ten-second cooldown after a decoder restart.
Diagnostics report the requested and effective quality, codec, shortcuts,
thread count, adaptive state and transition reason. Frame dropping is temporal
degradation and is never part of balanced or performance without the separate
adaptive opt-in.

A separate [4K HEVC stress run](../results/decode-policy/adaptive-2026-09-24T01-12-13.680Z/result.json)
used the frozen 36-second Main 10 fixture from the real-resolution campaign.
An internal mpv command set 4× speed, beyond the public 2× rate limit, to force
pressure. The controller entered reduced reconstruction at about 8 s and
non-reference dropping at about 16 s. Before dropping, A/V offset rose above
3 s and mpv recorded hundreds of presentation drops; after dropping began,
the repeated fixture advanced close to 4× and A/V offset fell near zero. At
the same 4× stress rate, a normal-state 0–6 s Chrome window used 265% of one
core, while a drop-state 18–24 s window used 229%. Those windows have different
source positions and browser-process activity, so the **14% difference is
descriptive, not a matched saving**. On return to 1×, the controller stepped
back to reduced reconstruction and then normal, with no decoder failure and
worker cleanup. This is a working emergency and recovery proof for a forced
overload; it does not establish that ordinary 1× or 2× playback needs or
benefits from the emergency mode. A 2× 4K control stayed realtime with zero
decoder drops and correctly remained normal.

The focused [B-picture screen](../results/decode-policy/retained-2026-09-24T01-18-59.397Z/result.json)
compared exact and `skip_frame=noref` on H.264, HEVC, MPEG-2 and MPEG-4.
In 1.3 s windows, exact submitted 30 frames; emergency submitted 18, 15,
9 and 9, respectively, while position advanced about 1.25–1.29 s. Sampled
retained P pictures for H.264, HEVC and MPEG-2 matched exact pixel for pixel.
MPEG-4's emergency seek timed out once and passed on a repeat; the
[MPEG-1 trial](../results/decode-policy/retained-2026-09-24T01-21-24.596Z/result.json)
resolved an emergency seek to 0.75 s rather than the requested 0.667 s.
Those two codecs remain excluded from adaptive admission. These spot checks
are narrower than an all-reference, long-GOP frame-hash proof.

The prior [lowres investigation](../experiments/decoder-lowres/REPORT.md)
found quality loss and unstable whole-player CPU attribution even at lowres=1.
MPEG-4 reversed its apparent CPU effect across scenes; MPEG-2 had opposite-sign
rounds; lowres=2/3 had unacceptable detail loss or left the YUV path. WMV2's
bad/cropped output remains unresolved. Thus no lowres setting is in a public
mode. The other screened controls—`skip_frame=bidir`, blanket modern-codec
`skip_loop_filter=all`, `skip_idct=all`, `flags2=+fast`, weakened error detection,
disabled concealment, relaxed compliance and private H.264 recovery flags—are
excluded in the policy source and tests.

A [reversed-order 1/2/4-thread screen](../results/decode-policy/threads-2026-09-24T01-15-15.264Z/result.json)
used fresh Chrome processes on the 4K HEVC Main 10 fixture. Every arm advanced
about 5 s in a 5 s window, presented 120 frames and reported zero decoder
drops. Whole-Chrome CPU for 1/2/4 threads was 135.1/139.2/139.9% in round A
and 145.4/136.2/139.2% in reverse round B. One thread was lower in A and
higher in B; four threads never showed a clear benefit. The Software presenter
used RGB fallback for this 10-bit source, as expected. These two short rounds
do not justify changing the existing two-thread default or assigning a
per-codec default from this one fixture.

## Matched lossy CPU follow-up

Three fresh, rotated rounds per profile used a separate Chrome process for
each arm, a 15-second whole-Chrome CPU window after at least 80 submitted
frames, and `adaptiveFrameDrop: false`. Every arm passed the timeline, cadence,
zero decoder-drop, forward/backward seek and cleanup gates. CPU is a percentage
of one core. The raw records include source hashes, process CPU, decoded
dimensions, active policy, presenter and individual windows:
[H.264 1080p60](../results/decode-policy/cpu-2026-09-24T01-48-46.056Z/result.json),
[HEVC Main 10 4K24](../results/decode-policy/cpu-2026-09-24T01-41-30.636Z/result.json),
and [AV1 with grain](../results/decode-policy/cpu-2026-09-24T01-55-58.241Z/result.json).
The AV1 asset is a 36-second stream-copy loop of the screened 320×180 grain
fixture, so its CPU numbers do not represent high-resolution AV1.

| Fixture / presenter | Exact median (range) | Balanced median (range) | Performance median (range) | Effect |
| --- | ---: | ---: | ---: | --- |
| H.264 1080p60 / YUV | 74.5% (72.8–76.0) | 73.7% (68.6–78.9) | 67.7% (67.4–74.1) | Balanced and performance use the same `skip_loop_filter=noref` setting; their measured difference is run variation. |
| HEVC Main 10 4K24 / RGB | 128.9% (128.8–134.0) | 132.2% (127.6–134.4) | 130.8% (129.4–132.7) | No measured saving. |
| AV1 grain 320×180 / YUV | 45.1% (42.6–46.4) | Not measured; exact policy | 45.8% (45.7–47.2) | Grain removal changes the image; no measured CPU saving. |

Renderer plus GPU process medians for exact/balanced/performance were
46.9/43.4/42.0% for H.264 and 102.8/101.0/101.0% for HEVC; AV1
exact/performance were 22.1/19.8%. Browser-process medians were
28.3/31.4/25.0%, 28.7/30.6/28.7%, and 22.6/26.7%, respectively. These
subtotals are diagnostics; whole-Chrome CPU above is the comparison metric.

The H.264 performance median is 6.8 points below exact, but performance and
balanced resolve to identical FFmpeg options. That difference cannot be
attributed to a stronger shortcut, and these short windows do not establish
a reliable whole-player gain. HEVC and AV1 showed no saving. These results
belong to this matched follow-up and must not be compared numerically with
the older real-resolution or small-fixture campaigns.

## Adaptive regression follow-up

A [4K HEVC stress and half-speed recovery run](../results/decode-policy/adaptive-2026-09-24T01-39-32.634Z/result.json)
entered reduced reconstruction around 7 seconds and non-reference dropping
around 16 seconds under an internal 4× overload. After switching to the public
0.5× rate at 22 seconds, it returned to reduced reconstruction around 34
seconds and normal around 52 seconds, with cleanup and no decoder error.
The [120 fps display-only control](../results/decode-policy/display-drops-2026-09-24T02-06-10.241Z/result.json)
used a small H.264 + AAC fixture at the public 2× rate. It advanced 23.9 media
seconds in 12 wall seconds and recorded 979 presentation drops, zero decoder
drops, at most 0.008 seconds of A/V drift, and no emergency transition. The controller now compares
progress with requested playback speed and requires decoder drops or A/V drift
before treating presentation drops as overload.
In a separate [forced inspection-failure run](../results/decode-policy/adaptive-2026-09-24T02-03-40.150Z/result.json),
the source probe import was blocked and the player recorded no inspection
result. mpv still identified HEVC at runtime; the controller entered both
degraded states under overload and recovered to normal at 0.5×. This covers
the previously stale unknown-codec fallback input.

Remaining qualification: matched longer whole-player CPU windows, thread
trials on other codecs, non-reference and retained-reference frame comparison across long GOPs,
alternate pixel formats, and ordinary-rate overload reproduction. No codec
without a qualified shortcut receives a synthetic “fast” flag.
Custom approximate-decoder research would only be justified after these existing
controls fail a representative expensive Software case with stable CPU and
fidelity evidence.
