<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Finite MediaBunny resource measurements

Date: 2026-10-29. These are measured public-player workloads, not production release qualification or a general performance comparison. The runner is [`test/browser-resources.mjs`](../packages/provider-mediabunny/test/browser-resources.mjs); raw receipts and summaries are under [`qualification/`](../packages/provider-mediabunny/qualification/).

Each of four compositions ran three fresh Chrome browser trials, sequentially. Each trial reused one qualified runtime for three open/play/seek/close cycles: **12 fresh browsers and 36 complete cycles**. Catalog load precedes the first timed open. The fixture is imported encoded data, so no full SDK/generator bundle is loaded in the measured page. Every open uses actual public `Player`/`DemuxeRuntime`, complete inspection, qualified optional acquisition and the existing native owner. Each cycle verifies route, 48 kHz stereo metadata, video progress, confirmed seek1.25, fresh video after seek, and zero worker/object-URL handles after close; it does not independently hash PCM during measurement. Earlier public preview/A/V receipts exercise fresh stereo output on the exact same encoded fixture and worker identities.

The retained [fixture](../packages/provider-mediabunny/qualification/fixtures/avc-aac-320x240.mp4) contains 30 AVC frames at10fps, 320×240, plus150 AAC-LC stereo packets at48 kHz with encoded priming retained. Its provenance and hash are adjacent. One-second forward/backward coded targets and8 MiB coded budget are held fixed. Local and guarded remote compositions use the same bytes. Remote reads pass through Demuxe's RangeReader but responses are fulfilled by Playwright route interception; there is no real HTTP/TLS/network latency or throughput measurement.

The timing observations below predate the session-record retention fix described at the end of this report. They apply to their recorded presenter identities; they do not automatically qualify the changed core.

## Timing observations

Values below are median milliseconds. Cold open has3 observations per row (first open of each fresh runtime); warm open has6; confirmed seek and fresh-after-seek have9. Raw min/median/max and samples are in [`resources-summary.json`](../packages/provider-mediabunny/qualification/resources-summary.json). `open()` measures accepted startup, not first call from browser process launch. Fresh-after-seek measures play request through a video-frame callback strictly beyond target. Complete-file seeks reuse prepared output; incremental seeks acquire a new producer generation. Candidate groups ran in the listed sequence, without cache clearing or randomization. These observations do not establish causal speedups or a universal ranking.

| Composition | First open | Subsequent open | Confirmed seek | Fresh video after seek |
| --- | ---: | ---: | ---: | ---: |
| stream-local | 624.6 | 80.6 | 52.4 | 81.3 |
| mp4-local | 323.8 | 51.2 | 3.2 | 79.4 |
| stream-remote | 453.1 | 82.2 | 53.3 | 78.7 |
| mp4-remote | 410.7 | 52.3 | 3.2 | 79.2 |

The selected worker body is fetched once per runtime:277209bytes for incremental MP4,271115bytes for complete-file MP4, and zero worker-body bytes on each subsequent open in that runtime. Request paths, body bytes, application/module delivery and source responses are retained separately in each receipt. These are uncompressed served response bodies, not total wire transfer or browser cache accounting. No unused codec/container runtime or backup asset is requested by these measured compositions. No independent FFmpeg performance comparison is claimed: this worktree lacks the qualified backup runtime assets, and the installed native FFmpeg cannot start due to its missing x265 library.

## Resource evidence and limits

The runner samples the browser root and descendants every200ms using macOS `ps`, preserving each observed process CPU maximum even when that child exits. CPU deltas span the loaded-app baseline through catalog/cycles/destruction; they exclude browser launch/app import before that baseline and miss processes that live entirely between samples. Whole-browser sampled aggregate RSS peaks range1.02–1.15GB in these runs. Summing process RSS double-counts shared pages; OS media daemons outside the browser tree are excluded. This is not unique physical memory, adapter-only memory, exact peak native allocation or a decoder-capacity claim.

Renderer JS heap is recorded after explicit CDP GC at baseline, active-after-seek, source close and final player/runtime destruction. It excludes worker heaps, native buffers and decoder resources. Closed renderer heap rises across the three cycles; final destroyed heap remains roughly2.33–2.92MB above the loaded-app baseline. Those numbers are retained in the receipts and are **not** classified as a memory-stability pass or attributed to a particular cause.

