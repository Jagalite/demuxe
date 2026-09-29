# HEVC Native split performance attribution — 2026-09-26

The video path is using Chrome's Apple VideoToolbox platform decoder. The largest
measured addition is the mpv audio service: removing it from the same live video
pipeline saves **13.8–14.7 percentage points of whole-Chrome CPU** in this campaign.
This isolates a service, not an individual hot function or an unavoidable codec cost.

## Matched experiment

Frozen runtime/fixtures: `build/head-to-head/assets-native-url-main-20260926-01`,
the same snapshot used for the published Auto retest. Repository HEAD was
`2626906d`. Runtime identity is inherited from rebuilt `448a0dbc` in that snapshot.
[Artifact hashes](identity.json), [raw measurements](run-20260926-02/result.json),
[summary](run-20260926-02/summary.json), and the exact
[measurement harness](run-20260926-02/harness.mjs) are retained.

One fresh headed Chrome, hardware-key startup completion gate, fresh context per
arm, rotating order across three rounds, 20-second idle controls between rounds,
5-second warmup and 20-second measured windows, 960×540 viewport. CPU percentages
are one-core equivalents across Chrome processes; idle is not subtracted.
Idle observations were 1.25%, 1.38%, and 1.60%. No other benchmark process was
running when this investigation started. This is a small same-session attribution
experiment, not a statistical equivalence claim or general media qualification.

| Path | Three CPU windows | Median |
| --- | --- | ---: |
| Production Native video + mpv AC-3 audio | 32.97%, 31.94%, 32.77% | **32.77%** |
| Same production startup/video remux, then mpv audio destroyed | 18.58%, 18.13%, 18.05% | **18.13%** |
| Plain video element, packet-copied video-only MP4 | 15.24%, 15.75%, 15.87% | **15.75%** |
| Production Native video + mpv AC-3 + PGS | 31.32%, 31.75%, 31.67% | **31.67%** |

Within-round audio-removal savings: **14.39, 13.81, 14.72 points**. Remaining
Player/remux-path additions over plain video: **3.34, 2.38, 2.18 points**. The
latter includes Player/controller work and packaging differences, not just time
inside the remuxer. GPU-process CPU remained around 12%; the audio-service
addition was predominantly renderer-process CPU (median approximately 19.05%
with audio versus 5.80% without it).

The PGS configuration did not add a measurable dominant cost here. Its slightly
lower totals do not imply that subtitles save CPU: it uses a different muxed
fixture and startup route, and this was not a subtitle-off/on experiment on the
same file. The old README rows are separate campaigns and were not reranked.

## Correctness and decoder identity

All **12/12 CPU windows** passed: 600 presented frames per 20 seconds, zero dropped
frames, stable process sets, retained routes, foreground/focus, and no player or
page errors. The audio configurations recorded zero pre-EOF underruns. Admission
required at least 29 presented fps and at most 1% dropped frames.

Separate contexts checked the marked image after seek to 3 seconds, stereo
440/880 Hz tones for audible paths, and the PGS drawing. Audio analysers and
screenshots were absent from CPU contexts. CDP Media logging was disabled before
CPU collection. Those checks are bounded output checks, not full subtitle/color
fidelity or full lifecycle qualification.

Chrome reports `kVideoDecoderName=VideoToolboxVideoDecoder` and
`kIsPlatformVideoDecoder=true` for all four paths. This identifies Apple's
platform decoder; it does not expose every lower-level hardware-session detail.
Audio workers report zero selected video tracks and no video decoder worker.
The PGS service reports zero A/V chains. No duplicate software video decode or
Hybrid fallback was observed.

The plain MP4 was produced with FFmpeg packet copy (`-map 0:v:0 -c copy -an -sn
-movflags +faststart`). Its video packet SHA-256 equals both original HEVC
fixtures: `55b348d5f9659ea46455ddd4504d0e167926d17fe46b55d4404429b8b93614b4`.
The displayed frames were checked, but container metadata/packaging is different.
Both original fixtures share this one 320×180 Main10 bitstream; there is no
generalization to other resolutions, encoders, or audio layouts.

## Follow-up sampling and next target

Separate diagnostic runs sampled page/worker JS and Wasm stacks, then macOS native
renderer stacks. These were not timed CPU comparisons and did not use the CPU
startup gate. [JS/Wasm profiles](profile-20260926-02/profiles.json),
[audio-split native sample](profile-20260926-02/split-native.txt),
[video-only native sample](profile-20260926-02/video-remux-native.txt), and
[profiling harness](profile-20260926-02/harness.mjs) are retained. An earlier
JS-only pass is also retained in `profile-20260926-01`.

The split exposes 13 page/worker profiling targets versus 3 after removing audio.
Many mpv pthread samples sit in `emscripten_futex_wait`; these represent elapsed
stack residence and must not be counted as busy CPU. Other sampled work includes
PCM copying (`pumpAudio`), audio presentation-time lookup, and event pumping.
AC-3 decoding did not dominate these sampled stacks. Native Chrome symbols are
largely stripped, and these samples do not establish which function accounts for
the full 14-point addition. AudioWorklet/native scheduling is not fully explained
by the page/worker V8 profiles.

The next optimization investigation should isolate the audio service's decoding,
PCM transfer, worklet output, synchronization, and thread wakeups with one change
at a time. Preserve audio output, timestamps, seek/rate behavior and underrun
checks. The evidence does not justify lossy decoding, dropping frames, or replacing
the browser video decoder. No production code or README CPU cells were changed.

## Retained unsuccessful harness runs

The first attempt cached a video element before Auto replaced its startup
candidate; it timed out while the live element was playing. The initial audio
ablation also attempted to remove the service before Auto had finished selecting
the split route. Those attempts collected no CPU windows and remain in
`run-20260926-01`, `check-20260926-01`, and `check-20260926-02`.
The corrected standalone output check is `check-20260926-03`. The final harness
follows the live element and removes audio only after production playback starts.
