# Audio cost attribution — 2026-09-26

The extra cost belongs to the entire selective audio pipeline. The AudioWorklet
**author callback alone does not explain it**. This experiment measures distinct
boundaries and does not turn historical whole-player differences into component costs.

## Matched unprofiled comparisons

Frozen URL fixture: HEVC Main10 SDR, 320×180/30 fps, stereo 48 kHz AC-3,
`build/head-to-head/assets-hevc10-ac3-bafdb3f3-20260926-01/fixtures/hevc10-ac3/index.mkv`.
Fixture SHA-256: `2a84b2eed59a97e67ba49388d048b85966959081013555c6146063158c4b6c56`.
Chrome 153.0.8010.53. Runtime hashes, browser identity, launch gate, states,
raw process/native counters and served override acknowledgements are in
[cpu-01/result.json](cpu-01/result.json).

One gated Chrome launch, fresh contexts, ten-second windows. Order: baseline,
no-scan, quantum512, video-only, baseline, video-only, quantum512, no-scan, baseline.
The middle baseline failed before measurement; the other eight windows passed.
Medians below are descriptive, with two accepted observations per arm, not
confidence intervals or evidence of fresh-launch reproducibility.
CPU is percent of one core; MIPS is renderer instructions per wall second.

| Arm | Accepted windows | Whole Chrome CPU | Renderer CPU | Renderer MIPS | Renderer active GHz |
| --- | ---: | ---: | ---: | ---: | ---: |
| baseline | 2 | 28.49 | 14.42 | 156.20 | 1.24 |
| no-scan | 2 | 28.45 | 14.41 | 153.44 | 1.20 |
| quantum512 | 2 | 25.42 | 12.82 | 151.53 | 1.41 |
| video-only | 2 | 17.41 | 4.76 | 45.07 | 1.29 |

- **Whole audio-path removal:** total CPU 28.49 → 17.41%, renderer 14.42 →
  4.76%, audio-service process 0.771 → 0.035%. Renderer instructions
  156.20 → 45.07 MIPS, a 71.1% reduction. Native video remains the same element
  and continues at 30 fps. The 11.09 total CPU-point difference also includes
  about 0.74 points of GPU-process variation; it is not an exact audio CPU budget.
  Renderer plus separate audio-service differences total about 10.40 points.
- **Skip metadata scan only:** total CPU 28.45% versus baseline 28.49%; renderer
  instructions decrease about 1.8%. Metadata production/forwarding and PCM
  copying remain. This does not support a large CPU bottleneck in that scan.
- **512-frame versus 128-frame quanta:** total CPU median 25.42%, but renderer
  instructions decrease only about 3.0%. Active frequency differs, and the GPU
  process also varies. Do not call the 3.07-point total difference a measured
  callback-dispatch cost. Actual quanta were acknowledged/checked.

All eight accepted windows had zero new video drops, zero new audio underruns,
no sync corrections, stable process IDs and continuous foreground playback.
The audio arms consumed over 470,000 frames per window, had zero mpv video tracks,
and finished within 50 ms audio/video error. Correctness used marked 440/880 Hz
stereo audio. These are short constant-rate checks, not full lifecycle qualification.

## Separate instrumented CPU attribution

[Trace result](trace-01/result.json), [analysis](trace-01/trace-attribution.json),
[raw trace](trace-01/trace.json). This is a **separate profile**, not a partition
of the unprofiled 28.49% value. Profiling raises/changes CPU; do not scale these
shares onto the unprofiled run or subtract profile numbers from that run.

OS per-thread user+system CPU was measured over 12.267 seconds. Chrome's
thread clocks identify author callbacks and explicit pump/event regions.
Nested intervals are unioned, never added twice. Sleeping/futex wall time is
excluded. Author execution includes the V8 entry wrapper and tracing costs;
it is not a pure-JavaScript instruction measurement.

| Disjoint renderer component | CPU milliseconds | Percent of one core, during profile |
| --- | ---: | ---: |
| Main thread: shared player/control/presentation | 376.73 | 3.07% |
| Browser worklet graph/runtime, plus boundary remainder | 309.69 | 2.52% |
| Web Audio output-device thread | 211.25 | 1.72% |
| Wasm/unmapped dedicated workers; codec vs runtime unresolved | 268.69 | 2.19% |
| Other renderer threads: video, IO, compositor, trace and runtime | 608.08 | 4.96% |
| Worklet author execution, including V8 call wrapper | 171.22 | 1.40% |
| mpv bridge worker (all work) | 232.29 | 1.89% |
| **Renderer total from OS thread counters** | **2177.95** | **17.75%** |

