<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# CPU campaign launch and sampling protocol

The maintained README campaign runners (`tests/head-to-head/run.mjs`,
`tests/head-to-head/specialist-screen.mjs`, and `tests/selective-production-cpu.mjs`)
share `tests/head-to-head/benchmark-browser.mjs`.

Use the installed Chrome through Playwright's `chrome` channel. No browser pin or
separate download is required. Every launch records the browser version, complete
effective command line, and a configuration hash with the temporary profile path
normalized. Main-catalogue correctness and CPU must match the browser version,
configuration, fixtures and harness. If Chrome updates, rerun correctness under
the new version. Do not combine browser versions in a reported median.

CPU runs use one fresh Chrome profile per fixture/round comparison block, headed Chrome, a foreground page,
960×540 viewport and device scale 1. Playwright's existing default flags and the
autoplay flag are retained. No GPU, decoder, frame-scheduling or routing override
is introduced. There is no initialized-profile cloning or adaptive selection of
an unusually quiet browser instance.

Before loading media on macOS Chrome, each CPU block observes **150 seconds of
startup tracing** and requires a completed `MaybeMeasureTpmOperations` browser
task. Tracing is stopped before measurement. Missing completion evidence rejects
the block; neither a quiet CPU interval nor elapsed time is a substitute.
The completion event, browser PID, observation duration and trace-stop status
are retained in `browserLaunch.startupReadiness`. Failed evidence is retained on
the block where available. The gate is explicitly not applicable on non-macOS
hosts; those hosts require an independent baseline audit.

After completion, **20 seconds at about:blank with tracing off** records CDP
process samples and RSS. These samples remain in the block and first arm's
`idleBeforeArm`. Idle is never subtracted from playback CPU. The 150-second
observation is a conservative provisional implementation, not a universal bound;
completion proof is the requirement. See [the project-wide standard](TESTING-STANDARD.md).
Between arms, close the old context, observe two seconds of idle in a temporary
context, and create a fresh playback context. These brief observations are
diagnostic, not precise baselines. Relaunch between blocks; correctness always
uses separate fresh launches.
After playback starts progressing, allow **5 seconds warmup**, then measure
**20 seconds**, sampling every **2 seconds** against fixed monotonic deadlines.
Sampling overhead no longer accumulates into the requested window. The CPU-query
midpoint timestamps define actual elapsed time; query duration and deadline
lateness remain available for auditing sampling uncertainty.

Every sample retains CDP process IDs/types/cumulative CPU, summed RSS and player
state. Summaries include whole Chrome, browser, renderer, GPU, audio service,
network/storage utilities, other processes, and the non-browser sum. Turnover at
any sampled point invalidates playback CPU even if endpoint process sets match.
The fixture server and external OS media services remain excluded. Summed RSS
can double-count shared pages. Frame/progression/focus/error and teardown checks
continue to gate accepted windows. Preserve failures and wide ranges.

## Single-browser exploratory first pass

The main runner accepts `--browser-scope campaign` with `--performance --exclusive`.
It launches and gates Chrome once for the entire selected set, then uses a fresh
browser context for each arm. It rotates arm order across rounds and records
20 seconds of idle at each fixture boundary, plus the normal two-second idle
between other arms. All idle samples, process IDs, role CPU and summed RSS are
retained. An arm cleanup or browser failure invalidates the shared block.

This is a first pass for detecting buildup, host noise and route problems. Three
rounds in one Chrome launch are correlated; the release report renderer rejects
this scope as independent release CPU evidence. Follow-up launches can confirm
small differences. Compare early and late idle browser CPU, whole CPU, browser
RSS, renderer/GPU/audio CPU, process count, and paired deltas. Do not trim high
windows or silently restart a drifting browser; retain the failed or noisy block.

Example, after a matching correctness run:

```sh
node tests/head-to-head/run.mjs --assets build/head-to-head/assets-release-supplement-20260925-04 --headed --exclusive --performance --correctness <correctness>/summary.json --browser-scope campaign --cases video.default.aac-mp4,demuxe.auto.aac-mp4 --output <new-output-directory>
```

