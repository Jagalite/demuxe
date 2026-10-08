# Bounded adaptive Remux buffering

Implemented and exercised on 2026-10-08 against the local dirty checkout. This is fixture qualification, not a packaged release or installed Safari qualification.

## Change

Public Remux playback starts at 8 MiB and grows in place through 16, 32, and 64 MiB when protected GOP data prevents target preparation or filling the configured forward reserve. Safe history eviction and pending appends retain priority. Normal full buffers do not grow. There is no decoder restart or source refetch just to increase the target.

An explicit `buffering.memoryBudget` is the cap, including non-power-of-two values. Setting 8 MiB disables growth. The independent Remux thumbnail child inherits the same cap. Existing serialized child teardown and five-second idle release bound the accepted playback/preview pair to two coded targets: at most 128 MiB by default. Fragment overshoot, source caches, Wasm heaps, and browser decoder memory are additional.

Growth survives seeks and resets on a new open or policy replacement. A budget change invalidates the preview binding/cache. Diagnostics expose the current coded target, maximum, and growth count. At exhaustion, the internal `REMUX_BUFFER_LIMIT` error reaches the public API as a decode failure.

The exhaustion guard handles both a clock stopping one microsecond before the reported end and Chromium stopping about 65 ms early with low media readiness. Neither can wait indefinitely at a fixed cap.

## Browser evidence

Fixture: 24-second, 3840×2160 H.264/AAC MP4, approximately 54 Mb/s, eight-second GOPs. The first GOP is approximately 51.6 MiB.

| Browser | Checks | Result / receipt directory |
| --- | --- | --- |
| Firefox 157 | 4K pthread, JSPI, Asyncify; playing and paused thumbnails | 3/3, `2026-10-08T16-47-02-417Z` |
| WebKit 27.2 | Same 4K runtime matrix | 3/3, `2026-10-08T16-49-38-818Z` |
| Firefox 157 | Small local/remote Remux files, all three runtimes | 6/6, `2026-10-08T16-51-30-644Z` |
| WebKit 27.2 | Same small-file matrix | 6/6, `2026-10-08T16-52-26-821Z` |
| Chromium 152 in T3/Electron | Final guard: default-budget 4K and explicit 8 MiB rejection | 2/2, `2026-10-08T16-54-59-116Z` |
| Firefox 157 | 4K pthread smoke after the final low-readiness guard | Pass, `2026-10-08T16-57-04-278Z` |
| WebKit 27.2 | Same final-guard smoke | Pass, `2026-10-08T16-57-40-838Z` |

Directories are under `results/preview-route-alignment/`. The full runtime matrices and small-file checks preceded the last fixed-cap low-readiness guard; the three-browser smoke checks exercised that final guard version.

Successful 4K runs advanced beyond 23 seconds, returned green 160×90 images at source time 10 seconds, and reported no playback errors. The primary target grew 8→16→32→64 MiB. Peak coded accounting was 67,954,341 bytes (about 64.8 MiB), showing the documented fragment overshoot. Traces verified no thumbnail-induced primary seek, no more than one preview child, bounded targets, and completed owner teardown. FFmpeg independently checked saved PNG dimensions/colors; served-asset SHA-256 checks passed.

The explicit 8 MiB Chromium test returned a failed thumbnail in about 0.55 seconds and a playback budget error in about 1.62 seconds. Growth remained zero. See `adaptive-explicit-8mib.json`.

## Remaining behavior and scope

Immediate requests issued just after playback starts can be cancelled when the primary briefly buffers. This also reproduced without the unit suite running, so contention alone does not explain it. Those failed first-attempt receipts remain in `2026-10-08T16-42-23-399Z` and `2026-10-08T16-45-28-723Z`. The existing playback-priority cancellation policy is unchanged.

The successful runtime matrix requests the playing thumbnail after the primary reaches six seconds, then verifies a paused request. It proves settled concurrent playback/thumbnail operation, not guaranteed first-request success during startup buffering. Callers must handle cancellation and request again after buffering clears.

This change fixes the coded-budget deadlock. It does not guarantee arbitrary 4K codecs, bitrates, GOP lengths, hardware throughput, or total process memory. GOPs that still cannot progress at the cap fail explicitly. Installed Safari was not exercised.

## Automated validation

Initial implementation focused scheduler, lifecycle, runtime, and buffering checks: 58 passed. Coverage includes growth steps, non-power-of-two caps, forged/stale commands, generation fencing, reuse across seeks, source/policy reset, EOF/pending precedence, and both clock-end boundary cases.

Initial implementation full unit/API gate: 3,551 tests passed, followed by passing consumer type checks. Receipt: `results/api-stability/gate-unit-all-node-1791478721494/result.json`.

Changed generated outputs were compared with a separate TypeScript build, with only SPDX headers excluded from comparison. Public type and behavior inventories include the new maximum-budget diagnostic. Browser receipts identify the actual served files; the Chromium final directory also has a refreshed `verified-source-identity.json`.


## Review follow-up: effective budgets and safe exhaustion

Fixed three reproduced defects:

- Effective diagnostics reported the initial 8 MiB even after growth. Cheap buffering reads and full native snapshots now report the current target in `forwardLimitBytes`, while retaining the configured maximum.
- A gap seek could synchronously change buffering policy, but its continuation used the old byte ceiling. Continuations now combine captured byte accounting with the current policy. Tests cover both raising and lowering the limit, including an actual runtime gap-seek callback.
- The exhaustion guard could fail a still-playable tail within 20 ms of a safe RAP. A positive playable tail now waits; low-readiness stalled output still fails promptly, and safe eviction retains priority.

The three initial regression tests failed before the fixes. Afterward, 69 focused tests and all 3,555 full unit/API tests passed, followed by passing consumer type checks. Full receipt: `results/api-stability/gate-unit-all-node-1791479707100/result.json`.

Fresh live checks against the reviewed implementation:

| Browser | Result / receipt under results/preview-route-alignment |
| --- | --- |
| Chromium 152 / T3 | Default-budget 4K playback and both thumbnails passed; explicit 8 MiB preview failed in 0.75 s and playback in 1.63 s without growth. `2026-10-08T17-15-18-731Z` |
| Firefox 157 / JSPI | 4K playback and both thumbnails passed. `2026-10-08T17-18-12-464Z` |
| WebKit 27.2 / pthread | 4K playback and both thumbnails passed. `2026-10-08T17-18-52-761Z` |

The adaptive verifier additionally checks that effective diagnostics match the actual grown target. Independent image and served-file hash checks passed. These remain settled-playback checks; the playback-priority cancellation behavior described above is unchanged.
