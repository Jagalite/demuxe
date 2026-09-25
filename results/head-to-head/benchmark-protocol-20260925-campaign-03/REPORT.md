# Three-window pilot

Completed 8/8 attempts: two correctness checks and six CPU windows. Total campaign wall time: 321.683 seconds (5m22s). Both artifact integrity checks passed. No full campaign started.

| Round | Plain whole | Auto whole | Plain browser | Auto browser | Auto minus plain, non-browser | Shared browser PID |
|---|---:|---:|---:|---:|---:|---:|
| 1 | 52.2 | 42.0 | 40.0 | 28.9 | +0.89 | 5821 |
| 2 | 12.7 | 51.5 | 0.3 | 38.7 | +0.48 | 8570 |
| 3 | 49.0 | 10.7 | 40.5 | 0.3 | +1.85 | 10454 |

CPU units: percent of one core. Order: plain/Auto, Auto/plain, plain/Auto.

Measurement windows: 20.0014–20.0038 seconds. All playback process sets stable; zero dropped frames. Auto samples confirm native-direct. Three distinct browser launches, shared within each pair; fresh contexts per arm.

Progress reached 8/8 and zero remaining. Fixed-phase countdowns worked. Overall ETA and test ETA jumped around launch/reuse and cleanup because they use average attempt duration; this remains a usability limitation.

During setup, an OS process snapshot showed mediaanalysisd at 194.1% and duetexpertd at 88.4%. These were not continuously monitored; this pilot is not a quiet-host qualification.

Browser CPU varied from 0.33 to 40.48 core points, including large changes inside a shared-browser pair. The 30-second initial settle and shared browser did not establish a stable baseline. Non-browser paired deltas were +0.89, +0.48, +1.85 points. Do not interpret the whole-Chrome paired differences as wrapper cost or subtract a constant.

Recommendation: investigate browser activity versus time since launch before the full campaign. Additional repetitions alone do not resolve this apparent order/time effect. Preserve this pilot as harness validation and diagnostic evidence.

INCONCLUSIVE — BROWSER PROCESS TOO UNSTABLE
