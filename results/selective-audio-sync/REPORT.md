# Experiment-only selective video/audio synchronization qualification

**Evidence retention:** Linked trial JSON is committed as lossless zstd archives; the [evidence index](../research-evidence-index-20260925.json) records hashes of the original and archived files. Original raw JSON remains local.

Follow-up: the [rate-transition investigation](../selective-rate-investigation/REPORT.md) uses timestamped PCM pulses to confirm real queued-audio lag and demonstrates a no-seek diagnostic that changes video speed when old-rate audio has largely drained. It also fixes the experiment's stale pre-pause seek anchor. The earlier need for one seek per transition describes this controller, not an inherent requirement of the selective architecture; production qualification remains open.

**Decision: RATE TRANSITIONS BLOCK PRODUCTION.** The selective route retains the previously measured median 22.5 core-point CPU advantage as a prior result, and the new seek, pause, and EOF controls work in this H.264/AC-3 experiment. The measured audio clock proxy remains around 77 ms behind video at 1.5× and 86 ms behind at 1.75× in the final run, with roughly 100 ms p95 error. Each requested rate change still needs one audio seek and a 129–141 ms publication pause. The absence of an audible transition artifact has not been independently established. Auto and production routing were not changed.

## Scope and assets

This is a test-only clone under `build/selective-audio-sync`, driven by `experiments/selective-audio-sync` and reproducibly built by [prepare.mjs](../../experiments/selective-audio-sync/prepare.mjs). Its [preparation record](preparation.json) verifies the unchanged production Wasm and worklet. It uses the frozen 30 s, 1920×1080, 60 fps H.264/AC-3 source (`4f8939c1607f7e369eaccae907ab00f65ffe6272616e1449d5b0882ae329fb68`) and the same video-only packet-copy MP4 (`c865e78b0a1bcdfe91d43346ba8a4749cd2978fae635027b1d0e14aae3b3359a`). The [previous packet proof](../selective-audio-poc/preparation.json) matches all 1,800 video packets by hash, size, flags, PTS, and DTS within 1 ms. Browser `<video>` presents the MP4 directly; MSE was unnecessary for this fixture. mpv separately reads the original AC-3 Matroska and has `vid=no`, zero selected video tracks, null video codec/parameters, zero video render calls, no WebCodecs decoder worker, and no visible canvas. The cloned worker and worklet add only experimental sync and diagnostics behavior.

Chrome 153.0.8010.53 on this Mac reported `VideoToolboxVideoDecoder` and `kIsPlatformVideoDecoder=true` in the [fresh long-pause/backend capture](pause-backend-1790300990928/result.json.zst). The browser video and mpv AC-3 selection also appear in the [full lifecycle run](qualify-1790300791031/result.json.zst).

## Clock model

| Signal | Meaning and use |
| --- | --- |
| `HTMLVideoElement.currentTime` | Browser media timeline; authoritative master. It is sampled on the main thread. |
| `requestVideoFrameCallback.mediaTime` | PTS of the last browser frame submitted for display. `expectedDisplayTime` is a predicted performance-clock display time, not proof of actual scanout. Used to gate seeks on a fresh target frame and identify the final 200 ms drain window. |
| mpv `time-pos` | mpv playback position. Its browser AO reports native queued PCM plus WebAudio base/output latency in `get_state`; this experiment treats `time-pos` as an AO-compensated **output-clock estimate**, not a decode/write pointer. |
| Written PCM position | Not directly timestamped by the existing AO. The trace includes an *estimated* write frontier: estimated audio presentation time plus worklet ring frames/sample rate and the AO-reported WebAudio latency, all converted by current media rate. This is diagnostic only. |
| Worklet consumed frames | Cumulative rendered sample frames, including across native epochs; useful for progress and pause/underrun checks, not a media timestamp by itself. The worklet also records consumed generation/native epoch. |
| WebAudio output latency | `baseLatency + outputLatency`, passed to mpv AO; `getOutputTimestamp()` maps WebAudio context time to performance time. The latency is not subtracted again from mpv `time-pos`. |
| `estimatedAudioPresentationTime()` | Last mpv `time-pos` plus at most 150 ms of rate-scaled extrapolation, only while the AudioContext runs and worklet consumption is fresh. Observations older than 500 ms are rejected. Error is this estimate minus browser `currentTime`; negative means estimated audio behind video. |

This is still **estimated A/V skew**, not a microphone/photodiode or source-waveform correlation measurement of audible sync. Chrome's actual speaker latency and display scanout are not independently observed. Percentiles below must not be read as acoustic precision.

## Controller and transactions

The browser video is master. The controller samples every 250 ms while a separate trace samples clocks every 50 ms. It ignores paused, seeking, draining, stale, and unobserved states. After three consecutive observations beyond ±50 ms, it applies a temporary mpv speed trim capped at ±0.5% of the requested rate. Three consecutive observations inside ±30 ms release the trim. The deadband/hysteresis avoids per-sample commands. Every decision is stored with the clock sample; actual changes are logged as corrections. No drift-triggered hard seek occurred. The final full run had 9 soft-speed applications, 4 releases, and about 33.8 s in a soft-correction interval; this long duty cycle is another reason not to call the controller production-qualified.

Each seek increments the controller generation, fades audio for 8 ms, blocks worklet publication, pauses both owners, seeks browser video and mpv audio, waits for the native ring epoch to advance and be acknowledged, waits for mpv seek confirmation and a fresh browser frame at the target, then permits only that new epoch and fades in on resume. The worklet rejects PCM from a nonpermitted epoch. Six user seeks (forward, backward, paused, nearby repeat, immediately after fast rate, and near EOF) completed in the full run; stale-epoch rejects and pre-EOF underruns were both zero. No old-generation PCM was consumed after the publication gate opened. The gate establishes a stronger stale-audio check than simply trusting command completion, though it does not acoustically verify a fade.

