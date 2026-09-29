# Audio CPU variability: controlled external-load intervention

## Result

A bounded A/B/A intervention reproduces the low/high MP3 CPU regimes without changing decoder or audio output code. In a fresh headed Chrome after the standard startup-completion gate, ordinary software MP3 uses about 10% whole-Chrome CPU. Starting one temporary, CPU-bound Node process outside Chrome reduces Chrome CPU to about 2%; after it exits, CPU returns to about 10%.

| Condition | Whole Chrome | Renderer | Pump ticks / 10 s | PCM consumed | New underruns | Fixed-work median ms |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| idle-before | 10.01% | 8.86% | 1605 | 480,000 | 0 | 1.34 |
| external-load | 2.07% | 1.71% | 1673 | 480,000 | 0 | 1.30 |
| idle-after | 10.29% | 9.15% | 1602 | 480,000 | 0 | 2.54 |

All three short steady-playback diagnostic windows passed nonzero PCM, route, sample-progress, underrun, foreground/visibility, process-stability and error checks. The temporary process used 17.964 seconds of CPU over 18.000 seconds wall time and exited normally. Its CPU is deliberately outside the Chrome process tree; these measurements do not claim lower total system CPU or energy under load. Each arm used a fresh context, same URL fixture and frozen runtime, 4-second warmup and 10-second measurement. No V8 CPU profiler was used. There is one observation per condition, not a publication campaign.

This supports a host-load-dependent execution cost rather than extra MP3 decoder work or faster polling. The cheaper arm actually executed slightly more worker ticks. Main-thread fixed-work timing was nearly unchanged between the first and loaded arms, but slower in the last arm; it cannot identify which CPU cores ran audio/pthread workers. It is measured after the CPU window, not included in playback CPU. CPU frequency/core scheduling and kernel wakeup costs are not individually established by this first intervention.

## Host controls and limitations

The host is Apple M1. `pmset` reports Low Power Mode disabled and no recorded thermal/performance warning. Chrome was the frontmost macOS application. Previous low and high probes both used 48 kHz stereo, 5.33 ms base latency and 32 ms output latency. Other applications and audio activity remained present; they were not stopped. System power assertions and frontmost identity are retained in `20260926-01/host-state.json`. This is a diagnostic causal intervention on external load, not a claim of an otherwise idle machine.

A noninteractive attempt to read privileged powermetrics failed because sudo requires a password; no settings were changed. A follow-up uses read-only, unprivileged `proc_pid_rusage` counters for instructions, cycles and CPU time. The local macOS SDK supplies the rusage_info_v4 layout; Mach absolute CPU-time units must be converted with mach_timebase_info (24 MHz counter on this host), not treated directly as nanoseconds.

## Evidence

- `20260926-01/result.json`, `console.log`, `harness.mjs`, `identity.json`: A/B/A raw results and exact probe.
- `tests/audio-variability-probe.mjs`: A/B/A probe.
- `tests/audio-variability-counters.mjs` and `tests/audio-process-counters.py`: follow-up hardware-counter attribution.

No production code, README rows, or runtime binaries were changed.

## Hardware-counter attribution

The follow-up uses the same MP3 input and two fresh contexts in one startup-gated Chrome. It repeats baseline and external-load conditions, adding unprivileged native process counters immediately before and after each 10-second CDP window. These counters span 10.23 and 10.15 seconds respectively (slightly wider than CDP); calibration runs after both counter readings. The difference in interval length is far too small to explain the observed ratio.

| Dominant player renderer | Baseline | External CPU load |
| --- | ---: | ---: |
| Whole Chrome CPU (CDP) | 11.12% | 2.06% |
| Renderer CPU (CDP, all renderer processes) | 9.68% | 1.74% |
| Native user CPU seconds | 0.7775 | 0.1352 |
| Native kernel CPU seconds | 0.1998 | 0.0416 |
| Retired instructions | 1.427 billion | 1.192 billion |
| CPU cycles | 1.129 billion | 0.528 billion |
| Cycles / active CPU second | 1.155 GHz | 2.987 GHz |
| Instructions / cycle | 1.265 | 2.258 |
| Interrupt wakeups | 2689 | 2764 |

Both diagnostic windows passed, with no new audio underruns. Raw native results are in `20260926-02/result.json`; derived values are in `counter-summary.json`. The dominant renderer accounts for essentially all renderer CPU; the small secondary renderer is retained in the raw summary.

This identifies the main variability mechanism as CPU execution conditions changing with host load. The loaded renderer executes about 16.5% fewer instructions, not five times less work. Its aggregate active cycle rate rises 2.59x, and its instructions per cycle rises 1.79x; together with the smaller instruction count, these account for the roughly 5.53x reduction in active CPU time. Both user and kernel time fall. Wakeups increase slightly, excluding fewer wakeups as the explanation. The earlier A/B/A reversal supplies the temporal control missing from this two-arm counter observation.

The active GHz values are derived process-wide cycle/CPU-time ratios, not direct per-core frequency samples. We did not record core residency, so frequency scaling versus migration between M1 performance/efficiency cores is not individually resolved. The main-thread calibration does not represent all audio/worker threads. These limits do not support attributing the large change to codec complexity, PCM sample count, or a hidden high-rate polling loop.

## Implication

The 1-3% and roughly 10% audio results can both be valid CPU-time observations of comparable audio work under different processor execution conditions. They cannot be interpreted as intrinsic per-codec costs or compared across campaigns without this context. Keep whole-Chrome CPU but collect native instruction/cycle counters and the derived active cycle rate in targeted performance comparisons; retain process roles, correctness and host-state evidence. Lower Chrome CPU during external load is not lower total machine work or power consumption.

This also limits interpretation of earlier selective-audio transport savings: output-path changes may genuinely reduce work, but CPU time alone can overstate or understate the gain if processor execution conditions differ between arms. That earlier experiment was not instrumented with these native counters, so its exact work reduction cannot be reconstructed from the available CPU totals.
