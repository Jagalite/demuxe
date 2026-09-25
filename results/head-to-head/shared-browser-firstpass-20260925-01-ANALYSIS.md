# Shared-browser performance first pass

**18/18 windows passed in 12.0 minutes.** One installed headed Chrome launch; startup hardware-key completion confirmed before playback; three fixtures, three rotating rounds, fresh context per arm. Fixture and harness hashes, browser version/flags, individual process samples and RSS are in [the CPU artifact](shared-browser-firstpass-cpu-20260925-01/summary.json) and case records. This is an exploratory, correlated single-launch pass.

| Fixture | Round | Plain whole | Auto whole | Auto − plain | Browser CPU range | Auto route |
|---|---:|---:|---:|---:|---:|---|
| aac-mp4 | 1 | 12.71% | 14.61% | +1.90 | 0.25–0.27% | native-direct |
| aac-mp4 | 2 | 14.11% | 14.02% | -0.09 | 0.23–0.33% | native-direct |
| aac-mp4 | 3 | 13.52% | 14.82% | +1.30 | 0.24–0.27% | native-direct |
| aac-mkv | 1 | 12.43% | 14.42% | +1.99 | 0.22–0.27% | native-direct |
| aac-mkv | 2 | 13.89% | 13.28% | -0.60 | 0.19–0.25% | native-direct |
| aac-mkv | 3 | 12.83% | 14.53% | +1.70 | 0.22–0.27% | native-direct |
| pcm-mkv | 1 | 13.65% | 36.20% | +22.55 | 0.25–0.29% | hybrid |
| pcm-mkv | 2 | 13.51% | 34.40% | +20.89 | 0.22–0.23% | hybrid |
| pcm-mkv | 3 | 12.67% | 36.99% | +24.32 | 0.23–0.29% | hybrid |

All CPU numbers are percentages of one core. AAC arm order was plain/Auto, Auto/plain, plain/Auto. No idle subtraction or sample trimming. All measured process sets were stable, playback progressed, and available dropped-frame counters were zero. The PCM Hybrid counter does not report a drop count; it remains unavailable rather than assumed zero.

| Boundary | Idle whole | Idle browser | Peak summed RSS |
|---|---:|---:|---:|
| Before aac-mp4 | 1.78% | 0.41% | 1247 MiB |
| Before aac-mkv | 1.68% | 0.52% | 1064 MiB |
| Before pcm-mkv | 1.27% | 0.37% | 1033 MiB |

The short two-second between-arm idle checks often read 7–9% whole Chrome, mainly around context teardown and setup; they are not comparable to the 20-second boundary checks. The 20-second idle browser values were 0.41%, 0.52%, and 0.37%. Summed idle RSS declined 1247 → 1064 → 1033 MiB, despite some higher temporary PCM Hybrid peaks. These observations show no monotonic buildup in this 12-minute session. RSS sums can double-count shared pages.

The AAC paired whole-Chrome differences changed sign in round two, when Auto ran first. The non-browser paired differences likewise changed sign; this is an order/session effect candidate, not a browser-process spike. Small native-wrapper differences therefore need independent launches and possibly finer order balancing before release interpretation.

The sole browser block finished `complete` and all 6 tracked Chrome process IDs exited. The CPU artifact verifier passed. The correctness screen independently passed all six arms and its artifact verifier passed.

This pilot covers three synthetic fixtures, not the full 80-row README campaign. The single-launch CPU result is deliberately rejected by the release report renderer. A full first pass should retain the same monitoring and be split into bounded sessions if idle CPU, RSS or process sets drift.
