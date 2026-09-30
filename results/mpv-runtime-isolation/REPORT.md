# Selective mpv runtime isolation

## Decoder substitution and worker polling

The frozen production HEVC10/AC3 selective route is compared with (a) the mpv service reopened on predecoded float32 PCM inside a matching MKV, leaving native video on the original source, and (b) the original AC3 with only the engine-worker polling interval changed from 10 to 40 ms. The native binary and production files remain unchanged. The PCM file retains all 1,080 identical HEVC packet hashes and timestamps, but only mpv's audio input is replaced. The PCM decoder property was observed as pcm_f32le; native video remains browser-owned.

| Diagnostic arm | Renderer million instructions / s | Renderer effective active GHz | Worker ticks / 10 s | Frames / drops |
| --- | ---: | ---: | ---: | ---: |
| ac3 | 178.17 | 1.94 | 840 | 300 / 0 |
| pcm | 160.74 | 1.28 | 817 | 300 / 0 |
| pump40 | 166.93 | 1.28 | 225 | 300 / 0 |

All three arms passed the short steady-playback gates, with no new audio underruns, no drift corrections and no selected mpv video track. Both original and PCM sources were fully cached before the timed window; IO read/fetched-byte counters did not advance. Separate correctness contexts verified the stereo markers and the worker patch marker. One fixed-order window per arm, 5-second warmup and 10-second measurement, in one startup-gated Chrome. No V8 CPU profiler or external load generator.

Predecoding removes approximately 10% of renderer instructions here, so compressed AC3 decoding is not the dominant whole-route cost. This is not an exact decoder-function attribution: PCM packets, sample layout and buffer work differ. Slower polling reduces actual worker ticks by 73% but only about 6% of renderer instructions. Neither is the large fix initially suspected. CPU percentages are retained in the raw results but are not used for savings claims: active execution rates changed significantly across these arms.

The mpv audio push thread in build/sources/mpv/audio/out/buffer.c uses blocking condition waits; its fallback refill timeout is device_buffer/sample_rate/4, about 42.7 ms for 8192 frames at 48 kHz. Emscripten pthreads use Wasm atomic waits on workers. These sources do not establish a busy-spin diagnosis.

## Harness issue retained

check-01 passed baseline and PCM, then failed initialization in the first worker override because the synthetic response omitted cross-origin isolation headers. check-02 restores those response headers and passes the 40 ms variant, observing diagnosticPumpMs=40. The CPU run uses the corrected override and retains its exact worker source. The failed attempt is preserved and excluded from performance evidence.

The 40 ms interval is an isolated prototype, not a shipped change. These short checks do not qualify long playback, seeks/rates near EOF, background stalls or arbitrary sources. No production behavior or README measurements were modified.

## Remove the mpv worker tree and isolate EOF observation

A second startup-gated launch compares unchanged AC3, replacement of the entire mpv worker tree by a synthetic PCM producer feeding the unchanged selective worklet/controller, destruction of the entire audio service while retaining native video/remux, and original AC3 with only its continuously rearmed EOF requestVideoFrameCallback cancelled. All arms start at source time 3 s and warm for 5 s before a 10-second window. CPU percentages again span different effective processor speeds; instruction rates are the primary diagnostic here.

| Arm | Renderer million instructions / s | Effective active GHz | Whole Chrome CPU | Frames / drops |
| --- | ---: | ---: | ---: | ---: |
| full | 172.83 | 1.24 | 29.16% | 300 / 0 |
| synthetic-pcm | 133.71 | 1.19 | 28.99% | 300 / 0 |
| video-only | 45.83 | 1.71 | 10.94% | 300 / 0 |
| no-eof | 154.22 | 1.81 | 16.16% | 300 / 0 |

All windows passed the short progression/frame/error gates. Audio arms had no new underruns and no selected mpv video tracks. The synthetic replacement first passed a separate 440/880 Hz stereo and timestamp-derived sync check. It is an isolation signal, not production media decoding.

The synthetic producer computes two sine samples per frame, fills PTS/rate metadata and pumps every 10 ms. Its own work is included in the 133.71 million instructions/second result. Therefore the 39.12 million difference is an engine-versus-synthetic-producer comparison, NOT an exact measurement of all mpv instructions. Likewise the 87.88 million difference between synthetic and video-only includes that producer as well as the output graph, timing, controller and EOF callback; it must not all be assigned to AudioWorklet internals. This bounds what this intervention can establish.

Cancelling the EOF callback in otherwise unchanged real-AC3 playback saves 18.61 million renderer instructions/second (about 11% in this block). The full-to-no-EOF whole-Chrome CPU difference is much larger, but active processor speed and GPU CPU also change, so it is not a valid pure callback saving. The callback currently re-registers itself on every native video frame solely to set the drain flag near duration-0.2 seconds. Removing it outright is not a production fix: EOF/drain handling must be preserved and tested. The existing 250 ms drift observer is a candidate place for a bounded EOF check, subject to timing and drain qualification.

## What is established, and what remains

- Actual deployed Wasm compressed decoding is not the dominant whole-renderer cost in this fixture: the float-PCM substitution keeps roughly 90% of renderer instruction rate. This is stronger than the earlier native-FFmpeg comparison but still not a function-level decoder profile.
- 10 ms worker polling and per-frame EOF observation are concrete avoidable integration work. Their separate observed reductions are about 6% and 11%; these are not additive production guarantees.
- A substantial route cost persists after these individual interventions. The synthetic experiment does not precisely divide native mpv runtime versus browser PCM processing because the replacement producer has nonzero cost.
- We have not located a single broken FFmpeg loop or proved that the remaining overhead is inevitable. Do not present the current investigation as a complete function-level root cause or justify a wholesale decoder rewrite from it.

Useful next engineering work is to prototype bounded worker polling and EOF observation together, then qualify seeks, rate changes and EOF before considering production changes. Further attribution of the remaining engine/output cost needs a producer-matched control or thread-level work attribution, rather than more raw CPU percentages.

Raw results: tree-check-01/result.json, tree-cpu-01/result.json and tree-cpu-01/counter-summary.json. Exact test source is preserved in each run's harness.mjs; current source is tests/mpv-tree-isolation.mjs. No production files or README cells changed.
