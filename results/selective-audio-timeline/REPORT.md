# Selective native video + mpv audio: synchronization closeout

**Evidence retention:** Linked trial JSON is committed as lossless zstd archives; the [evidence index](../research-evidence-index-20260925.json) records hashes of the original and archived files. Original raw JSON remains local.

## Decision and scope

**SELECTIVE ROUTE SYNC QUALIFIED — READY FOR PRODUCTION INTEGRATION**, within the bounded qualification below. This is an experiment result and an integration starting point, not approval to enable Auto routing. Production routing, production native sources, and production runtime assets were not modified.

Tested on macOS Chrome **153.0.8010.53**, frozen realistic H.264 1080p60 video with AC-3 stereo 48 kHz, plus a bounded DTS check. Browser video uses the existing packet-copy video-only MP4; mpv independently reads the audio source with zero selected video tracks. No WebCodecs video, retained frames, or Hybrid canvas is involved. The DTS check records `VideoToolboxVideoDecoder` and platform decoding through CDP Media properties.

The rate-transition blocker was queued **old-rate PCM**, compounded by treating mpv's property position as an audible clock. Changing browser speed immediately lets it outrun audio that has not yet reached the new rate. The native browser ring and software AO queue can together hold roughly 342 ms at 48 kHz. Shrinking the configured audio buffer alone did not remove the minimum queue.

## Clock model

- `HTMLVideoElement.currentTime`: authoritative browser media timeline, sampled directly. It is not a physical display scanout timestamp.
- Frame callback `mediaTime` / `expectedDisplayTime`: presentation progress and seek convergence evidence; retained separately from `currentTime`.
- mpv `time-pos`: diagnostic property observation only. It is neither the decoded frontier nor audible output time.
- Native PCM metadata: each output sample carries its media PTS and media-rate slope, captured from mpv's audio frame **before** skipping samples. Effective sample rate includes tempo processing.
- Written PCM position: last published sample's PTS plus its media duration. This is the publication frontier, not the audible position.
- Worklet output frame: identifies where a PCM sample enters the AudioContext timeline. Consumed media-frame counts exclude empty output callbacks.
- `getOutputTimestamp()`: maps the AudioContext frame clock to estimated device-output wall time. `baseLatency` and `outputLatency` are recorded diagnostics, not additional offsets applied twice.

`estimatedAudioPresentationTime(at)` selects the most recent same-generation metadata point whose estimated output time has arrived, then computes:

```text
point.mediaTime + (at - point.outputWallTime) * point.mediaRate
```

Points older than 250 ms are rejected. Future rate boundaries are not extrapolated backward into the old-rate interval. Error is **estimated audio presentation time minus browser currentTime**. These estimates do not measure speaker acoustics or physical screen scanout.

Startup, resume, and post-seek publication now wait for the first fresh PCM timestamp and start browser playback when that PCM timeline reaches the browser's paused position. This removes the previous output-latency baseline offset.

## Rate transitions and bounded controller

1. Request the new mpv audio rate while browser video continues at its current rate.
2. Carry the actual new-rate boundary through native PCM, the shared ring, and the worklet.
3. Map that boundary to device-output wall time.
4. Change browser playback rate when the boundary becomes audible.

There is **no rate seek, queue flush, intentional silence, or fixed 340 ms delay**. The effective rate change waits for the existing queue: 368–415 ms in the full AC-3 run, 341–366 ms in DTS. Playback continues during this response latency. Boundary scheduling was 1.3–8.0 ms late in the AC-3 run.

The existing experiment controller checks every 250 ms, enters soft correction after three consecutive errors above 50 ms, releases after three below 30 ms, and bounds the audio-speed trim to ±0.5%. It is disabled during a pending rate transaction. The final full run needed **zero soft corrections and zero drift-triggered seeks**. Consequently sustained-drift recovery and its perceptual quality were not stress-qualified by this run.

Seek, pause, and stop cancel pending rate timers. A rate requested while paused is applied at its audible boundary after resume. Seek-during-rate and pause-during-rate were explicitly exercised. Simultaneous distinct rate requests are not a qualified public API contract; integration must serialize/coalesce them.

## Seek, pause, and EOF

