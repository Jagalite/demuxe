# H.264 + PCM24 / MKV routing investigation

**Finding: routing/qualification problem for this bounded fixture.** Native direct and existing FLAC clear the 10-core-point saving threshold with lossless audio and lifecycle checks; the separate-mpv-audio variant does not. Production source and routing unchanged.

The original 27.5% Hybrid versus 9.6% plain-browser numbers motivated this investigation; they are not mixed with the new campaign. The exact fixture is `build/head-to-head/assets-release-supplement-20260925-04/fixtures/pcm.mkv`: 36 seconds, 320×180 H.264 High at 30 fps, stereo 48 kHz signed PCM24. See `provenance.json` for its SHA-256, ffprobe output, host and git revision. Presentation is 960×540 in headed Chrome 153.0.8010.53.

## Measured results

All 18 windows accepted; three rounds per arm. Values are median percent of one CPU core. Role medians are calculated independently. Whole Chrome includes browser and other utility processes as well as the displayed roles.

| Arm | Whole Chrome | Renderer | GPU | Audio service | Whole range | Saving vs Hybrid |
|---|---:|---:|---:|---:|---:|---:|
| hybrid | 37.43 | 22.61 | 13.63 | 0.79 | 36.30–37.52 | 0.00 |
| selective | 29.96 | 19.08 | 9.44 | 0.76 | 29.63–30.29 | 7.47 |
| flac | 18.06 | 7.78 | 9.12 | 0.51 | 12.73–18.85 | 19.37 |
| direct | 10.47 | 4.57 | 5.18 | 0.46 | 8.24–11.96 | 26.96 |
| hybrid-no-draw | 17.10 | 15.98 | 0.11 | 0.78 | 17.00–17.27 | 20.33 |
| hybrid-no-audio | 32.91 | 18.63 | 13.25 | 0.77 | 31.14–33.30 | 4.52 |

Hybrid → direct saves **26.96 core points**; Hybrid → existing FLAC saves **19.37**. Both exceed 10 points in every corresponding round. This is a **routing/qualification problem for this bounded fixture**, with native-direct MKV the cheapest correct measured route. The selective PCM experiment saves **7.47 points**, so **it does not meet the requested 10-point threshold**. Video can stay browser-owned, but retaining a separate mpv audio service does not capture most of the available saving here.

Suppressing Hybrid drawing removes **20.33 points**; disabling its selected audio removes **4.52 points**. The drawing delta includes renderer/GPU presentation work while retained-frame scheduling and decode remain active. The audio-off control retains the silent output service. Thus the dominant measured removable cost is presentation, not PCM decoding alone.

Selective CPU-window sync: absolute error p50 **5.07 ms**, p95 **6.49 ms**, maximum **7.11 ms**; **zero pre-EOF underruns**, zero mpv video tracks. Hybrid and no-draw windows also have zero measured underrun increments. Audio-off publishes zero media frames.

The fresh Hybrid median differs from the historical 27.5% number; no causal delta is calculated across those campaigns. Native/FLAC variance is retained in the table rather than hidden. Whole-Chrome CPU excludes the fixture server, OS WindowServer/CoreAudio/media services and GPU energy.

## Why Auto rejects cheaper routes

| Route | Exact current rejection | Meaning |
|---|---|---|
| Native direct | `Selected audio has no browser capability mapping; preparation or decoded audio is required` | `browser-media-capability.ts` maps PCM only for WAV; MKV PCM24 remains unqueried. H.264's positive hint is not treated as proof of audio. Plain `<video>` actually plays this file with decoded PCM output. |
| Native remux | `Demuxe has no packet-copy audio construction contract for pcm_s24le` | PCM is absent from `remuxRejection`'s supported audio construction contracts. Chrome also returns false for MSE `ipcm`. |
| Native FLAC | `Audio adaptation requires explicit profile or qualified automatic lossless policy` | The existing lossless route is opt-in through `automaticAudioAdaptation: 'lossless'`. It works without widening the selective checks. |
| Native video + mpv audio | `Selected AC-3 or DTS must be 48 kHz stereo` | Both selective admission and selective-asset discovery restrict audio to AC-3/DTS. Changing admission alone produces the misleading next rejection `Selective audio engine or worklet assets are unavailable`, because discovery never ran. |

Relevant production locations: `src/unified-player.ts:497`, `:784`, `:528`; `src/internal/selection.ts:55`; `src/internal/browser-media-capability.ts:16`; `src/internal/playback-plans.ts`; `src/unified-player.ts:187`.

## Small experiment and correctness

