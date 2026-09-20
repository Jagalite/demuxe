<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Prioritized whole-player tier measurements

Five alternating fresh-browser pairs per completed case, with matched prior output/lifecycle qualification. Positive primary gate: all five steady CPU pairs improve and median saving is at least 10%. Runtime and fixture hashes are frozen. Lower tier number is not assumed to mean better performance.

| Case | Observed route | CPU delta | Startup delta | Peak summed RSS delta | Main-thread task delta | Primary gate |
|---|---|---:|---:|---:|---:|---|
| h264-srt | hybrid → native-direct | -49.8% | -28.2% | -4.1% | -77.5% | Pass |
| h264-ass | hybrid → native-direct-ass | -38.5% | -20.2% | -3.0% | 35.7% | Pass |

Negative percentage means lower cost. CPU covers all CDP-listed Chrome processes, not server or external media services. RSS is summed process RSS and may double-count shared pages. Startup ends after API play and 0.5 seconds of progression, not physical first sound or photon. Browser launch is outside player lifecycle measurements. Five pairs on a shared host are a bounded confirmation, not a population confidence guarantee.

The baseline and candidate observe the same player API, media, timeline and required subtitle behavior. An explicit Native A/V lab route can still include a JS extractor or independent libass renderer. The benefit belongs to the whole substitution; do not multiply or attribute it independently to every related research item. Production extraction cancellation/range budgets, broader subtitle support and deployment remain separate gates.

## Evidence

- `h264-srt`: `results/head-to-head/tier-priority-srt-01/result.json`; all manifest hashes verified.
- `h264-ass`: `results/head-to-head/tier-priority-ass-01/result.json`; all manifest hashes verified.
