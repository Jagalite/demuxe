<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Auto routing with independent browser video

## Routing model

Auto still tries native A/V before component splits. A failed Native Direct or
Native Remux plan is cached by source, settings and plan, then discovery retries
the remaining native plans before Hybrid. The native split plans present
video in an HTML media element through a **video-only MSE packet-copy remux**;
mpv decodes selected audio to the requested stereo PCM worklet. When embedded
subtitles are selected, the combined plan also starts the existing isolated
mpv subtitle service. Hybrid and Software remain later fallbacks.

The split admission no longer uses an audio codec list, source channel count,
Matroska-only rule, fixed video codec/profile or 1080p ceiling. The subtitle
service admission no longer uses a subtitle codec/container list. This is not
an assertion that those formats work: the actual remux, browser video frames,
decoded PCM, subtitle output and lifecycle must pass at runtime. Existing
packet-construction checks for **full A/V Remux** remain separate.

## Qualification and failure boundaries

| Evidence | Decision |
| --- | --- |
| Inspected finite local source with selected video and audio | May attempt video-only MSE plus mpv audio. Remote split ownership remains unimplemented. |
| Browser video-only MSE query | Query only selected video. Incomplete evidence stays unknown; only an adapter-qualified decisive negative excludes the trial. MSE construction and presented frames decide the outcome. |
| Requested stereo output, MSE, Web Audio, cross-origin isolation | Required by the current PCM worklet. Source multichannel audio may be downmixed by mpv. Explicit 5.1/7.1 output, video filters and tone mapping retain their existing fallback behavior. |
| mpv audio service assets | Checked lazily when discovery reaches a split plan; common native A/V startup does not fetch them. Missing assets retain fallback. |
| Selected embedded subtitles | The combined plan requires the existing service assets, source stream identity and a rendered sample in its bounded verification window. Other subtitle structures can be tried without a codec-name allowlist; failed output falls back. |
| Plain external WebVTT/browser text track | Can stay with the audio-only split and is verified by the existing browser cue path. Rich external subtitles combined with split audio remain unqualified. |
| Runtime service or seek failure | Diagnosed compatibility failure retires that exact plan, retries remaining native plans, then reaches Hybrid/Software. Source/permission/transport errors remain terminal. |

The browser owns video decode and presentation in both split plans. The
video-only remux and mpv service still load WASM and consume CPU. This change
does not imply fewer FFmpeg packets, less total CPU or hardware decoding.

## Focused correctness

The [production-route regression](../tests/native-video-component-routing.mjs)
used local catalogue fixtures in headless Chrome 153 on macOS. All **12/12**
scenarios passed their expected route, playback, seeks, rate, pause and worker
cleanup gates; all reported zero workers after destruction. Split-audio cases
also required consumed PCM frames, nonzero RMS, zero pre-EOF underruns and no
selected mpv video track. [Per-phase evidence](../results/native-video-component-routing/correctness.json).

| Fixture/request | Observed route and boundary |
| --- | --- |
| H.264 + AC-3 5.1, E-AC-3 5.1 or DTS 5.1 → stereo | `native-video-mpv-audio`; browser frames and mpv PCM survived forward/backward seek and rate change. |
| H.264 + PCM16 stereo or PCM24 5.1 | `native-direct` with browser decoded-audio evidence on this Chrome. With explicit `nativeRemux: always`, both passed the mpv-audio split. |
| HEVC Main10 + E-AC-3 | Initially split native; a forward seek hit `Selected timeline discontinuity` in video-only FFmpeg remux, so Auto correctly moved to Hybrid. Native video is not qualified for this fixture's full lifecycle. |
| H.264 + AC-3 + ASS or PGS | `native-video-mpv-audio-subtitles`; selected subtitle output, mpv subtitle A/V chain count zero, audio/video lifecycle and cleanup passed on authored fixtures. |
| H.264 + AC-3 + plain external WebVTT | Audio split retained browser cues and browser video. |
| H.264 + AC-3 5.1, requested 5.1 output | Hybrid, because the selective PCM service currently produces stereo. |