Seek transaction: cancel pending rate → fade out → close PCM publication and advance generation → pause both owners → seek browser and mpv → wait for a new acknowledged native epoch, mpv target confirmation, and a fresh browser frame → permit only the new epoch → establish timestamp-aligned publication. A paused seek remains paused. Old-generation PCM cannot be published through the generation/epoch gate; already submitted device audio cannot be retroactively withdrawn, hence the fade before the transaction boundary.

Passed forward/backward seeks, nearby paused seeks, seek after rate change, and seek during a pending rate change. The full run contains six explicit user seeks; none was a rate or ordinary-playback correction. No stale-epoch rejection or protocol error was recorded.

Pause closes publication after a short fade. The secondary check held an eight-second pause: over the settled 7.75-second interval, browser media time and consumed PCM frame count did not advance. Resume required no hard seek.

EOF has explicit drain state. The final 200 ms browser-frame window marks expected drain; empty worklet callbacks in that window/after end are counted separately from playback underruns. After the final ring samples drain, publication closes, mpv pauses, epoch acknowledgement is checked, and the AudioContext suspends. A native reset/epoch increment is **not** required merely to pause. This fixed the earlier EOF barrier hang. Because the expected-drain window starts before `ended`, its counter should not be interpreted as proof that every final sample was acoustically observed; terminal waveform fidelity remains outside this telemetry check.

Final AC-3 lifecycle: **0 pre-EOF underruns**, 35 expected-drain callbacks, queue empty, context suspended. Independent EOF→seek→resume check: 0 playback underruns, 10 drain callbacks, 3.3 ms estimated resumed error. DTS: 0 playback underruns, 11 drain callbacks, correct suspension.

## Measured synchronization

[Full AC-3 raw run](qualify-1790303496408/result.json.zst), [analysis](qualify-1790303496408/analysis.json.zst). Values are absolute estimated errors in milliseconds; steady distributions exclude the first second of each phase. Samples are correlated observations, not independent trials.

| Phase | p50 | p95 | p99 | Max |
|---|---:|---:|---:|---:|
| 1× | 0.78 | 1.00 | 1.01 | 1.39 |
| 1.5× | 2.39 | 2.53 | 2.57 | 2.58 |
| Return 1× | 4.05 | 4.28 | 4.34 | 4.34 |
| Resume | 6.99 | 7.06 | 7.08 | 7.08 |
| Forward seek | 7.68 | 7.73 | 7.73 | 7.73 |
| Backward seek | 0.38 | 0.43 | 0.44 | 0.44 |
| Resume after paused seeks | 3.57 | 3.68 | 3.69 | 3.69 |
| 1.75× | 4.84 | 5.05 | 5.13 | 5.13 |
| Seek while fast | 11.66 | 11.75 | 11.78 | 11.78 |
| Return 1× after fast seek | 8.99 | 9.22 | 9.24 | 9.24 |
| Near EOF | 2.67 | 2.84 | 2.87 | 2.87 |

| Rate transition | Request→effective boundary | Max error first 500 ms | Audio seeks |
|---|---:|---:|---:|
| 1→1.5 | 415 ms | 2.63 ms | 0 |
| 1.5→1 | 378 ms | 4.38 ms | 0 |
| 1→1.75 | 368 ms | 5.13 ms | 0 |
| 1.75→1 | 370 ms | 9.25 ms | 0 |

All first valid post-transition samples were below 50 ms, observed 0.6–40 ms after the transition. Four user rate changes; zero rate seeks; zero soft-correction duration. Browser dropped-frame counters reached 333 across the lifecycle, concentrated at accelerated 60 fps playback. This run does not establish frame-perfect accelerated presentation on the display.

[Overlap checks](overlap-1790303408543/result.json.zst): seek-during-rate converged to 1.24 ms; pause-during-rate/resume to 3.88 ms; paused-rate/resume to 8.34 ms. The superseded operations returned the expected AbortError.

### Independent PCM pulse reference

To avoid validating only the new metadata model against itself, a diagnostic AC-3 track carries 50 ms pulses at known integer media times. Detected worklet PCM samples are mapped through WebAudio output timestamps and compared with the browser timeline. This also exercises tempo-filter pulse placement, although it still is not acoustic measurement.

