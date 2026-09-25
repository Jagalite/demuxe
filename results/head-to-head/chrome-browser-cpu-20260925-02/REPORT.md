# Chrome browser CPU burst investigation

Two fresh headed installed Chrome 153.0.8010.53 launches, identical benchmark launch flags, fresh temporary profiles and blank pages. No fixture server or player. Raw CDP CPU snapshots retained. First launch used an intrusive five-second macOS stack sample during a burst; second used Chrome task tracing. These are attribution experiments, not publishable performance measurements.

## Attribution

The second trace contains a browser ThreadPool_RunTask originating at crypto/unexportable_key_metrics.cc:355, MaybeMeasureTpmOperations. It lasted 43.460180 seconds wall time and consumed 13.720256 seconds of thread CPU. Four nested DeleteWrappedKeysSlowly calls lasted approximately 10.4–11.4 seconds each and consumed about 3.4 seconds CPU each. The first run's stack sample independently shows SecItemCopyMatching -> Security key processing -> CryptoTokenKit/Secure Enclave calls on a background worker, with the browser UI thread waiting.

Source fetched for exact Chromium tag 153.0.8010.53 confirms that the metrics task creates/tests hardware keys and cleans them up. DeleteWrappedKeysSlowly enumerates matching keychain keys before filtering the particular wrapped keys to delete. No keychain contents were read by this investigation, and no keys or user settings were changed by our scripts. The precise reason that the operating-system query is expensive on this host is not established.

Source: https://github.com/chromium/chromium/blob/153.0.8010.53/crypto/unexportable_key_metrics.cc
Source: https://github.com/chromium/chromium/blob/153.0.8010.53/crypto/apple/unexportable_key_apple.mm

## Timing and consistency

The blank-page browser CPU peaked at 63.9% and 63.2% of one core. Last sampled intervals above 20% ended at approximately 98.9 and 46.4 seconds after each run's initial sample. The sampling script's console labels are nominal two-second ticks; use raw monotonic timestamps for actual elapsed time. Profiling overhead and changing host load limit numerical comparison. Both runs subsequently became quiet. Two launches establish recurrence, not a duration distribution or a safe universal timeout.

The earlier paired pilot's 30-second wait therefore allowed startup hardware-key metrics to overlap media measurements. Shared Chrome removed launch differences within each pair but did not prevent an arm-order effect when the startup task completed between arms. No evidence here establishes when Chrome introduced this behavior or explains the historical version difference conclusively.

## Measurement recommendation

Do not remove high samples or subtract a constant. The arithmetic mean over a whole window is CPU time / wall time; it already counts bursts correctly. It cannot distinguish playback from unrelated startup work. Median-of-round totals also cannot repair unequal overlap.

For steady-state playback, validate a startup-completion protocol once per browser block, retain the complete startup observation, then measure all arms with the same rule. Prefer an explicit completion signal for this task; otherwise validate a conservative fixed warmup using multiple launches and flag contaminated blocks rather than pruning samples. A brief quiet interval alone is insufficient: the first run had quiet gaps followed by renewed activity. Reuse the settled browser across arms and rotate order. Keep startup-inclusive CPU as a separate metric if that is the intended workload.

No benchmark defaults, production code, routing, or README were changed by this investigation. A targeted settled-browser validation is still needed before the full campaign.
