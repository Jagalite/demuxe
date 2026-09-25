# Selective-route rate-transition investigation

The persistent transition gap is primarily real PCM output lag caused by changing browser video speed before audio already queued at the old speed has finished. mpv's clock also misestimates the mixed-rate queue during the transition, but clock error alone does not explain the steady gap. A no-seek diagnostic which changes mpv speed first and changes video speed 340 ms later removes most of the additional lag at both 1.5× and 1.75×. This is evidence for coordinating the transition with the PCM rate boundary; a fixed delay is not a qualified synchronization policy.

## Measurement

A diagnostic AC-3 soundtrack contains 10 ms, 2 kHz pulses at media times 1, 2, …, 29 seconds. The browser continues presenting the exact same frozen H.264 video-only MP4. The audio source is a packet-copy of that video with the pulse soundtrack. The [preparation record](preparation.json) matches all 1,800 video packet hashes, sizes, PTS, and available DTS; Matroska omits the first two DTS values. Offline AC-3 decoding locates each threshold crossing within 0.021 ms of its integer-second target.

The existing worklet pulse detector records the actual output sample index. WebAudio `getOutputTimestamp()` maps that sample to estimated output performance time, and browser `currentTime` is projected to the same instant. Thus this measures identifiable PCM reaching the output path, independently of mpv `time-pos`. It still relies on Chrome's output timestamp/latency reporting and is not a speaker/scanout sensor measurement. Tempo filtering can reshape a pulse and move its threshold crossing; the observed fast-rate pulse variation is retained.

The drift controller is disabled for these attribution runs. Startup first waits for worklet consumption and then seeks both owners to zero. That barrier excludes an observed AudioContext startup delay from transition results. Each accepted run plays about 4.2 s at 1×, 5 s at the faster rate, and 4 s back at 1×. Chrome is 153.0.8010.53. All accepted runs report zero pre-EOF worklet underruns. This is a narrow diagnostic, not a repeated statistical qualification or CPU benchmark.

## Results

Positive numbers below are audio lag behind browser video. [Analysis JSON](analysis.json) links every raw run; each raw directory also freezes its harness.

| Transition method | Fast rate | Median pulse lag | Pulse range | Audio seeks for two rate changes |
| --- | ---: | ---: | ---: | ---: |
| Change both speeds immediately | 1.5× | 219 ms | 203–238 ms | 0 |
| Set `audio-buffer=0.01`, change both immediately | 1.5× | 235 ms | 218–254 ms | 0 |
| Existing gated seek transition | 1.5× | 68 ms | 52–88 ms | 2 |
| Capture seek target after pause | 1.5× | 58 ms | 42–78 ms | 2 |
| Audio speed first, video speed 340 ms later | 1.5× | 59 ms | 37–73 ms | 0 |
| Change both speeds immediately | 1.75× | 308 ms | 296–327 ms | 0 |
| Audio speed first, video speed 340 ms later | 1.75× | 68 ms | 59–93 ms | 0 |

Normal-speed pulse lag before transitions was 35–39 ms. The delayed-video 1.5× run returned to approximately 29 ms lag at 1×; its 1.75× counterpart returned to approximately 69 ms. The latter residual and fast-rate spread prevent qualification of the fixed-delay experiment. There were no rate-transition seeks in either delayed-video run. Both diagnostic runs still use an explicit startup seek to establish the baseline.

In the accepted direct 1.5× run, the settled mpv clock proxy was only 7–35 ms behind the independently identified pulse position. At the 1.75×→1× boundary its error briefly reached +115 ms. Consequently, brief clock spikes should not be read directly as audible discontinuities, while the persistent 200–300 ms lag is supported by the PCM pulse observations.

## Mechanism and evidence

The local mpv source and browser AO expose two queues:

- `native/ao_browser.c` sets `ao->device_buffer = WEB_AUDIO_CAPACITY` (8,192 frames), or 170.7 ms at 48 kHz.
- `build/sources/mpv/audio/out/ao.c` sets the software buffer to `max(device_buffer, audio-buffer * sample_rate)`. The software buffer therefore has an 8,192-frame minimum too. Lowering the `audio-buffer` option alone cannot remove this floor.
- `build/sources/mpv/audio/out/buffer.c` adds software pending samples to driver delay. These are separate queues; the JS ring mirrors the native AO ring and must not be counted as a third queue.
- `build/sources/mpv/player/audio.c` changes `audio_speed` and updates speed filters without flushing already queued PCM. `playing_audio_pts()` subtracts `current_audio_speed * ao_get_delay()` from the written PTS, even while some queued samples were generated under the old speed.

The two queue capacities total about 341 ms. If video adopts a new speed immediately while output audio retains the old speed for roughly that interval, the additional lag is approximately `(new_rate - old_rate) * queued_output_seconds`: 171 ms at 1.5× or 256 ms at 1.75×. The observed increases above the 35–39 ms baseline are about 184 ms and 271 ms. Filter buffering, queue occupancy, command timing, and pulse shaping account for remaining uncertainty; exact software queue occupancy was not instrumented. The 340 ms scheduling intervention recovers approximately 160 ms and 240 ms of median lag, respectively, supporting this mechanism. Local source explains the behavior, but this run did not rebuild or symbolically attest the frozen Wasm to that source revision.

There is also a smaller concrete bug in the experimental seek transition: its target was captured before the 8 ms fade and subsequent pause completed. Browser video advanced while the target stayed stale. The diagnostic captures the target after `video.pause()` and the mpv pause acknowledgement instead. At 1.5×, median pulse lag improved from 68 to 58 ms; after returning to 1×, lag improved from about 77 to 61 ms. This correction is now applied to `experiments/selective-audio-sync/poc.mjs` only.

## Boundaries and next implementation step

The earlier assertion that rate changes inherently require an audio seek is too strong. The no-seek scheduling diagnostic demonstrates that a seek can be avoided when video waits for the queued audio transition. A production-quality implementation would need a rate epoch attached to PCM and a trustworthy output-time estimate for when the first new-rate sample becomes audible. Then the browser rate change could be scheduled against that boundary, with bounded correction for scheduling jitter. Smaller buffers may also help, but changing only mpv's `audio-buffer` setting does not change the current minimum.

This task did not implement that new controller, reduce native buffer capacity, rebuild the Wasm, change Auto routing, or rerun CPU measurements. No claim of click-free or speaker-accurate transition behavior is made. The pulse soundtrack is an attribution fixture; the original realistic AC-3 soundtrack still needs qualification after any transition-policy change.

The first direct run (`direct-1790301781110`) is excluded because AudioContext startup delayed the initial baseline by approximately 1.3 s. The first delayed-video run (`delayed-video-1790301920286`) is excluded because the harness patched an unused function and did not delay video. Both raw attempts are retained.

Reproduce the fixture with `node experiments/selective-rate-investigation/prepare.mjs`, then run `node experiments/selective-rate-investigation/run.mjs direct`, `reset`, `reset-anchor`, `small-buffer`, or `delayed-video`. Set `FAST_RATE=1.75` for the secondary rate. Prepare the selective-sync clone first if absent.

**Conclusion: queued PCM rate-transition timing is the main problem. A seek-free transition appears feasible, but the fixed-delay diagnostic is not production-qualified.**


## Timestamped PCM follow-up

The experiment-only [synchronization closeout](../selective-audio-timeline/REPORT.md) supersedes the rate-transition blocker for the tested H.264/AC-3 and bounded DTS cases. It schedules browser rate changes at the actual audible PCM rate boundary, with no rate seek. Earlier raw failures remain preserved. Production routing is unchanged.