The bridge worker's 1.89 points split into approximately **0.36 PCM pumping**
(PCM/metadata copies and feedback), **0.51 mpv event fetch/parse/dispatch**, and
**1.03 other bridge/runtime/boundary work**. Marker overhead is included; these
are not guaranteed removable savings. The trace has 4,152 CPU-clock-bearing attribution markers, including the
pump/event boundaries and worker/window markers.

Worklet author execution is about **7.9% of this renderer CPU**, while the entire
worklet thread is about **22.1%**. The output-device thread is separate. This
supports a distributed audio-pipeline cost, not a claim that every audio CPU
cycle occurs inside our worklet callback.

Five busy Wasm workers did not service the identification callbacks within the
two-second timeout. OS counters still capture their CPU. Five otherwise unmapped
dedicated-worker threads consumed 266.57 ms; three mapped idle Wasm workers
consumed about 2.1 ms. The correspondence to the busy mpv pthread pool is an
inference from the worker inventory; the decoder, demux, AO/filter and runtime
functions within that cost are **not separately attributed**. The main-thread
bucket also mixes audio and video/control/presentation work.

CPU accounting coverage: renderer thread counters total 2177.951 ms versus
2206.326 ms in a slightly wider 12.505-second CDP process bracket,
**98.71% coverage**. The remaining
28.375 ms stays an uncovered/boundary remainder, not decoder or
worklet cost. No renderer thread turnover or lookup failures occurred. Other
processes did have thread turnover, so their native thread totals are not used
as complete budgets. The Chrome trace alone covers only 1898.57 ms;
this is why the independent OS thread counters matter.

The profile had zero new video drops (one pre-window drop), zero underruns,
zero sync corrections, continuous playback and no player errors. Two rounds of
worker-identification timeouts lengthened the intended eight-second capture to
about twelve seconds. These are waits, not twelve seconds of decoder CPU.

## Exclusions and interpretation

- `check-01`: Playwright request interception did not deliver the modified worklet;
  acknowledgement timed out. Replaced by an actual private proxy server.
- `check-02`: baseline, quantum512 and video-only passed. No-scan had video drops,
  despite valid audio. Retained and excluded; no cause established.
- `check-03`: only no-scan retried, passed. Its hashes match the CPU runtime.
- `cpu-01`: middle baseline failed during setup with `Selective PCM timestamp
  timeout`, so no CPU from that case was accepted. The harness exits nonzero
  and retains the failure instead of silently publishing all trials as passing.
- `trace-01`: a separate profile-only launch supplied attribution after the
  interrupted baseline sequence; it did not repeat the CPU comparison campaign.

Do not add the whole-path removal effect, the worklet profile, and historical
AC-3-versus-PCM decode differences. Those overlap and use different observations.
Do not call MIPS a universally normalized CPU percentage or infer P/E residency
from average active frequency.

The worklet metadata scan and callback count are small instruction contributors
in these controlled contrasts. The broader transport/runtime/browser audio path
is where the remaining cost sits. Transcoding can bypass several of these layers
at once, so its benefit must not be credited solely to removal of AudioWorklet.
No production routing, README performance cells or existing EOF edits changed.

## Reproduction and counter semantics

See [experiment instructions](../../experiments/audio-cost-attribution/README.md).
The exact harness/overrides used are copied into each result directory. Analysis:

```sh
python3 experiments/audio-cost-attribution/analyze.py results/audio-cost-attribution/cpu-01
python3 experiments/audio-cost-attribution/analyze.py results/audio-cost-attribution/trace-01
```

macOS `proc_threadinfo` times are nanoseconds, as implemented in
[Apple's fill_taskthreadinfo](https://github.com/apple-oss-distributions/xnu/blob/main/osfmk/kern/bsd_kern.c).
Thread IDs use `PROC_PIDLISTTHREADIDS` and `PROC_PIDTHREADID64INFO`; see
[Apple's proc_info implementation](https://github.com/apple-oss-distributions/xnu/blob/main/bsd/kern/proc_info.c).
The thread helper performs no Mach-timebase conversion on these nanoseconds.
