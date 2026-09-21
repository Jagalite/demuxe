<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Production pipeline integration and qualification

Base main: `213dd212a3726ee67634d9c907f9ea2361559b09`. The working checkout was fetched and fast-forward checked before changes. The commit candidate excludes unrelated preparation, preflight, subtitle-service and research edits. Release publication remains pending.

Exact local package SHA-256: `d6ff389201a9a873c9941ddecea7d3213ac9d47b0a38fce4c1f9f07af961dcce`. The two remux wrappers were relinked from the scoped source against the existing pinned pthread/no-pthread FFmpeg libraries. Hybrid/Software artifacts were reused. This is not a clean tagged release rebuild. Frozen source, runtime and package snapshots are indexed in manifest.json.

## Decisions

| Item | Production disposition | Boundary |
|---|---|---|
| R005 | Worker owner by capability, with window fallback | Existing scheduler reused; separate FFmpeg and range workers; direct transferable payloads; main thread owns the video element. Audio adaptation remains on its existing owner. |
| R059 | Conditional default before local track-selection remux | Qualified immutable AVC + two AAC ordinary MP4; unchanged selected samples, same-size metadata view. Native file destination, not an MSE fragment producer. Remote/other profiles fall back. |
| R132 | Producer-callback adapter implemented and qualified; not default | Complete proven samples only; current FFmpeg internally buffers its fragment, so no earlier-input or delayed-tail win is claimed. Progressive copying did not improve on separate delivery. |
| R133 | Conditional default for large owned MP4 batches | At least 128 KiB, 2–32 callback buffers, packet-copy path; small/unknown batches retain gathering. Additional append calls are charged. |
| R162 | Existing D09/D10 repairs requalified; patch constructor deferred | None of 120 maintained output moofs matched the experiment's 104-byte single-sample shape. A patch pass after FFmpeg construction cannot replace its cost. No generic muxer or speculative continuity repair added. |

The intended supported fragment chain is R006/ordinary FFmpeg → bounded separate buffers (or internal progressive qualification mode) → R005 → MediaSourceHandle → video. R059 is an alternative browser file route. Forcing ordinary MP4 views through MSE would require a new construction contract; it is not treated as a composable savings multiplier.

## Final correctness and package checks

- 134 focused Native/streaming/source/plan/fragment contracts passed, plus the final focused rerun. Thirteen licensing tests and six release-verifier tests passed in the scoped tree.
- Exact package: eleven Chrome non-isolated JSPI cases and nine isolated Firefox cases passed, including real pending-read cancellation with an initialization-only negative control, source identity changes, seeks, replacement, EOF and destroy.
- Worker owner: paired window/worker idle, 35 ms / 50 ms main-thread CPU contention, and 40 ms delayed range-response cases passed on both JSPI and pthread producers. Explicit bootstrap and SourceBuffer-admission fallbacks, outstanding pthread-read destroy, stale response, runtime owner error, and producer-failure recovery/resumed element playback passed.
- Selected view: both moov positions retain exact decoded video/PCM and file length; marked selected browser audio, seek/EOF, metadata-phase cancellation, source replacement, stale completion and destroy passed.
- Actual large producer output: separate and progressive delivery decode to the original TS video/PCM. Progressive packets and timing match the separate-output control. D09/D10 packets/timing and decoded output match the maintained ordinary-remux control.
- All 36 combined main/candidate runs reached the same rendered pixel hash after seek. Tests also record drops, owner/producer diagnostics, queue/append counts, cleanup and main-thread task time.

## Combined current-main comparison

Three alternating pairs per workload/load on the same Chrome build. Startup includes Player import/construction and source acquisition for local MP4; current remux Wasm is shared with the main-source baseline to isolate maintained JavaScript ownership/construction changes. OS caches were not flushed. The contention workload is a declared synthetic main-thread CPU load, not a claim about every real UI. Delayed range responses pace actual ingress, not an invented delay inside an already-materialized fragment.

| Workload | Load ms / 50 ms | Main startup ms | Candidate startup ms | Main seek ms | Candidate seek ms |
|---|---:|---:|---:|---:|---:|
| mp4 | 0 | 434.3 | 316.3 | 62.5 | 1.8 |
| mp4 | 35 | 315.2 | 214.1 | 153.3 | 1.1 |
| fmp4 | 0 | 137.0 | 152.8 | 80.0 | 60.2 |
| fmp4 | 35 | 458.0 | 405.2 | 240.4 | 191.0 |
| remux | 0 | 210.4 | 199.1 | 138.0 | 152.7 |
| remux | 35 | 1271.7 | 1254.6 | 839.1 | 759.3 |

These are medians of small samples, not a passed general speedup gate. Idle startup and some seeks regress; loaded seeks can improve. Keep those tradeoffs visible. Normal automatic Native-direct routing is unchanged; the MP4 comparison forces the maintained preparation route to exercise selected-track work. Main-thread task time is CDP TaskDuration; Wasm remux time and copy counters are separate diagnostics, not total machine CPU or physical memory measurements.

## Per-item cost evidence