A direct browser/mpv speed change with no seek was tested and retained in [the failed rate run](rate-1790300141977/result.json.zst): 1.5× stayed about 258 ms behind after five seconds. The final route therefore pauses both owners, changes both rates, performs **one** generation-scoped mpv audio seek to the paused browser position, waits for the new epoch and mpv seek confirmation, and resumes both. There are no extra drift hard seeks. The 8 ms gain ramps reduce abrupt PCM edges in the experimental graph, but click-free output has not been measured at speakers.

At EOF, the browser frame callback marks the final 200 ms as drain. The worklet counts empty callbacks there separately from pre-EOF underruns. The cloned audio worker preserves already transferred final PCM across mpv's native AO reset until consumed. Once the ring empties, the controller pauses mpv, waits for its new native epoch to be acknowledged by the still-running worklet, then suspends WebAudio. The [final targeted EOF and replay run](eof-1790301185501/result.json.zst), repeated after rebuilding the clone from `prepare.mjs`, reached browser EOF, had zero pre-EOF underruns and 41 drain callbacks, acknowledged native epoch 6, suspended audio, then sought to 4 s and resumed to 5.52 s without an error or underrun. The final full lifecycle run predates the last epoch-ack ordering fix and had zero pre-EOF underruns plus 14 drain callbacks; earlier failed EOF attempts remain in this directory.

## Measured clock behavior

The table comes from the [final full lifecycle capture](qualify-1790300791031/result.json.zst) and its [analysis](qualify-1790300791031/analysis.json.zst). Samples are 50 ms apart; the first second after each phase action is excluded from these steady-window distributions. These are correlated samples from one run, not independent replicates.

| Phase | Samples | Absolute error p50 / p95 / p99 | Max |
| --- | ---: | ---: | ---: |
| 1× startup steady window | 133 | 59 / 70 / 71 ms | 71 ms |
| 1.5× after transition | 100 | 77 / 100 / 106 ms | 106 ms |
| Back to 1× | 77 | 61 / 76 / 77 ms | 77 ms |
| After 8 s pause/resume | 65 | 53 / 67 / 70 ms | 70 ms |
| Forward seek, then 1× | 46 | 48 / 52 / 52 ms | 52 ms |
| Backward seek, then 1× | 51 | 49 / 51 / 51 ms | 51 ms |
| 1.75× after transition | 79 | 86 / 100 / 117 ms | 117 ms |
| Seek while at 1.75× | 40 | 84 / 109 / 112 ms | 112 ms |
| Return to 1× | 37 | 69 / 78 / 78 ms | 78 ms |

The first valid startup sample was −13 ms, but the first second's median was about −69 ms; the last second before the first rate change was about −48 ms. That is correction toward the master, not an accumulating normal-speed drift. A second high-frequency run before adding gain ramps also had 1×/1.5×/1.75× p50 values of 59/65/74 ms, so the fast-rate miss is not unique to the final run. Exact percentiles still vary between launches.

Rate-change publication was blocked for 141, 130, 133, and 129 ms for 1→1.5→1→1.75→1. During the first 500 ms after publication, maximum observed absolute error was 91, 71, 102, and 85 ms. The 1.75× transition needed about 886 ms to yield five consecutive samples below 100 ms; **none** of the four transitions yielded five consecutive samples below 50 ms within the measured two-second settling window. The final 1.75× phase ended at approximately −97 ms. Temporary sub-100 ms recovery does not satisfy the requested ~50 ms steady-state target.

The 8 s [long-pause check](pause-backend-1790300990928/result.json.zst) advanced neither browser media time nor worklet media-frame count, required zero hard seeks, and resumed without a playback underrun. The full run also covered paused seeks and nearby repeated seeks. Browser drop counters increased sharply at 1.75× on a 60 Hz surface (about 105 source frames/s requested), so they cannot be interpreted as a selective-route decoder failure by themselves. No mid-playback underrun was recorded; the full run had 14 classified drain callbacks at EOF, and the final targeted EOF test had 41.

## Performance and qualification boundary

The prior [matched CPU experiment](../selective-audio-poc/REPORT.md) measured a 22.5 core-point median whole-Chrome saving versus production Hybrid AC-3 with identical video packets. This task did **not** rerun a matched CPU campaign, per the instruction to focus on sync. The experiment adds 20 Hz diagnostics, a small controller, epoch atomics, and a gain node; no CPU regression was observed through playback cadence or underruns, but a quantitative CPU-regression bound was **not measured**. No source, video decode, canvas, or production-route behavior changed.

H.264/AC-3 has not passed the rate and acoustic-artifact gates, so the secondary codec check was not started. The next narrow step is to timestamp identifiable output PCM against a source reference or an external speaker/display measurement, then determine whether the persistent fast-rate proxy offset is real audio lag or an mpv/AO clock-estimation bias. Rate-transition silence/gain ramps also need an artifact check before any production integration.

**Conclusion: RATE TRANSITIONS BLOCK PRODUCTION.**


## Timestamped PCM follow-up

The experiment-only [synchronization closeout](../selective-audio-timeline/REPORT.md) supersedes the rate-transition blocker for the tested H.264/AC-3 and bounded DTS cases. It schedules browser rate changes at the actual audible PCM rate boundary, with no rate seek. Earlier raw failures remain preserved. Production routing is unchanged.
