# Faster playback recovery

Native output verification and the default ongoing native-progress watchdog now use 2 seconds instead of 10 seconds. The existing 1.5-second first local direct-play trial remains shorter when eligible. Media loading, preparation, network, seek completion, and cleanup retain their separate deadlines. Hybrid/software decoder watchdog budgets are unchanged.

Automatic Firefox local direct playback uses a 500 ms output trial when an alternative plan is eligible and remux is allowed. It still starts with native direct. Missing output triggers existing route selection, which requests native remux; it does not identify a specific Firefox bug or switch just because a `waiting` event occurred. Explicit pinned modes, `nativeRemux: 'never'`, HTTP sources, and already-remuxed playback do not receive this Firefox-specific deadline.

The ongoing native monitor uses the same 500 ms recovery budget for eligible Firefox local direct sessions. Its 500 ms sampling cadence adds detection latency. This case may count `readyState: 2` as observable when at least half a second (adjusted for playback rate) is buffered ahead. Paused, seeking, hidden, ended, unverified, and unbuffered periods remain excluded. Ordinary network buffering retains the existing readiness guard; declared long-held video frames retain their frame-interval allowance.

An ongoing `PLAYBACK_STALLED` fault can now enter automatic recovery without marking the browser's codec capability incompatible. Previously, the watchdog dispatched recovery but its non-codec fault was classified as terminal. Failed routes remain excluded for the current source/configuration to bound retries. Permission, source identity, cancellation, and other terminal errors retain their handling.

`watchdogs.nativeProgressTimeoutMs` remains configurable from 1000 to 120000 ms, with a new default of 2000 ms. The eligible Firefox local case caps the effective budget at 500 ms. Disabling `nativeProgress` still disables ongoing monitoring; play/resume output verification remains separate.

There is no Firefox version cutoff or unconditional reroute. If an upstream fix restores prompt progress, direct playback completes verification and stays selected. Healthy Firefox controls exercise that behavior; no patched Firefox build is claimed. A slow healthy start can still switch unnecessarily, as accepted for this policy. Recovery preparation adds time beyond detection.

## Validation

- The Firefox regression harness is `tests/firefox-local-recovery-browser.mjs`. All 11 scenarios passed on Firefox 146.0.1 and installed Firefox 157.0, using the unchanged reproducing fixture. It covers repeated cold resumes, 0.5×/1×/2× playback, healthy and settled seeks, HTTP, already-remuxed playback, pinned-mode errors, and an injected buffered stall during ordinary playback.
- Three cold failure trials per browser selected recovery after 502–508 ms. Total seek/resume recovery was 0.94–1.56 seconds including preparation. Injected ongoing stalls selected recovery after about 788 ms and completed in 1.20–1.43 seconds.
- Shared Chromium 152 preview controls passed local direct, HTTP direct, and remux seek/resume output checks. Its injected ordinary stall recovered through native remux using the general deadline. Hybrid/software controls retained their routes and advanced source position through pause/seek/resume; these are transport checks, not physical-output fidelity measurements.
- Unit coverage checks targeting exclusions, healthy completion, pause cancellation, terminal errors, once-only recovery, codec-capability preservation, and buffered-wait eligibility. The final full API contract suite passed 3,346/3,346 tests plus consumer type checks (`results/api-stability/gate-unit-all-node-1791216597407`). Build, licensing, and pure dependency checks passed.

Evidence is retained under `results/firefox-fast-recovery/`: final Firefox 146 receipt `1791216429114/result.json`, installed Firefox receipt `system-final-20261005/result.json`, and the three `chromium-*.json` receipts. Earlier diagnostic runs are retained: the first exposed the runtime-recovery classification gap; subsequent harness corrections replaced a too-short public-state observation interval with bounded progress polling and a 600 ms follow-up. The full contract rerun also encountered an intermittent timeout in the unchanged private-audio-worker test; its isolated rerun passed.

This qualification covers rebuilt repository output. The previously retained release archive and tag predate this change; their full qualification receipt does not cover these new bytes.