A separate heap diagnostic captures both an active control and a post-destruction heap, after releasing the measurement driver's own player/runtime/source references. Its receipt is [`resources-heap-diagnostic.json`](../packages/provider-mediabunny/qualification/resources-heap-diagnostic.json), with [`active`](../packages/provider-mediabunny/qualification/resources-active-heap-summary.json) and [`destroyed`](../packages/provider-mediabunny/qualification/resources-destroyed-heap-summary.json) object/path summaries. Active control shows one ProviderRuntime, one RemuxPlayer, one DemuxeRuntime and the associated shared assets/presentation/preview owners. These named object instances disappear after destruction. Worker object counts go from2 to1; the remaining object is the global Worker constructor's prototype, as its strong root path demonstrates. Native DOM-backed subclasses are not all identified by their JavaScript class names, so this count is not a complete actor census. It does not prove all native allocations were reclaimed or explain the retained heap delta. The raw snapshots are local diagnostic artifacts whose hashes are recorded; they are not shipped with the provider. Snapshot capture is excluded from the timing trials and its own run is explicitly diagnostic.

## Reproduction

From `packages/provider-mediabunny`, with the optional test tools installed and a built candidate:

```sh
DEMUXE_PUBLIC_FIXTURE="$PWD/qualification/fixtures/avc-aac-320x240.mp4" \
DEMUXE_PUBLIC_RUNTIME_CANDIDATE=/absolute/path/to/candidate \
DEMUXE_BROWSER_EVIDENCE=/absolute/path/to/receipt.json \
DEMUXE_RESOURCE_TRIALS=3 DEMUXE_RESOURCE_CYCLES=3 \
node test/browser-resources.mjs
```

Add `DEMUXE_TEST_REMOTE=1` for the guarded remote workload. Select the complete-file or incremental candidate explicitly. For a separate diagnostic, use one trial and set `DEMUXE_RESOURCE_HEAP_SNAPSHOT=/absolute/path/to/snapshot`; `.active` and `.destroyed` files are written. Summarize each with `python3 test/summarize-heap.py /absolute/path/to/snapshot.active`. The sampler's tree/clock/retired-process accounting has dedicated tests. All receipts bind source, worker, presenter, harness and sampler hashes and retain hardware/runtime context. The exact timed-run harness is preserved as `qualification/browser-resources-measured.mjs` with its matching `qualification/process-resources.js`; its content hash was checked against all four timed receipts. The current test runner additionally supports the separate heap diagnostic. The archived harness can be run from its existing qualification location; its package/repository paths resolve to the same roots.

Still required before broader performance or release claims: larger/independently authored media, fuller browser/device and concurrency workloads, representative transport conditions, native/worker allocation accounting and memory stability, a maintained qualified FFmpeg/mpv comparison, remaining profile/failure gates and final release assembly. The package stays private and publication guarded.


## Follow-up: warmed session retention identified and fixed

The ten-cycle pre-fix diagnostic found a concrete retention path that the earlier name-only census missed. DOM-backed `Player` and `NativePlayer` instances appear as native `EventTarget` nodes. The improved reader identifies their direct prototype constructors, exercises an active positive control, and respects V8 ephemeron key prerequisites rather than treating a WeakMap value as an unconditional strong root. Dedicated parser tests cover cycles, weak roots, ephemeron self-retention, native constructor identity and malformed tables.

The first-to-tenth closed snapshot increases by 1431200 shallow bytes, of which 1285424 are V8 `code` nodes (89.8%). A separate thirty-cycle pre-fix diagnostic shows growth slowing: the twentieth-to-thirtieth snapshot increases by 62704 shallow bytes. Those are snapshot classifications, not exact retained/native size or a general plateau/capacity proof. The smaller data additions and paths are retained in `qualification/heap-*-shallow-diff.json`.

The actor retention path is independent of the aggregate code growth: an allocation site's cached object-literal shape holds an accessor pair, whose error getter closes over the player and session. `registerSession` installs these accessors on a session originally created as an object literal. The cached boilerplate's backend/surface slots are holes, but its accessor shape still references the getter closure. A pre-fix ten-cycle and thirty-cycle destroyed snapshot each retain the last Player/NativePlayer and associated runtime owners through that path.

`Player.create` now constructs its internal session as a null-prototype dictionary before registration. It preserves the same backend/surface fields, fault getter and retirement semantics, while avoiding the object-literal allocation site's per-session accessor shape. The changed core's active control still sees the expected Player, NativePlayer, runtime, remux, shared-assets and preview/presentation owners; after destruction all named owners are absent. Only the global Worker prototype remains in the Worker census. The new `test/browser-retained-owners.mjs` automates ten real public cycles, active positive controls, source/worker/presenter/parser hash recording and destroyed-owner assertions. The receipt is `qualification/owner-retirement-regression.json`; pre/post snapshots and summaries are separately bound under `qualification/heap-pre-fix-*` and `heap-post-fix-*`. Raw snapshots remain local diagnostic files and their hashes are in the receipts.

