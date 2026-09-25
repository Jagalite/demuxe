<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Project testing standard

This policy applies to all new tests and reruns in this project, including
experiments and research. Choose the workload before selecting the runner.

| Test purpose | Required protocol |
|---|---|
| Unit, contract, build, static analysis | Run the relevant deterministic checks; no browser startup wait. |
| Browser correctness, lifecycle, fidelity | Verify real output, routes, progression and cleanup; use fresh launches where isolation matters. Do not interpret incidental CPU as performance evidence. |
| Startup latency or startup-inclusive resource cost | Start measurement at the declared startup boundary; include background startup work and label it explicitly. Do not apply a steady-state gate. |
| Steady-state browser CPU, resource or throughput comparison | Confirm startup completion before timed work; apply the benchmark protocol below. |
| Other browser/platform or component-only measurement | State scope and use a validated equivalent baseline protocol. Do not claim whole-player or cross-browser equivalence from component measurements. |

## Steady-state browser measurements

Use [the shared protocol](BENCHMARK-PROTOCOL.md) and
`tests/head-to-head/benchmark-browser.mjs`. The maintained catalogue, specialist,
and selective CPU runners use `CpuBrowserBlocks`; it enforces the gate. A new
standalone runner must also use this helper or explicitly request
`launchBenchmarkChrome({startupGate:true})` and retain its startup evidence.
The low-level launch default remains ungated for correctness/startup tests.

On macOS Chrome, require a completed browser-process trace event for
`crypto/unexportable_key_metrics.cc::MaybeMeasureTpmOperations`. Stop tracing
before idle and playback measurements. A quiet interval, elapsed timeout, median,
or low CPU value is not completion evidence. A missing event, changed Chrome
instrumentation, trace failure or timeout rejects the CPU block; investigate and
requalify instead of silently bypassing the gate or retrying until CPU looks low.

Current implementation observes startup for 150 seconds, verifies completion,
then measures 20 seconds of idle with tracing off. This conservative observation
period is provisional; the completion requirement is mandatory. It runs once per
browser block, not per arm. Other platforms explicitly record this macOS gate as
not applicable; their baseline stability still needs independent qualification.

Use installed Chrome without a version pin; record its version, effective flags,
profile strategy, viewport and measurement policy. Do not change browser security,
media, GPU or decoder behavior to suppress unexplained load. Use the same settings
and frozen, hashed fixtures across comparison arms. Run correctness before CPU.
Avoid concurrent benchmarks/builds; record material host contention.

For an exploratory first pass, `--browser-scope campaign` may keep one gated
Chrome launch across selected fixtures and rounds. Record periodic idle/process
and RSS evidence, and label its three rounds as correlated. The release renderer
does not admit these rounds as independent release CPU evidence. See the
[single-browser protocol](BENCHMARK-PROTOCOL.md#single-browser-exploratory-first-pass).

Default to three counterbalanced rounds with fresh arm contexts, 5 seconds playback
warmup and 20 seconds measurement. Relaunch at declared block boundaries and gate
every new browser. Longer-lived batches need explicit boundaries and contamination
checks; never silently change browser lifetime mid-campaign. Five rounds are for
targeted follow-up, not a substitute for identifying systematic contamination.

Keep every sample in each measured window. Report whole Chrome, browser,
renderer, GPU, audio, utilities, non-browser sum, RSS, actual elapsed time,
progression, frame drops, errors, route and decoder where available. Exclude the
fixture server. Report paired differences and ranges; preserve rejected windows
and reasons. Do not trim CPU spikes or subtract a fixed/global idle constant.
Distinguish lifecycle correctness from performance acceptance and uncertainty.

Retain manifests, raw process samples, startup completion evidence, outcomes,
configuration and code/fixture identity. Show X/Y, current phase countdown and
campaign ETA. Unknown-duration phases must be labeled as estimates.

## Existing evidence and scripts

Historical results remain immutable and campaign-specific. A legacy runner that
has not adopted this policy can supply diagnostic/correctness evidence, but its
new CPU results do not qualify for release comparisons until migrated and
validated. This policy does not claim that all historical scripts have been
rewritten or that every codec/browser/platform has been requalified.

Before a full campaign, run a bounded pilot and inspect the raw per-process
results. The initial settled-browser pilot passed six windows with browser CPU
0.22–0.33% and paired Auto overhead +0.34 to +1.64 core points; this supports the
gate for this host/fixture, not universal variance elimination. See
[the pilot](../results/head-to-head/chrome-browser-cpu-settled-20260925-01/REPORT.md)
and [task attribution](../results/head-to-head/chrome-browser-cpu-20260925-02/REPORT.md).