The ordinary catalogue defaults to **three rotating rounds per fixture**. Use `--rounds 5`
for targeted follow-up where variability prevents interpretation. A wide range
remains visible; three or five rounds do not automatically establish a precise
small difference. Select plain video and all intended
players together so comparisons are matched within rounds. Failed-player
measurements remain diagnostic. The selective local-file runner uses three
alternating Hybrid/Auto pairs per fixture, sharing one browser within each pair.

Specialist screens accept `cpu1` through `cpu5`. Run `cpu1`, `cpu2`, and `cpu3` into separate output
directories; `cpu4` and `cpu5` are optional targeted follow-up. CPU observations share one browser per fixture/round block **after correctness
and its cleanup**, with fresh contexts and `correctness:false`: audio analysers and screenshot
probes from screening do not run during the CPU window. Screen failure keeps CPU
diagnostic; a CPU failure does not rewrite a successful lifecycle screen into a
codec failure. Inspect `cpu.accepted`, `cpu.issues` and `cpuUnavailable` separately.
For rounds after the first, append `--correctness <completed-screen>/summary.json`
to reuse the completed screen. Assets, harness and browser configuration must
match. Failed screens skip repeated qualification CPU in rounds 2–5; `cpu1`
retains a failed-cell diagnostic attempt. These remain bounded specialist
screens, not discrete-channel/HDR qualification.

This is a new measurement protocol. Historical results remain intact and are not
an A/B baseline. The startup settling adds campaign time;
reduced CPU variance must be demonstrated by new paired results, not assumed.

## Progress and serial campaign plans

Every runner prints a status line at phase changes and every five seconds:

```text
[17/400 completed] test 18/400 demuxe.auto.aac-mp4 round 2 | measurement: 12s | test left ~15s | campaign left ~3h 20m
```

Fixed phases show their countdown; setup and correctness show `estimating`.
Test and campaign ETAs are estimates updated from completed attempts, not
promises or timeout changes. Passed, failed and blocked attempts all advance
X/Y. The same state is written to `progress.json`.

To count across multiple runner commands, use
`node tests/head-to-head/campaign.mjs <plan.json> <new-output-directory>`.
The plan is a JSON object with `steps`, each containing a `label`, `tests` count,
and `command` array (executable followed by individual arguments, no shell).
`tests` counts scheduled attempts: main CPU is cases × rounds, specialist is
correctness cases plus CPU cases (CPU only with reused correctness), and
selective CPU is fixtures × 6. Each child checks the declared count against its
actual schedule. An incomplete runner stops the campaign; completed failed
playback outcomes remain failures while allowing subsequent steps to run.
`campaign.json` records step completion and each step has a progress JSON file.
The [retained pilot plan](../results/head-to-head/benchmark-protocol-20260925-campaign-02/plan.json) provides a concrete two-command example.
Optional `estimateSeconds` per planned step supplies its initial per-test ETA budget.

Startup completion and the post-trace idle observation are paid once per browser
block, then shared by its arms. This adds preparation time but removes the
identified startup overlap from the workload. Three 20-second windows for 400
playable cells require 6.7 hours of measurement alone; five require 11.1 hours.
Startup preparation, warmup and setup add to either figure. Do not promise a
campaign speedup until measured under this protocol.
No concurrent CPU lanes, shorter windows or reduced fidelity gates are implied.

## Validation

```sh
node --test tests/head-to-head/benchmark-browser.test.mjs tests/head-to-head/performance-metrics.test.mjs tests/head-to-head/contracts.mjs
python3 tests/head-to-head/release-auto-report.test.py
```

A small native H.264/AAC fixture with plain-video and Auto arms exercises the main
runner's fresh correctness gate and CPU path. A one-fixture specialist screen
with `cpu1` exercises the separate correctness/CPU launches. Keep both sets of
pilot evidence distinct from the full release campaign.

The [validation record](../results/head-to-head/benchmark-protocol-20260925-campaign-02/VALIDATION.md) links the passing paired and specialist pilots.