The isolated built-runtime copy adds `pcm_s24le` in the two AC-3/DTS checks. All existing source/container/resolution/stereo/rate/track-bound/subtitle checks remain. No new clock or audio transport: it reuses `NativeMpvAudio`, its timestamped PCM ring, browser presentation clock, output timestamp estimates, epoch handling and rate-boundary synchronization.

Selective playback is actually `native-video-mpv-audio`, using `VideoToolboxVideoDecoder` in the browser. mpv reports zero selected video tracks, no video decoder worker and zero video render calls. Plain direct playback uses Chrome's FFmpeg video/audio decoders; FLAC uses browser video and FLAC decoding.

Lifecycle checks cover 0.5×, 1×, 1.5× and 2× observed timeline slopes; pause stability; paused seek; resume; seeks to 24, 4 and 18 seconds; EOF; replay; and zero remaining page workers after destroy. Selective passed with zero pre-EOF underruns. Reported sync at playing lifecycle checkpoints was within about 7 ms. These are output-clock estimates, not external audiovisual measurements.

Normal-speed digital audio captures matched all 96,000 channel samples exactly for selective PCM, native direct MKV, existing FLAC adaptation and offline packet-copy PCM MP4. The selective comparison included 95,637 samples with nonzero low eight bits of the 24-bit signal. No resampling, downmix or lossy encoding is needed. These checks are before the device mixer and do not assert bit-identical physical output or bit identity during time stretching. Raw captures and alignment/comparison results are retained.

Offline native PCM MP4 plays and preserves samples, but Chrome's MSE `ipcm` query is false. This does not qualify Demuxe's bounded MSE remux implementation for PCM. Direct MKV is already the simpler browser-only route for this exact file.

The first short FLAC rate sample measured 0.871× after returning to 1×, outside the 0.12 tolerance. That failed run is retained. A repeat with 3-second rate intervals passed the same tolerance and all lifecycle gates. Longer sampling reduces published-state cadence sensitivity; the initial failure is not deleted or treated as a pass.

## Measurement protocol

Three counterbalanced rounds: Hybrid, selective PCM, FLAC, direct browser, Hybrid no-draw and Hybrid audio-off. Same source, viewport, Chrome lifetime and harness. Existing benchmark helper observes completion of Chrome's macOS hardware-key startup task, stops tracing, measures a 20-second idle baseline, then uses fresh contexts, 2-second inter-arm idle, 5-second warmup and 20-second windows. CPU is accumulated Chrome process CPU divided by elapsed time: 100% is one fully occupied core. Browser, renderer, GPU and audio-service roles are retained separately. Process turnover, focus loss, route mismatch or stalled timelines reject a window. Idle is never subtracted.

No-draw keeps decode/frame handling and suppresses `drawRetainedVideo`; audio-off keeps Hybrid presentation but disables the selected audio track. These are attribution controls, not correct playback candidates. Component deltas can interact and are not an additive cost decomposition. Audio-off leaves the AudioContext/worklet alive, so its delta estimates active PCM handling, not the entire audio subsystem. Native direct/FLAC do not expose worklet-style underrun counters; those are unavailable, not measured zero.

## Limits

This is a bounded local-file, stereo, normal-output, one-browser study. It does not qualify long-form drift, remote/authenticated sources, alternate tracks, other rates/layouts, subtitles, other browsers, HDR or physical output. Video packets remain copied on selective/FLAC routes; visual/color fidelity was not independently requalified. CDP reports BT.709 on prepared video versus SMPTE170M for direct MKV, so metadata/color equivalence needs separate checking before broad qualification.

## Smallest subsequent production change (proposal only)

For the cheapest route, qualify a narrowly bounded native-direct PCM24/MKV trial and exempt that qualified case from the blanket `unqueriedAudio` rejection at `src/unified-player.ts:528`. Retain source/track identity checks and actual decoded-audio/video-output verification with the existing fallback behavior. Do not invent a positive MIME mapping from H.264 support alone, or broadly admit all PCM/container/browser combinations. This task proved plain browser playback, not an integrated change to that Auto guard.

For the separate-audio route, the smallest code delta is PCM24 admission in **both** `src/unified-player.ts:497` and `:784`, with a shared codec predicate preferable to two drifting lists, updated rejection text and bounded qualification cases. The clock, ring buffer, worklet and rate/seek architecture require no redesign. Whether that route crosses the requested performance threshold is reported separately from direct/FLAC results.

The existing FLAC route already needs no implementation change when explicitly requested through `automaticAudioAdaptation: 'lossless'`. Making that the default would be a routing-policy change and needs its own qualification. This experiment did not enable it in production.