The development R132/R133 two-pair comparison used real 24-second AVC/AAC TS and the actual Wasm write callback. Before the first seek, each route had produced 2,729,563 bytes. Gathering copied all of those bytes; separate delivery copied only the 1,243-byte initialization batch, while append count rose from 14 to 51. Progressive delivery used 46 appends and copied 2,728,320 additional bytes in the sample-boundary adapter. It is therefore not enabled by default. No gain is claimed for fragments arriving complete or for FFmpeg internal sample availability. The retained development results are `results/fragment-delivery/2026-09-21T20-22-12.132Z/result.json`; final-package identity and lifecycle requalification is separate.

R005 package measurements expose producer-to-consumer dispatch latency separately from append-call-to-updateend latency. The scheduler and producer stay on different workers so synchronous mux work does not block append, eviction or backpressure scheduling. Final per-item owner and selected-view results are linked below; they are not added to combined savings.

## Failures retained and fixes

Development logs retain: a queued-updateend race exposed by progressive seeks; a final mfra trailer initially rejected; nested pthread children surviving abrupt parent teardown; and a stale MediaSourceHandle preventing window fallback. Fixes respectively preserve pending update ownership, validate the complete trailer, shut down the scheduler/children before terminating its parent, and detach srcObject before window fallback. Review additionally restored fallback buffering/generation state and forwarded the scheduler's recovery play request with acknowledgement. Authorization replies have a bounded deadline.

One injected producer-failure teardown check exceeded the 1.5-second observer deadline once. The unchanged recovery path then passed three controlled repetitions; the cause of the one-off delay is unproven. That failure is retained rather than described as a proven browser or environment fault. Final package recovery checks remain distinct from the earlier development run.

Original research histories and historical mutable-source hash mismatches are not rewritten. Production source, exact-package evidence, and release qualification are separate. No release, hardware acceleration, endurance, physical A/V timing, or broad destination/layout admission is asserted.

## Evidence


## Per-item final package measurements

R005: one final-package pair per producer/load, following the retained three-pair development comparison. Latencies are medians of the recorded operations; startup and seek are single-run observations here.

| Producer | Load | Owner | Startup ms | Seek ms | Dispatch median ms | Append median ms | Dropped frames | Cleanup ms |
|---|---|---|---:|---:|---:|---:|---:|---:|
| JSPI | idle | window | 400.8 | 91.8 | 0.10 | 0.05 | 0 | 178.0 |
| JSPI | idle | worker | 172.9 | 103.7 | 0.20 | 0.10 | 0 | 126.0 |
| JSPI | ui | window | 596.6 | 244.3 | 0.15 | 0.10 | 0 | 160.0 |
| JSPI | ui | worker | 241.8 | 190.1 | 0.25 | 0.10 | 0 | 134.0 |
| JSPI | paced-ui | window | 1099.6 | 409.3 | 0.00 | 0.10 | 0 | 124.0 |
| JSPI | paced-ui | worker | 546.8 | 302.2 | 0.10 | 0.10 | 0 | 121.0 |
| pthread | idle | window | 160.0 | 95.1 | 0.06 | 0.08 | 0 | 122.0 |
| pthread | idle | worker | 128.1 | 101.9 | 0.10 | 0.07 | 0 | 131.0 |
| pthread | ui | window | 242.4 | 206.2 | 0.05 | 0.06 | 0 | 122.0 |
| pthread | ui | worker | 243.6 | 138.7 | 0.06 | 0.06 | 0 | 124.0 |
| pthread | paced-ui | window | 591.6 | 405.6 | 0.06 | 0.07 | 0 | 120.0 |
| pthread | paced-ui | worker | 544.3 | 301.5 | 0.10 | 0.11 | 0 | 152.0 |

R059: one final-package pair per moov layout, following the retained three-pair development comparison. All runs detected the selected 880 Hz audio marker. Admission also rejects unequal declared track tails, complex edits and ambiguous automatic audio selection.

| Layout | Route | Startup ms | Seek ms | Cleanup ms |
|---|---|---:|---:|---:|
| front | remux | 455.0 | 57.6 | 1.0 |
| front | view | 166.2 | 2.5 | 1.1 |
| tail | remux | 481.9 | 255.5 | 2.0 |
| tail | view | 86.3 | 4.1 | 1.4 |

The worker fixtures are small enough that complete source fetching can occur during startup; use the separately paced larger combined workload for ingress effects. Dropped-frame counters and progress/EOF assertions are browser evidence, not physical A/V synchronization measurements.

## Result files

- combined: [results/production-pipeline/2026-09-21T21-21-37.056Z/result.json](../../../../results/production-pipeline/2026-09-21T21-21-37.056Z/result.json)
- worker_owner: [results/worker-mse/2026-09-21T21-17-19.590Z/result.json](../../../../results/worker-mse/2026-09-21T21-17-19.590Z/result.json)
- selected_view: [results/selected-mp4-view/2026-09-21T21-18-31.270Z/result.json](../../../../results/selected-mp4-view/2026-09-21T21-18-31.270Z/result.json)
- output_identity_and_existing_repairs: [results/remux-output-identity/2026-09-21T21-19-29.868Z/result.json](../../../../results/remux-output-identity/2026-09-21T21-19-29.868Z/result.json)
- jspi_exact_archive: [results/remux-jspi/2026-09-21T21-18-51.709Z/result.json](../../../../results/remux-jspi/2026-09-21T21-18-51.709Z/result.json)
- firefox_exact_archive: [results/remux-jspi/2026-09-21T21-19-06.360Z/result.json](../../../../results/remux-jspi/2026-09-21T21-19-06.360Z/result.json)