This corrects the earlier census limitation; it does not turn all observed heap growth into an application leak or establish full browser/native memory stability. The post-fix public Chrome/Firefox streaming and WebKit complete-file A/V+preview+replacement/concurrency receipts are `qualification/dictionary-public-*.json`. `qualification/dictionary-validation.json` binds the changed source and validation evidence. No provider worker bytes or provider implementation identity changed. The refreshed incremental candidate's source correspondence passes, and generated Python caches are excluded from both npm and preferred-source packaging.


## Earlier changed-core installed candidate

The [earlier installed-candidate receipt](../packages/provider-mediabunny/qualification/installed-resources-current-verification.json) repeats the same three-trial, three-cycle workload after the inspection-owner core change. The application bundle and other served core files come from the isolated installed candidate; all 277 installed core files match its build inventory. Earlier measurements remain historical. These are Chrome 155 synthetic-fixture observations on one host, with route-intercepted remote ranges. Each median combines all nine cycles, including the first and later warmed cycles.

| Input | Worker | Median open (ms) | Median seek-to-fresh-frame (ms) | Peak sampled browser-tree RSS (MiB) | Worker bytes per fresh browser |
| --- | --- | ---: | ---: | ---: | ---: |
| local | MP4 file | 48.4 | 79.7 | 1156.2 | 271417 |
| local | MP4 streaming | 86.4 | 80.9 | 1094.1 | 277207 |
| local | WebM file | 61.3 | 30.3 | 996.3 | 223864 |
| remote | MP4 file | 49.5 | 79.5 | 1148.3 | 271417 |
| remote | MP4 streaming | 85.5 | 81.8 | 1088.9 | 277207 |
| remote | WebM file | 58.0 | 30.0 | 994.0 | 223864 |

RSS sums sampled process resident sets including shared pages and browser overhead; it is not unique memory or a native decoder census. Renderer heap excludes workers and native allocations. These results establish neither general performance nor memory stability and do not constitute release qualification.


## Current streaming-worker candidate

The [current composition receipt](../packages/provider-mediabunny/qualification/stream-final-composition-verification.json) repeats the same three-trial, three-cycle workloads for all three workers after the streaming cancellation fix. Medians combine all nine cycles, including cold and warmed cycles; Chrome 155, one host, synthetic fixtures and intercepted remote ranges remain the scope.

| Input | Worker | Median open (ms) | Median seek-to-fresh-frame (ms) | Peak sampled browser-tree RSS (MiB) | Worker bytes per fresh browser |
| --- | --- | ---: | ---: | ---: | ---: |
| local | MP4 file | 50.9 | 78.5 | 1091.8 | 271417 |
| local | MP4 streaming | 82.1 | 79.5 | 1091.5 | 277830 |
| local | WebM file | 64.7 | 29.9 | 995.4 | 223864 |
| remote | MP4 file | 49.8 | 78.9 | 1155.7 | 271417 |
| remote | MP4 streaming | 82.7 | 79.3 | 1095.7 | 277830 |
| remote | WebM file | 53.3 | 30.0 | 997.0 | 223864 |

The sampled RSS includes shared pages and browser overhead; it is not a unique-memory or decoder-resource census. Renderer heap excludes workers and native allocations. These observations do not establish general performance or memory stability.

## Rebuilt bounded-reader candidate

The [current receipt](../packages/provider-mediabunny/qualification/reader-fix-resource-color-verification.json) refreshes the same serial Chrome workload after the bounded-reader cancellation fix. Each row covers three fresh browser trials and three cycles per trial. Open and seek-to-fresh-frame values are medians across nine cycles; browser RSS is the largest sampled sum across the browser process tree.

| Source | Worker | Open ms | Seek to fresh frame ms | Sampled RSS MiB | Worker bytes per browser |
| --- | --- | ---: | ---: | ---: | ---: |
| Local | MP4 | 50.0 | 78.6 | 1094.7 | 271429 |
| Local | MP4 stream | 81.3 | 79.0 | 1091.0 | 277842 |
| Local | WebM | 61.3 | 30.1 | 996.9 | 223876 |
| Controlled remote | MP4 | 52.6 | 79.4 | 1153.6 | 271429 |
| Controlled remote | MP4 stream | 82.8 | 79.2 | 1091.2 | 277842 |
| Controlled remote | WebM | 55.2 | 30.2 | 993.6 | 223876 |

These are small synthetic fixtures on one Chrome installation. Remote responses are intercepted locally; RSS sums shared pages and may miss peaks, while renderer heap excludes worker and native allocations. The measurements do not establish production performance or memory stability. Earlier worker identities and their measurements are historical.