- [1.5× run](reset-anchor-1790303905076/result.json.zst): 16/16 expected pulses detected; maximum absolute error approximately **19 ms**.
- [1.75× run](reset-anchor-1790303454065/result.json.zst): 18/18 detected; maximum approximately **13 ms**.

The legacy harness argument `reset-anchor` selects the new coordinated rate method; it does not mean rate changes seek. An explicit startup seek is used to isolate the diagnostic baseline. A prior 10 ms pulse run (`reset-anchor-1790303291579`) missed a pulse and its ordinal matching then shifted by a second. It is retained as incomplete detection evidence, not counted as a passing skew measurement. Wider pulses address that reference-signal limitation.

### DTS secondary check

[Raw run](dts-1790303578168/result.json.zst): steady 1× p95 28.18 ms, 1.75× p95 27.57 ms, return 1× p95 24.56 ms. Resume after eight seconds paused had maximum 0.17 ms; final seek maximum 5.46 ms. Two rate transitions, no rate seeks, one explicit user seek, zero playback underruns, no errors, native VideoToolbox browser decoder confirmed. The bounded DTS result passes the 50 ms target without silently broadening thresholds.

## CPU regression screen

[Raw runs](cpu-1790303633183/result.json.zst), [summary](cpu-1790303633183/analysis.json.zst). Fresh Chrome, four-second warmup, 20-second windows, order prior/new/new/prior. CPU is core percentage points, with 100% representing one fully occupied core.

| Selective implementation | Whole Chrome | Browser | Renderer | GPU | Audio service |
|---|---:|---:|---:|---:|---:|
| Prior sync PoC | 63.16 | 32.00 | 16.38 | 14.03 | 0.70 |
| Timestamped PCM | 63.76 | 33.57 | 15.85 | 13.73 | 0.56 |

Mean whole-Chrome difference **+0.60 points**; paired differences +1.57 and −0.38. Outside the browser process the mean difference was −0.97 points. No material regression appeared, but two pairs are a screen, not statistical proof. The new private native rebuild and metadata changes are measured together. The earlier ~22.5-point saving versus Hybrid was not re-measured or combined with these absolute totals.

## Implementation and reproducibility

Sources: [experiment directory](../../experiments/selective-audio-timeline/). `build.py` generates private copies of mpv audio buffer/native AO sources, compiles a private archive, and links a private engine. `prepare.mjs` patches only cloned browser assets. Added metadata storage is approximately 384 KiB across native staging, native ring, and shared ring. The worklet reports timeline points every 1024 output frames and actual rate boundaries. This deliberately explicit diagnostic representation can be optimized during integration.

[SHA-256 manifest](manifest.json) freezes source, private engine, workers, and fixtures. AC-3 source SHA-256: `4f8939c1607f7e369eaccae907ab00f65ffe6272616e1449d5b0882ae329fb68`. Video-only MP4: `c865e78b0a1bcdfe91d43346ba8a4749cd2978fae635027b1d0e14aae3b3359a`. The [original packet proof](../selective-audio-poc/preparation.json) covers 1800 identical compressed video packets, sizes/hashes/flags and timestamps within container timebase rounding. DTS is an audio transcode of the same source with video packet-copy; browser video remains the exact same MP4. A second source read/demux remains part of this PoC.

Requires the previously prepared selective-audio-sync assets and local native build dependencies:

```sh
python3 experiments/selective-audio-timeline/build.py
node experiments/selective-audio-timeline/prepare.mjs
node experiments/selective-audio-timeline/qualify.mjs
node experiments/selective-audio-timeline/pulses.mjs reset-anchor
FAST_RATE=1.75 node experiments/selective-audio-timeline/pulses.mjs reset-anchor
node experiments/selective-audio-timeline/overlap.mjs
node experiments/selective-audio-timeline/secondary.mjs
node experiments/selective-audio-timeline/eof.mjs
node experiments/selective-audio-timeline/cpu-check.mjs
node experiments/selective-audio-timeline/manifest.mjs
```

Raw intermediate failures are retained: initial unaligned publication, narrow-pulse detection failure, and the old EOF pause/reset assumption. The final full lifecycle preceded minor diagnostic-field/no-op/controller-guard edits; the final EOF and 1.5× pulse checks exercised the latest source. This is bounded local qualification, not long-duration drift, all-browser/device qualification, perceptual listening certification, or comprehensive concurrent-command testing.
