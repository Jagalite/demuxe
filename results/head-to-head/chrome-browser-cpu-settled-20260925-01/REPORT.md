# Playback after hardware-key startup completion

Diagnostic: one installed Chrome 153.0.8010.53 launch, fresh contexts per arm, frozen README H.264/AAC MP4 fixture, three alternating pairs. Startup trace confirmed completed MaybeMeasureTpmOperations before playback. Tracing stopped before the 20-second idle observation and every playback window. A tracing utility process remained listed and included in CPU totals. No production, routing, README, or campaign-default changes.

Fixture SHA256: `37670a8ef2c82d8d99ef9b66e7cd68ee7fc74e279a86e4e7d248f4cc22bb0b4d`.

Startup observation: 155.6s. Completed hardware-key task: 79.55s wall, 26.76s thread CPU. The 150s wait is diagnostic, not a validated production timeout.

Post-trace idle: whole 0.34%, browser 0.17%.

| Round | Plain CPU | Auto CPU | Auto − plain | Plain browser | Auto browser | Non-browser delta |
|---|---:|---:|---:|---:|---:|---:|
| 1 | 13.99 | 14.33 | +0.34 | 0.28 | 0.26 | +0.35 |
| 2 | 13.76 | 14.17 | +0.41 | 0.22 | 0.33 | +0.29 |
| 3 | 13.19 | 14.83 | +1.64 | 0.24 | 0.25 | +1.63 |

All six windows accepted; zero dropped frames. Auto native-direct throughout. Mean paired difference +0.80 core points; median +0.41; range +0.34 to +1.64. CPU is percentage of one core. Samples retained without trimming or idle subtraction.

This supports startup keychain work as the cause of the large browser-process contamination. This launch produced much steadier browser CPU after task completion and native-level wrapper overhead. It does not establish across-launch reproducibility, validate other fixtures, or make these totals directly comparable with historical campaigns. Other host applications remained active. The full correctness campaign was not repeated; the pilot checked progression, frame quality, focus, errors, process stability and route.

Next validation: repeat the startup-completion gate across independent launches before adopting it for the full campaign. A longer fixed wait on every cell is not required by this evidence; startup readiness belongs at browser-block scope.
