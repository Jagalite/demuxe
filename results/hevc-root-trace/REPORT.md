# HEVC / AC-3 root-cause investigation, 2026-09-26

Runtime: frozen `build/head-to-head/assets-hevc10-ac3-bafdb3f3-20260926-01`, the same asset snapshot as the published 30.8% Auto retest. Fixture, URL input and production route unchanged. No production edits. This investigation uses bounded diagnostic probes, not a new benchmark campaign or README replacement.

## Established published baseline

The accepted retest has roughly 16.6% renderer CPU, 13.2% GPU-process CPU, 0.4% browser and 0.5% audio service. All three windows have zero sync soft corrections, zero rate transitions, zero pre-EOF underruns, and no selected mpv video track. Persistent drift correction therefore does not explain this run. Audio-only worker code returns before all video rendering. Its native AO and decoder threads use blocking atomic waits; a profile full of `emscripten_futex_wait` is not evidence of busy spinning.

## Profiling trap

Run 03 observed renderer 15.27% and GPU 11.67% before V8 CPU profiling; with profiling enabled these changed to 104.21% and 4.38%. Thus sampled decoder/JS profiles do not reproduce the original execution cost and must not be used as quantitative attribution. Run 01 is retained but has the same limitation. Run 02 failed before playback because the exploratory script accidentally used a nonexistent asset directory; retained as failed evidence.

Run 04 used task tracing without the V8 sampling profiler. Renderer/GPU CPU remained similar: 16.38%/12.20% before, 16.93%/11.59% during. There were two dropped frames during tracing. Browser-process CPU is startup-contaminated in these short probes (the 150-second gate was deliberately omitted); whole-process totals are not comparable to the published median.

The task trace identifies native video presentation, CoreAnimation layer commits, the realtime AudioWorklet, and the PCM worker pump. Over about eight seconds the selective worklet callback used 66 ms of traced thread CPU, and the PCM worker callback used 73 ms. These callback costs alone do not explain the full renderer share. Trace events nest and do not capture every native thread's lifetime; totals cannot be reconstructed by adding all listed durations. There is no isolated evidence of an AC-3 codec-specific hotspot.

## Confirmed avoidable mechanism: continuous EOF frame callbacks

`NativeMpvAudio` continually requests video-frame callbacks solely to set the EOF drain flag in the final 200 ms. Run 05 cancels the pending callback after startup while keeping the same video and selective audio running. This is a mid-playback diagnostic ablation, not an EOF-correct production fix.

The task-trace count of complete `ProxyMain::BeginMainFrame` events falls from 484 in run 04 to 23 in run 05 (about 60/s to 3/s). GPU presentation remains at video cadence (242 versus 244 swaps). In the within-run CPU observations, renderer CPU changes from 14.78% to 13.85%, GPU from 10.93% to 11.63%. Both windows present 240 frames with zero drops; tracing overhead and short-window noise limit CPU conclusions. Eliminating the callback substantially reduces renderer scheduling but does not collapse the main performance gap.

A suitable focused optimization is to arm frame-accurate EOF observation only near the end, preserving seek, pause/resume, rate and short-clip behavior. Do not simply delete the drain signal.

## Remaining uncertainty

Run 06 retains native GPU and renderer stacks. They show native presentation/IOSurface/VideoToolbox callbacks and largely waiting mpv workers, with stripped Chrome symbols limiting deeper attribution. No full root cause accounting for all 30.8% has been established. The evidence supports browser presentation plus audio-service coordination costs, with one small confirmed scheduling inefficiency; it does not justify blaming AC-3 decode, claiming the route is software-video playback, or proposing a speculative mpv decoder change.
