<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Remaining selective-audio work audit

Audited the retained EOF-observer change with original 10 ms worker polling. This is source inspection plus a 10-second callback-count probe, not another CPU campaign. No production changes were made in this audit. Same HEVC10/AC3 URL fixture; raw before/after and paused snapshots are in result.json, harness in harness.mjs. Playback advanced 480,768 audio frames with no new pre-EOF underruns. The scope is the selective native-video/mpv-audio route; this does not fully audit every codec or browser.

## Concrete observations and next targets

| Work | Observed / source-derived amount | Assessment |
| --- | --- | --- |
| Main-thread latency/status polling | 501 checks over 10 seconds, zero timing posts; 150 more checks while paused for 3 seconds, zero posts | Strongest small cleanup candidate. Outgoing messages are already coalesced, but the timer and latency-property reads remain. Existing timeline deliveries plus AudioContext state changes could handle most refreshes, with a slower device-latency fallback. Must preserve immediate resume/suspend and device-change behavior. CPU saving is not measured. |
| Timeline output messages | 470 over 10 seconds (about 47/s at 48 kHz) | Each invokes getOutputTimestamp and dispatches an output event. Needed for publication, rate boundaries and drift estimation; rate-boundary delivery must not be delayed. Could consolidate periodic status checks around this existing traffic. No evidence that 47/s alone is the dominant cost. |
| PCM and timing metadata | 48k stereo frames/s; 8 bytes PCM plus 16 bytes PTS/rate per frame | Metadata is staged in native code, copied into native ring, copied by JS worker, then scanned for rate boundaries by the worklet. Block/span descriptors are a possible redesign, but must preserve exact PTS discontinuities, seek generations, rate boundaries and ring ownership. Raw bandwidth is modest: 0.384 MB/s PCM and 0.768 MB/s metadata per transfer. This is not proof of a large bandwidth bottleneck. |
| mpv property/event traffic | 132 worker events: 116 time-pos updates and 16 demuxer-cache-state updates during the 10-second window | Native event conversion/JSON, worker parsing and message delivery continue even though browser video owns the presentation clock. time-pos is still used for seek convergence; cache state is diagnostic. Narrower steady-state subscriptions are a candidate, not an established bug. |
| Worker diagnostics | 48 messages over 10 seconds; 15 more during 3 seconds paused | Small but persistent work. On-demand or less frequent paused diagnostics could reduce it. CPU saving is unmeasured. |
| Paused audio output | AudioContext remains running; latency and diagnostics polling continue | Candidate for idle-resource improvement, distinct from playing CPU. Suspending safely must preserve fades, epoch acknowledgement, paused seeks and resume publication. No change made. |
| I/O compatibility fallback | web/io-worker.js uses 2 ms polling if Atomics.waitAsync is unavailable | Potentially 500 timer callbacks/s per I/O worker on that fallback. The capability branch was source-audited, not separately browser-qualified in this probe. Event-driven waitAsync path otherwise waits/notifies. |

## What this audit does not find

- No duplicated mpv video decoding in the selective route.
- The worklet's scanned cursor advances through newly published samples. It does not rescan all 8192 samples on every render callback.
- mpv's AO thread uses blocking condition waits, not a demonstrated busy-spin loop.
- The timestamp history is capped at 300 entries; drift observation runs four times/s. Diagnostics percentiles are cached until new observations. These are bounded work, not unbounded growth.
- The connected analyser is not evidence of continuously calculating FFTs. There is no analyser read in the selective steady-state controller; runtime cost of keeping the node connected remains unisolated.
- Audio I/O reads, requests and fetched bytes did not increase in this steady window. Duplicate source handling/startup costs should not be mistaken for ongoing network traffic here.

## Prior measurements and boundaries

The earlier compressed-AC3 versus predecoded-PCM substitution retained roughly 90% of renderer instructions. That suggests the decoder is not the whole-route dominant cost for this fixture, but packet layout and buffering also changed. The synthetic-producer experiment did not isolate pure AudioWorklet cost. See [runtime isolation](../../mpv-runtime-isolation/REPORT.md).

The 40 ms polling reduction was reverted after reproducing starvation. Keep 10 ms data pumping while optimizing independent status/diagnostic work first. Do not claim the earlier combined-patch CPU reduction for the retained EOF-only change. The previous dropped-video-frame window and short-tail/startup timeouts remain unresolved; this audit does not give the remaining path an all-clear.
