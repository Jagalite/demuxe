<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Latency timer and audio diagnostics: cost screening

2026-09-26. Current retained EOF-observer change plus restored original 10 ms PCM polling. One fresh headed Chrome launch, completed startup gate, trace stopped before measurements, fresh context per arm. Same HEVC10/AC3 URL fixture, five-second warmup and ten-second measurement. Order: baseline, latency timer disabled, worker diagnostic pushes disabled, baseline. This is a small component-attribution screen, not a player ranking or general optimization qualification.

Only the specified work is disabled. The latency arm clears the existing 20 ms timer after playback starts; the diagnostic arm suppresses only periodic worker diagnostic construction/posting. PCM delivery cadence, mpv property events, timeline/rate-boundary messages, output timestamps and drift control remain unchanged. All arms share the same test-only diagnostic gate and callback counters. Exact worker override, harness, production diff, fixture hash and raw samples are retained.

| Arm | Whole Chrome CPU | Renderer CPU | Renderer M instructions/s | Renderer effective GHz | Latency checks / window | Diagnostic pushes / window |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| baseline | 28.63% | 14.18% | 157.48 | 1.18 | 500 | 49 |
| no-latency-timer | 26.68% | 13.03% | 155.49 | 1.21 | 0 | 48 |
| no-diagnostic-push | 28.98% | 14.39% | 161.06 | 1.17 | 500 | 0 |
| baseline | 25.65% | 12.75% | 157.15 | 1.23 | 500 | 48 |

The two baseline renderer instruction rates average 157.32 million/s. Removing the latency timer produced about 1.2% fewer renderer instructions in its single window. This is a modest signal, not an established total-CPU saving: its 26.68% total CPU lies inside the unchanged baseline range of 25.65–28.63%. Removing diagnostic pushes did not lower renderer instructions or CPU in its single window. That does not prove diagnostics cost nothing or make playback faster; it means this screen supplies no optimization benefit for suppressing them.

All four arms passed: 300 video frames, zero drops, no new audio underruns, stable processes, focus/visibility, native-video-mpv-audio retained, zero mpv video tracks. Device latency stayed unchanged at every sampled point, and instrumentation confirms the intended work was disabled. CPU values are one-core equivalents over all Chrome processes; instruction rates use native counter elapsed time. Effective GHz is an aggregate counter ratio, not core residency.

## Decision

Do not prioritize these two items as explanations for the large selective-audio route cost. The 50/s timer is a possible small cleanup; diagnostic suppression has no demonstrated benefit here. No production scheduling or diagnostic changes were made. The remaining PCM transport, per-sample timestamp/rate metadata, AudioWorklet output, and native runtime work still need cost attribution; this experiment does not identify their individual contributions or establish that they are inefficient. Existing dropped-frame/short-tail issues are not resolved by this screen. No broad CPU campaign or README rewrite was performed.
