<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# PCM24/ASS and HEVC HLS CPU follow-up

Date: 2026-09-27. Demuxe Auto only, headed Chrome 153.0.8010.53 on macOS arm64. The frozen runtime remains `a563f345`; the current source commit `45e7fc2d` added campaign evidence without changing that runtime. Other player cells retain their earlier evidence.

## PCM24 + external ASS

Published CPU: **19.8% of one core**, median of **19.8311%, 21.3237%, 18.1299%** from one fresh startup-gated launch. All three 20-second windows retained `native-direct-ass`, presented 600 frames with zero new drops, had stable browser process membership, and cleaned up all workers. Post-window screenshots and canvas checks confirmed the expected subtitle marker (19,464 nontransparent pixels). The runtime and fixture match the prior full correctness pass.

These are the fresh values accepted for publication. The earlier 10.95% window remains unexplained and retained; it is not pooled into this median and is not claimed to have been fixed. The low state did not recur. Browser compositor state and platform scheduling/frequency remain hypotheses, not established causes.

Evidence: [fresh raw samples and hashes](../results/cpu-gap-investigation/controlled-2026-09-27T12-37-03.431Z/results.json), [full correctness](../results/head-to-head/auto-main-a563f345-priority12-correctness-20260927-02/summary.json), and [root-cause investigation](../results/cpu-gap-investigation/REPORT.md).

## HEVC HLS fMP4

The authored fixture had 17 segment-start keyframe presentation timestamps shifted 34ms early. Regenerating it with `-hls_segment_options movflags=+skip_sidx` preserves source-relative video PTS; the fixture generator now applies that option to HEVC HLS. All **1,080 video packet payloads and 1,689 audio packet payloads** match the original. This fixes fixture packaging; it changes no production player code or routing.

The separate derived snapshot is `build/head-to-head/assets-cpu-gap-hls-fixed-20260927-01`. The original snapshot is unchanged. [Generation command and encoder version](../results/cpu-gap-publication-20260927/generation.json), [packet validation](../results/cpu-gap-publication-20260927/packet-validation.json), and [snapshot hashes](../results/cpu-gap-publication-20260927/snapshot.json) record its provenance.

[Fresh correctness](../results/head-to-head/hls-hevc-fixed-correctness-20260927-01/summary.json) passed marked video/audio, pause/resume, rate, seeking, end-of-file, and cleanup on `native-direct`.

Published CPU: **14.9% of one core**, median of **15.2655%, 14.9135%, 14.4738%**. [Fresh CPU archive](../results/head-to-head/hls-hevc-fixed-cpu-20260927-01/summary.json): all three windows retained `native-direct`, had stable process membership, presented 600/600/601 frames, reported zero new drops, and cleaned up all workers. Both correctness and CPU archives passed `tests/head-to-head/verify.mjs`.

Snapshot manifest SHA-256: `6614c52aa5f45a282a717c40f0d0020cd199a73125b26d664b09a9159fdacd7c`. The earlier six rejected windows remain archived against the original fixture; they are not included in this median.

## Measurement scope

Whole Chrome process CPU uses one-core percentages, the maintained 150-second hardware-key startup gate, idle observation, five seconds of playback warmup, three 20-second measurement windows, process-turnover checks, and frame-quality gates. No fixed idle subtraction. The PCM run used one startup idle observation with fresh contexts per window; the canonical HLS run also uses its normal per-arm idle observation. Screenshots and canvas reads occur outside CPU windows. These figures are fresh row measurements, not matched CPU-saving claims against historical cells or other players. HEVC's other player cells were not retested on the corrected fixture.
