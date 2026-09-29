# Quick diagnostics fix check

HEVC10 + AC3, same frozen fixture and runtime with four generated JavaScript modules overlaid from local HEAD (before) or working tree (after). Headed Chrome, five-second warmup and 15-second CPU windows. Exploratory: the normal 150-second startup gate was omitted for this quick check. Raw results include module hashes, decoder identity, output checks and CPU samples.

| Version | Whole-Chrome CPU | Presented frames | Dropped frames | New audio underruns |
| --- | ---: | ---: | ---: | ---: |
| Before | 34.8% | 450 | 0 | 0 |
| After | 8.4% | 450 | 0 | 0 |

Both versions passed separate picture/audio marker checks and used VideoToolboxVideoDecoder with the native-video-mpv-audio route. The whole-Chrome comparison is contaminated: browser-process CPU fell from 26.49% to 0.37%, accounting for almost all of the apparent reduction. The short test omitted the startup gate, so whole-Chrome totals cannot establish a fix benefit. Renderer CPU was 4.92% before and 4.48% after (0.44 percentage points lower); all non-browser processes totaled 8.31% before and 8.04% after. These are exploratory component observations, not a repeatable improvement claim. The reverse-order pair failed during startup of the modified version with `Selective PCM timestamp timeout`, before CPU collection. Its cause is not established. The quick check is inconclusive and does not justify updating README performance numbers. No further measurements were run.