The [failure-injection regression](../tests/selective-production-fallback.mjs)
checked absent assets, video preparation failure, audio module load failure,
audio service failure, lost audio timeline, and ASS/PGS subtitle service
failure. Each tested failure reached Hybrid with the failed native plan
cached. These tests check decoded-sample activity and selected subtitle output.

A separate [six-channel marker test](../tests/native-video-downmix.mjs) compared
the stereo PCM rings produced by the native split and existing Hybrid on the
same authored AC-3 5.1 source. Left/right, center and side channel frequency
markers appeared in the expected stereo channels. The largest relative
amplitude difference across the ten nonzero channel/band comparisons was
**0.079%**; both paths excluded the LFE marker from stereo. This establishes
agreement with Demuxe's existing mpv downmix for this signal, not acoustic
fidelity for arbitrary sources. [Raw spectral results and fixture hash](../results/native-video-component-routing/downmix.json).
Arbitrary subtitle styling/palette correctness remains unqualified.

The [browser smoke matrix](../results/native-video-component-routing/browser-matrix.json)
opened and played AC-3 5.1 and AC-3+ASS in Chrome 153, Firefox and WebKit on
this macOS host. All six trials selected the corresponding native split,
presented browser video frames, consumed nonzero mpv PCM and reported no
page/player errors; each subtitle trial reported zero mpv A/V chains. Firefox
and WebKit were smoke checks only: seeks, rate changes, EOF, fidelity and CPU
were not qualified there.

## Matched CPU comparison

The [CPU harness](../tests/native-video-component-cpu.mjs) compared Auto's
native split against **forced Hybrid**, not against historical Auto runs.
One headed Chrome was reused per fixture across four fresh-context arms in
Hybrid/Native/Native/Hybrid order. Each arm had 3 seconds of warmup and an
8-second process-family CPU window. All 16 windows passed route, timeline,
focus, error and stable-process-membership gates. The host was shared, the
fixtures were short/low-resolution except the authored AC-3+ASS case, and
OS media services are outside the Chrome process totals. [Raw process samples,
fixture hashes and startup timing](../results/native-video-component-routing/cpu-2026-09-26T03-46-05.363Z/result.json).

| Fixture | Hybrid CPU, % of one core | Native split CPU | Paired Native − Hybrid |
| --- | --- | --- | --- |
| H.264 + AC-3 5.1 | 39.6, 39.7 | 44.3, 63.5 | +4.7, +23.8 points |
| H.264 + E-AC-3 5.1 | 36.1, 53.0 | 45.2, 78.2 | +9.1, +25.3 points |
| H.264 + DTS 5.1 | 42.9, 74.7 | 75.3, 61.3 | +32.4, −13.4 points |
| H.264 + AC-3 + ASS | 65.6, 87.6 | 77.0, 73.9 | +11.4, −13.7 points |

There is **no demonstrated CPU reduction** from this routing change. AC-3
and E-AC-3 cost more Chrome CPU in both small-fixture pairs; DTS and ASS
reverse sign between pairs. The selected Native trials took roughly 10–12
seconds from open through progression, versus 0.6–1.3 seconds for forced
Hybrid. Native trials included the existing original A/V output test before
selecting the split. Forced Hybrid skips that test, so these startup figures
are not a before/after Auto latency comparison. The CPU run preceded the
final resource-budget and typed subtitle-failure guards; neither executes
in a successful steady window.

## Remaining boundaries

- Remote source identity, permissions and synchronized dual readers are not
  implemented for the split; such sources retain existing routes.
- Explicit multichannel output, unqualified audio filters and rich external
  subtitle composition require further output-contract work. A multichannel
  **source** requested as stereo does not trigger those exclusions.
- Video-only MSE packaging can fail even when the browser could decode the
  codec, as the HEVC/E-AC-3 seek discontinuity demonstrates. Browser-native
  video is retained only while the selected transport and lifecycle work.
- Browser differences must be established by browser evidence and runtime
  output. No codec-name or browser-name support mapping was added.
- The extra remux, audio and subtitle services can increase CPU and memory.
  The combined plan's background resource reservation now accounts for all
  three WASM services conservatively.

The next optimization target is the **original A/V audio-output trial**:
its bounded timeout can delay an otherwise viable split. Any shorter negative
test needs selected-audio start-time evidence and cross-browser verification;
static codec queries alone must not declare missing output.
