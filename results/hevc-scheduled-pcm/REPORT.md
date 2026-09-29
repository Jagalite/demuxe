# Real decoded PCM through scheduled browser audio buffers

## Outcome

A test-only transport using real mpv-decoded AC-3 PCM reduced whole-Chrome CPU from **32.66% to 21.88%** in one matched, startup-gated 12-second pair. Renderer CPU fell from **17.39% to 11.36%**. Both windows displayed 360 frames, dropped none, had no new audio underruns, no sync corrections and no page/player errors. This is a positive feasibility result for replacing the per-quantum AudioWorklet transport; it is not a production qualification or a README replacement.

GPU-process CPU also changed from 14.06% to 9.71% despite the same native video route. Therefore do not attribute the full 10.77-point whole-Chrome difference solely to audio transport or promise a repeatable 33% saving. The renderer reduction is about 6.0 points in this pair. Only one observation per arm was run, in baseline-then-prototype order.

## What changed in the prototype

The browser still automatically selects native-video-mpv-audio. The same selective mpv engine decodes the same source AC-3; no synthetic samples, decoder changes, audio-quality controls or video changes are used. Both arms seek to source time 3 seconds before five-second warmup and measurement.

The adapter pauses playback, retires the existing worklet/context, creates a fresh interactive AudioContext at the same sample rate, and deinterleaves the shared ring into 2,048-frame stereo AudioBuffers. AudioBufferSourceNodes are scheduled contiguously using the browser audio clock. Scheduled PTS values are mapped to DAC timestamps and passed to the existing NativeMpvAudio controller. mpv's worker, its PCM producer, native video and the existing sync/EOF observer remain in place.

The scheduler wakes every 20 ms and keeps approximately 120-160 ms queued. Crucially, copied and consumed cursors are separate: mpv receives consumption feedback as the audio clock passes scheduled samples, not when they are merely copied into buffers. This preserves backpressure rather than letting the decoder run unbounded. Sources are disconnected after completion.

## Correctness and startup-clock correction

`check-20260926-01` verified real decoded stereo tones near 440/880 Hz and observed zero scheduled underruns, with DAC-derived A/V error around -12 ms. In the CPU pair the initial prototype's error was approximately -19.4 to -20.1 ms (baseline +3.4 to +4.1 ms), still within the probe's 50 ms bound but worse than the existing transport.

The adapter was then corrected to ignore stale messages from the retired worklet and wait for a nonzero, valid output-device timestamp before first publication. `check-20260926-02` passed the stereo check, had zero scheduled underruns and zero drift corrections, and observed a maximum absolute DAC-derived A/V error of **2.41 ms** over the short correctness check. Final observed error was 2.10 ms. This startup-only revision was not rebenchmarked. Each run retains the exact served `scheduled-pcm.mjs`; the CPU run used the pre-priming version. These are timestamp-derived sync checks, not external microphone/camera measurements.

## Scope and remaining engineering

This prototype supports only steady 1x playback. Mid-playback seek/generation changes and rate changes deliberately fail; pause/resume after attachment and final partial blocks/EOF drain are not implemented. Main-thread scheduling also needs a bounded, tested response to stalls/backgrounding. Surround, long-duration wraparound and arbitrary media are unqualified. It must not be enabled in production in its current form.

The result justifies implementing a proper scheduled-PCM transport with explicit lifecycle, queue/epoch ownership and DAC-clock publication. mpv can remain the decoder. The next substantive work is that transport implementation, not additional AC-3 decoder tuning or diagnostics micro-optimizations.

## Evidence

- `identity.json`: unchanged frozen fixture and runtime identity.
- `check-20260926-01/result.json`: initial stereo and timing probe.
- `run-20260926-01/result.json`: gated before/after CPU samples, process IDs, frames, errors, sync and queue statistics; browser hardware-key startup completion is retained.
- `check-20260926-02/result.json`: primed-clock correctness probe.
- Test source: `tests/scheduled-pcm-prototype.mjs` and `tests/hevc-scheduled-pcm.mjs`.

No production files, README measurements, mpv binaries or decoder settings were changed. No commits were made.

## Subsequent instruction-counter comparison

The [identical-video AAC/AC3 comparison](../hevc-audio-path-comparison/REPORT.md) supersedes strong attribution from these CPU-only deltas. It confirms real extra work in the selective route, but finds only about a 6% renderer-instruction reduction for scheduled PCM; changing processor execution conditions can magnify CPU-time differences. Retain the observations above as historical diagnostic evidence, not a demonstrated fixed transport cost or a promised 33% production saving.
