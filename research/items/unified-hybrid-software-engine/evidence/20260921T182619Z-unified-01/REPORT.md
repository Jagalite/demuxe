<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Unified Hybrid and Software engine

## Decision

Pursue a single full engine asset with selectable Hybrid and Software modes. The isolated player prototype works with a small mode-dependent mpv presentation adapter patch and JavaScript asset/cache changes. **No FFmpeg source, codec-registration or decoder-algorithm changes were needed.** Codec splitting, dynamic linking and shared live memory remain deferred.

This is an executed lab integration, not a shipping/default-route change. Production integration remains a separate maintained-source and packaging task.

## Size and implementation

| Engine | Raw bytes | gzip-6 bytes |
| --- | ---: | ---: |
| Existing full Hybrid | 22,064,233 | 8,128,413 |
| Existing full Software | 21,427,447 | 7,945,242 |
| Unified, used by both modes | 22,064,704 | 8,128,757 |

Combined compressed engine bytes fall from **16,073,655 to 8,128,757 (49.43% less)**. The unified binary is only 471 raw bytes / 344 gzip bytes larger than full Hybrid. Software-only users load about 2.31% more gzip bytes than the previous full Software engine. First use of one engine is therefore not inherently smaller or faster.

Hybrid already linked the full Software FFmpeg libraries. Its existing browser-decoder enable switch leaves normal mpv Software decoding active when disabled. The native patch adds 15 lines and replaces two in the existing retained VO adapter: skip retained-only subtitle/frame callbacks in Software, and clear ROTATE90 on a per-VO driver copy for Software so mpv applies its existing pixel rotation. Hybrid retains its presenter rotation. The original const driver is not mutated.

Two worker imports now target one engine-unified URL. The per-Player preparation cache coalesces Hybrid and Software requests to one fetch, one compilation and one WebAssembly.Module. On-demand opening initializes the same cache, allowing source replacement and fallback to reuse code even under HTTP no-store. Each mode still creates a fresh instance, heap, worker pool and presenter; recovery still reopens the source. No shared-memory or seamless-switching benefit is claimed.

See [integration.patch](integration.patch) in the run directory and tests/REVIEW.md for the implementation and production-port boundaries. The run contains the actual compiled candidate.

## Correctness

Chrome Hybrid and explicit Software, plus Firefox explicit Software, passed the user's HEVC file. H.264/AAC/ASS passed Chrome Hybrid/Software and Firefox Software. Verified 90-degree display-matrix fixtures passed Chrome Hybrid/Software and Firefox Software, including seek and subtitle checks. Successful trials include forward/backward seek, pause/resume, source replacement, audio progress, synthetic tone checks, and worker/process teardown. Automatic Chrome Hybrid trials injected a runtime failure and verified actual Software recovery with advancing audio.

All 22 completed picture comparisons passed the independent host-FFmpeg RGB oracle and inverted adverse control. Where a new-run matched baseline exists, candidate-to-baseline image MAE is exactly zero. Five of those comparisons are an initial nonrotated control generated while preparing the rotation fixture; actual rotation qualification uses only rotation90. This is bounded H.264/HEVC/rotation coverage, not all-codec, HDR, streaming or endurance qualification.

Every successful candidate trial asserts exactly one unified engine download and one engine compilation, and no old Hybrid/Software Wasm requests. All six accepted candidate prepare-all trials marked both modes ready after one engine request and compilation. Earlier focus-invalidated timing attempts remain excluded. Four separate cache contract controls cover concurrent requests, a shared HTTP failure, destroy during fetch, and a late compilation after destroy. The last must not repopulate the cache.

## Timing

Qualified paired runs use aggregate gzip Wasm bandwidth of 10 Mbps plus an 80 ms initial response delay. JS, fonts and the local media are not paced. Fresh browser profiles and HTTP no-store are used; OS caches are not flushed. Browser launch is excluded. Selection measures advancing media time, not exact first-photon latency.

| Browser / scenario | Baseline median | Unified median | Reduction |
| --- | ---: | ---: | ---: |
| chrome / performance / local | 1.028 s | 1.030 s | -0.2% |
| chrome / policy / 10mbps | 14.589 s | 8.132 s | 44.3% |
| chrome / recovery / 10mbps | 7.834 s | 0.601 s | 92.3% |
| firefox / performance / local | 1.534 s | 1.564 s | -1.9% |
| firefox / policy / 10mbps | 24.442 s | 9.419 s | 61.5% |

For Firefox policy rows, the metric is preparation start through playback progress, including any original 15-second preparation timeout and Software refetch; it is not completed all-engine preparation time. Chrome policy rows measure completed preparation. See FIREFOX-TIMEOUT-AMENDMENT.md and per-trial preparationStatuses.

The predeclared matrix contains 22 successful trials: three alternating pairs per browser for prepare-all, three Chrome recovery pairs, and one local first-use pair per browser. Local single pairs are regression screens, not reliable speedup estimates. performance-analysis.json preserves selection/preparation totals, paired ranges and transfer counts. The on-demand cache also changes fetch/compile scheduling compared with the baseline streaming instantiation path; the local single pairs check that combined implementation, not binary layout alone. Already-cached repeat visits are not measured. Small samples and a simulated network limit generalization; memory/CPU/power benefits are not established.

## Repository checks

- python3 scripts/check-licenses.py: exit 1; see check-licenses-check.log.
- python3 scripts/research.py verify: exit -15; see research-check.log.

The license failures are in the unrelated mpv-subtitle-service experiment and captures. Research verification was stopped after independently confirming the existing preview-research campaign schema blocker; see research-preflight-blocker.json. These repository-wide checks are separate from the run-specific playback, cache, binary and teardown validation. Unrelated failures are not repaired by this experiment.

## Preserved failures and limits

- An initial forced-Hybrid test incorrectly expected automatic fallback. The test was corrected to automatic mode; the failed original remains.
- The first rotate metadata command produced no display matrix. A new fixture uses the host FFmpeg display_rotation input option and its 90-degree matrix is explicitly verified. Original nonrotated files/results remain.
- Firefox foreground setup and competing Chrome runs caused rejected trials. Firefox focusing was made explicit before measurements; no failed foreground sample is used as a performance win.
- A Firefox baseline browser closed unexpectedly during repeat-open. Its cause remains unconfirmed; a diagnostic retry completed and exposed the preparation timeout/refetch path. The failed attempt remains outside the accepted pairs.
- The first Node cache test counted an internal Node Response/undici Wasm compilation. Instrumentation was narrowed to the exact probe module, while independently asserting actual engine-fetch count.
- The prototype edits only the frozen lab runtime's generated JavaScript. Production work must port cache logic to maintained TypeScript, add a unified build/deployment target and immutable asset identity, and represent shared preparation progress/bytes once. Current logical alias reports contain duplicate byte values; measured transfer uses unique HTTP requests.
- Shared-fetch failure and cancellation are tested. Firefox default-timeout behavior is measured as recorded above; comprehensive preparation timeout/retry policy is not qualified. Multi-Player/tab reuse, experimental YUV and broader release behavior are outside scope.

## Evidence and reproduction

The run PLAN.md predates builds and measurements. build-commands.json, change-summary.json, sizes.json, pictures.json, cache-contract.json, per-trial result.json files, validation.json and manifest.json capture inputs, execution and acceptance. tests/REPRODUCE.md documents replay in a new run. Historical granular-engine-loading runs were not modified. The user's MKV remains outside the repository. Original notices and fixture provenance are described in NOTICES.md.
