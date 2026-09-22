<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Ecosystem proposal evaluation and integration

Current source baseline: `b98aca8670b358b5bad0da6eae1b31930b62c7b9`. All 22 EB proposals evaluated; 19 mapped to existing canonical owners and three distinct mechanisms given new homes.

Executed: 76 existing Node contract checks plus three synthetic boundary probes over maintained code. These are not browser playback, native codec execution, hardware, acoustic A/V or performance qualification. Imported upstream observations remain historical; no upstream implementation was fetched, copied or independently revalidated.

The append probe found retained provisional accounting after a synthetic append failure and conservative byte accounting after simulated eviction. The observed-range seek guard correctly rejects missing data. This supports an accounting follow-up, not a claim of reproduced browser corruption.

All original report bytes, existing parent decisions/stages and history prefixes are preserved. Scoped follow-ups are separate records; completed parent gates do not close them. New reconnect and live-policy items stop at source screening until a concrete consumer exists. Repair accounting remains pending implementation/correctness/performance.

| Outcome | Proposals |
|---|---:|
| followup_required | 5 |
| regression_only | 1 |
| no_new_work_current_scope | 8 |
| deferred_until_trigger | 7 |
| qualification_followup | 1 |

## Per-proposal decisions

### EB01 — Reconcile intended, committed and observed media inventory

Owner: [R005.move-mse-ownership-off-the-window-thread](../../../items/R005.move-mse-ownership-off-the-window-thread/README.md). Outcome: **followup_required**.

Merge into the maintained MSE owner, not R188 verified-source scheduling: destination residency differs from source verification.

Buffered seeking already consults observed media/SourceBuffer ranges and current generation. Append receipts are inserted before appendBuffer; a synchronous failure retains an uncommitted receipt, and browser eviction does not reconcile segment byte accounting. The counter is explicitly an upper bound, so this is an accounting/recovery extension, not demonstrated missing playback.

Next gate or reopening condition: Extend the maintained append owner with bounded intended/committed/failed/observed states only if used for recovery or exact residency reporting. Test synchronous and asynchronous failure, browser eviction, overlapping appends and source replacement in real MSE before measuring avoided work.

Reviewed: `web/native-remux-player.js`, `web/worker-remux-controller.js`.

### EB02 — Evict and refill complete decoding dependency closures

Owner: [R050.evict-on-actual-gop-boundaries-to-preserve-useful-rewind-media](../../../items/R050.evict-on-actual-gop-boundaries-to-preserve-useful-rewind-media/README.md). Outcome: **regression_only**.

R050 owns dependency-safe eviction directly; R005/R132/R133 are affected owners, not independent new mechanisms.

The current pump evicts strictly before a known RAP; R050 already retains real-MSE evidence for the 4.0001 adverse cutoff. Current contract tests cover the same guard. Broader B-frame/preroll refill behavior is not requalified by these Node checks.

Next gate or reopening condition: Keep the strict-before-RAP regression. Reopen only for a reproduced long-GOP/configuration/preroll refill failure in a maintained browser route.

Reviewed: `web/native-remux-player.js`.

### EB03 — Advertise cache capabilities, not one ambiguous buffered value

Owner: [mpv-cache-browser-stream](../../../items/mpv-cache-browser-stream/README.md). Outcome: **no_new_work_current_scope**.

Merge into the existing cache investigation; cue-less index items do not own general cache semantics.

Diagnostics already separate source-cache bytes, mpv demuxer-cache-state, Native buffered/seekable ranges and packet budgets. Native seek readiness checks actual coverage and RAP presence. A new universal readiness enum is not justified by the current API.

Next gate or reopening condition: Retain existing distinct diagnostics. Reopen when a consumer needs a decoder-ready or cross-track readiness contract that these fields cannot express; include sparse-track and missing-audio output witnesses.

Reviewed: `src/internal/wasm-player.ts`, `src/internal/native-player.ts`, `src/internal/buffering.ts`, `web/range-reader.js`.

### EB04 — Budget unique backing allocations separately from logical payload

Owner: [R298.copy-surviving-packets-to-release-oversized-backing-buffers](../../../items/R298.copy-surviving-packets-to-release-oversized-backing-buffers/README.md). Outcome: **no_new_work_current_scope**.

R298 is the direct compaction owner; R047/R100 describe adjacent ownership costs, not a separate allocation-accounting win.

RangeReader charges buffer.byteLength for each retained cache block. The synthetic probe confirms a one-byte view still costs a 1024-byte backing block and an external view survives cache eviction. Existing source-worker copying and bounded blocks do not establish the oversized long-lived packet-slab opportunity required to reopen R298.

Next gate or reopening condition: Keep the compaction stop. Reopen only with a real owner retaining small live slices after its siblings finish, then measure unique backing retention and copy cost; cache counters are not process memory.

Reviewed: `web/range-reader.js`, `web/native-remux-source-worker.js`.

### EB05 — Negotiate resource representation and bounded outstanding ownership

Owner: [R100.transfer-owned-packet-storage-into-webcodecs-chunks](../../../items/R100.transfer-owned-packet-storage-into-webcodecs-chunks/README.md). Outcome: **followup_required**.

Extend R100 ownership at the actual decoder boundary; preserve R028's failed prefilter benefit result and avoid a universal graph engine.

Finite plans describe execution owners; the browser worker bounds outstanding inputs/frames and closes stale outputs once. They do not constitute a general representation/family contract across alternative decoder and presenter adapters. Existing tests exercise mocked decoder ownership, not native/polyfill interoperability.

Next gate or reopening condition: For one concrete new adapter, declare accepted chunk/frame family, format, memory domain, maximum outstanding objects and terminal release. Reject incompatible families and run exhaustion/cancel/source-replacement plus output comparisons before any conversion-cost claim.

Reviewed: `src/internal/playback-plans.ts`, `web/browser-decoder-worker.js`.

### EB06 — Map/import only frames needed for presentation

Owner: [R360.retarget-in-flight-decoding-instead-of-restarting-a-forward-scrub](../../../items/R360.retarget-in-flight-decoding-instead-of-restarting-a-forward-scrub/README.md). Outcome: **no_new_work_current_scope**.

Merge with in-flight retargeting and its existing negative performance result; mapping avoidance is not decode avoidance.

The inspected dedicated worker queues frames and copies on consumer operation 4 rather than on decoder output; generation changes close stale queued frames. Preview jobs cancel/coalesce. This does not qualify every shipped engine or a new lazy GPU presenter, and R360's prior performance gate remains failed.

Next gate or reopening condition: Reopen only when a measured presenter/preview trace shows avoidable mapping of superseded frames; compare total owner cost and required visible output while retaining dependency decoding.

Reviewed: `web/browser-decoder-worker.js`, `src/preview/controller.ts`.

### EB07 — Use coherent native/polyfilled constructor families

Owner: [unified-hybrid-software-engine](../../../items/unified-hybrid-software-engine/README.md). Outcome: **deferred_until_trigger**.

An admission requirement on the unified-engine integration, not a new codec implementation or current failure.

The inspected route uses explicit VideoDecoder/EncodedVideoChunk constructors and explicit Software plans. No native/polyfill family mixing was identified in those owners. Future codec-module integration still needs concrete family identity; the unified engine study remains lab-only.

Next gate or reopening condition: Apply adapter-local family checks if a software WebCodecs adapter is introduced. Reject mixed families before publication and repeat output/fallback qualification; do not install a global shim.

Reviewed: `src/internal/playback-plans.ts`, `src/internal/runtime-capability.ts`, `web/browser-decoder-worker.js`.

### EB08 — Delay mux initialization until actual output configuration is known

Owner: [R091.in-band-video-configuration-changes-with-avc3-and-qualified-hev1](../../../items/R091.in-band-video-configuration-changes-with-avc3-and-qualified-hev1/README.md). Outcome: **deferred_until_trigger**.

R091 owns configuration epochs. R059 payload projection does not own encoder output initialization.

The remuxer inspects actual AAC packets when extradata is absent, prepares selected-track configuration before write_header, and rejects changed video extradata with a new-initialization requirement. That source ordering does not prove delayed browser-encoder or later dynamic reconfiguration support.

Next gate or reopening condition: When introducing a browser encoder, gate init on bounded first outputs of every selected track; test mismatched requested/actual config, a delayed track, cancellation and a later epoch before admission.

Reviewed: `native/remux/remux.c`, `web/native-remux-worker.js`.

### EB09 — Preserve trim, codec delay and decoder preroll exactly once

Owner: [R094.sample-accurate-audio-boundaries-using-mux-trim-and-preroll-metadata](../../../items/R094.sample-accurate-audio-boundaries-using-mux-trim-and-preroll-metadata/README.md). Outcome: **followup_required**.

R094 is the exact trim/preroll owner; R060 captions was a provisional, unrelated link and is not adopted.

Current remux explicitly preserves Opus padding through WebM choice, records initial padding and retains bounded real seek preroll. R094 has scoped sample-boundary evidence, but there is no new proof here that all AAC/MP3/Opus mixed/chunked routes apply trim exactly once.

Next gate or reopening condition: Use independently decoded impulse/channel-marked AAC, MP3 and Opus fixtures at head/tail and seek boundaries; declare each trim owner and sample units. Require exact counts/positions before admitting any new wrapper or split route.

Reviewed: `native/remux/remux.c`, `native/ao_browser.c`.

### EB10 — Drive split playback from consumed media samples, not elapsed context alone

Owner: [R086.native-video-with-an-independent-generated-pcm-clock](../../../items/R086.native-video-with-an-independent-generated-pcm-clock/README.md). Outcome: **no_new_work_current_scope**.

Extend the existing split-clock item without replacing mpv synchronization or reviving unrelated timestamp/caption mechanisms.

AudioWorklet increments consumed media frames by available samples only; underrun silence contributes no source progress. AO delay includes queued samples and reported latency, and mpv retains synchronization ownership. Executed tests cover underrun/pause/reset; acoustic synchronization and independent decoded-audio routes remain outside this result.

Next gate or reopening condition: Retain consumed-sample feedback. Reopen for a real independent audio owner with a starvation/rate trace demonstrating drift; then qualify digital markers and acoustic latency separately.

Reviewed: `web/audio-worklet.js`, `native/ao_browser.c`.

### EB11 — Make audio preload, batching and render deadlines separate budgets

Owner: [R014.avoid-duplicate-resampling-and-oversized-audio-work-batches](../../../items/R014.avoid-duplicate-resampling-and-oversized-audio-work-batches/README.md). Outcome: **no_new_work_current_scope**.

R014 directly owns rate/batch policy; R086 alone was too broad a provisional mapping.

The AO rejects writes beyond a fixed ring capacity, reports free/queued samples, negotiates context sample rate and separates pause from consumption. Current tests exercise variable output quantum and empty input. No new oversized batch or duplicate-resample workload is established.

Next gate or reopening condition: Keep the existing stop. Reopen with a pre-gesture producer/occupancy trace or measured callback deadline miss; do not infer callback timing from Node execution.

Reviewed: `native/ao_browser.c`, `web/audio-worklet.js`, `src/internal/wasm-player.ts`.

### EB12 — Prefer qualified audio wrapping over unnecessary audio decoding

Owner: [R031.raw-aac-mp3-audio-beside-fragmented-video](../../../items/R031.raw-aac-mp3-audio-beside-fragmented-video/README.md). Outcome: **deferred_until_trigger**.

Merge into R031 with R032 related; do not create a general wrapping subsystem from MIME lists.

Packet-copy remux and destination-specific packaging already exist. R031 has scoped raw-audio evidence and R032 records a working direct AVC/Vorbis baseline. The external wrapper list does not expose a new unsupported source or prove a faster browser decoder.

Next gate or reopening condition: Select a real source whose cheapest unchanged route fails, then compare exact compressed frames and decoded timing/channels across the specific wrapper; charge parse/mux/setup. Preserve working direct playback.

Reviewed: `native/remux/remux.c`, `web/remux-packaging.js`, `src/internal/playback-plans.ts`.

### EB13 — Choose seek-versus-skip using validated container boundaries

Owner: [R045.use-a-source-bound-seek-map-rather-than-repeated-fragment-scanning](../../../items/R045.use-a-source-bound-seek-map-rather-than-repeated-fragment-scanning/README.md). Outcome: **no_new_work_current_scope**.

R045 owns source-bound access decisions; this screen does not reopen R003's failed whole-player cost gate.

The local metadata probe walks checked box lengths with box/read budgets, handles safe extended top-level sizes and fails closed to deep inspection. Source reads are bounded. R045's source-map latency regression remains relevant; no new remote seek-versus-skip threshold is measured.

Next gate or reopening condition: Keep bounded local metadata skipping. Reopen remote policy only with a measured Range-capable transport workload and stale-hint, malformed-size and ignored-Range controls; include index acquisition cost.

Reviewed: `web/cheap-mp4-probe.js`, `web/range-reader.js`.

### EB14 — Construct checked metadata projections with bounded offset fixpoints

Owner: [R274.virtual-webm-cues](../../../items/R274.virtual-webm-cues/README.md). Outcome: **deferred_until_trigger**.

R274 is the direct variable-index comparison home, with R059 and R162 related; do not duplicate their fixed-layout constructors.

The maintained selected-MP4 view preserves file length and payload offsets, avoiding a fixpoint entirely. R274's bounded WebM index relies on reserved space. Neither establishes a general variable-width metadata projection constructor; the broad proposal overlaps these owners but needs a different source profile.

Next gate or reopening condition: Reopen for a specific recording that cannot use the fixed-size/reserved-space baseline. Prove checked convergence across EBML integer-width boundaries, all offset targets, opaque-metadata handling, source identity and bounded failure before timing.

Reviewed: `web/selected-mp4-view.js`, `web/cheap-mp4-probe.js`.

### EB15 — Use consumer-owned source-priority and cancellation leases

Owner: [R208.make-cancellation-follow-media-dependency-boundaries](../../../items/R208.make-cancellation-follow-media-dependency-boundaries/README.md). Outcome: **no_new_work_current_scope**.

R208 owns cancellation. Dropped R006 and R176 are rejected as dependency links; the proposal does not restore non-pthread or JSPI paths.

The current preview path uses copied resident bytes or an isolated low-priority reader; playback preempts background reads and preview cancellation does not cancel playback. Shaka preview policies fork their network owner. Executed tests cover this supported ownership model, not shared torrent subscription leases.

Next gate or reopening condition: Retain isolated preview ownership. Introduce shared leases only for a requested shared scheduler and demonstrate overlapping consumers, stale verified blocks and independent cancellation; never seek/flush the main decoder for previews.

Reviewed: `web/range-reader.js`, `src/preview/controller.ts`, `src/internal/shaka-network.ts`.

### EB16 — Recover reconnect overlap with explicit identity and confidence levels

Owner: [reconnect-overlap-identity](../../../items/reconnect-overlap-identity/README.md). Outcome: **deferred_until_trigger**.

New bounded home: sequence identity/confidence is distinct from transport timestamp normalization. Source-screen stop until a consumer exists, not experimental rejection.

The inspected maintained sources provide bounded VOD ranges and packaged Shaka streaming, not an Icecast compressed-overlap or alternate-encoding alignment owner. Exact sequence overlap and estimated PCM correlation are distinct from R220 clock normalization and R060 captions.

Next gate or reopening condition: Reopen only for an explicit reconnecting audio source contract. Byte-verify hash candidates, retain unique samples, bound overlap, reject silence/periodic ambiguity and label estimated alternate-source alignment separately.

Reviewed: `src/internal/shaka-backend.ts`, `src/internal/shaka-network.ts`, `web/range-reader.js`.

### EB17 — Keep clock epochs and transition metadata tied to their source

Owner: [R220.scoped-transport-clock-normalization](../../../items/R220.scoped-transport-clock-normalization/README.md). Outcome: **no_new_work_current_scope**.

R220 owns normalization; configuration continuity items remain related rather than independently reopened.

Current owners already separate remux source generations, timeline bias, audio epochs and Shaka timeline ownership. R220 records a qualified 33-bit rollover profile. No observed disagreement justifies a second clock normalizer.

Next gate or reopening condition: Keep existing epoch authorities. Reopen only on a trace showing double offset, stale configuration/GOP metadata or premature final drain at a specific owner boundary; include delayed old-epoch events.

Reviewed: `native/remux/remux.c`, `web/native-remux-player.js`, `src/internal/shaka-backend.ts`.

### EB18 — Reuse subtitle content independently of placement updates

Owner: [R021.cache-subtitle-tiles-and-schedule-only-useful-redraws](../../../items/R021.cache-subtitle-tiles-and-schedule-only-useful-redraws/README.md). Outcome: **followup_required**.

R021 directly owns subtitle reuse. New position-only work is a conditional extension, not evidence that the prior negative disappeared.

Current rendering already suppresses unchanged output and closes discarded bitmaps. The standalone libass bridge treats any nonzero change as bitmap work; position-only changes are not separately exposed there. The current mpv subtitle service is another boundary and must be measured separately. R021's cold-owner failed benefit gate is retained.

Next gate or reopening condition: Compare position-only versus content changes on a persistent moving-ASS workload, font replacement and resize; independently verify glyph/color/placement and measure full rendering/upload cost before adding a tile cache.

Reviewed: `native/subtitles/ass.c`, `src/internal/native-mpv-subtitles.ts`, `web/mpv-subtitle-worker.js`.

### EB19 — Expose repairs and resynchronization instead of silently discarding data

Owner: [explicit-media-repair-accounting](../../../items/explicit-media-repair-accounting/README.md). Outcome: **followup_required**.

New diagnostic/fidelity home. R131 repair search, R311 trusted corruption repair and codec-specific normalization do not own cross-operation repair provenance.

Remux records errors/gap skips and performs bounded timestamp/configuration repairs, but there is no uniform input/output-range repair ledger in the inspected native/JS interface. Existing typed route errors distinguish interruption from incompatibility; they do not account for every repaired field or skipped byte.

Next gate or reopening condition: Start with existing AAC timestamp and AVC/HEVC DTS repairs: emit bounded reason/source-epoch/input-output identities with unchanged-media controls. Then inject junk, truncated init and inconsistent metadata; distinguish strict rejection, requested salvage and live concealment before broadening.

Reviewed: `native/remux/remux.c`, `web/native-remux-player.js`, `src/internal/runtime-capability.ts`.

### EB20 — Build an oracle matrix with independent structural and behavioral references

Owner: [R192.identity-coded-witness-media](../../../items/R192.identity-coded-witness-media/README.md). Outcome: **qualification_followup**.

Integrate as a qualification extension of witness-media R192 and the research process, not a separate performance optimization.

Research already requires independent output and adverse controls. Existing selected-view tests compare decoded output through FFmpeg, so adding ffprobe alone is not an independent structural vote. This run integrates a concrete oracle matrix separating structure, samples, timing, metadata, lifecycle and route ownership; external corpora were not downloaded or executed.

Next gate or reopening condition: For EB01/EB09/EB14/EB19 experiments, fill the matrix with a second structural implementation or independently authored parser and a failing negative control. Record lineage, tolerance and exact scope; do not label Node contracts browser conformance.

Reviewed: `tests/selected-mp4-view.mjs`, `tests/remux-output-identity.mjs`, `tests/repair-evidence-contracts.mjs`, `research/PROCESS.md`.

### EB21 — Limit live work by dependency-group deadlines, not VOD policy

Owner: [live-dependency-group-deadlines](../../../items/live-dependency-group-deadlines/README.md). Outcome: **deferred_until_trigger**.

New live-policy home, deferred until a consumer exists. Keep Shaka ownership and dropped JSPI/non-pthread decisions intact.

Live playback already requires explicit Shaka permission; the byte reader is finite VOD. No maintained MoQ dependency-group consumer or loss policy is present in the inspected owners. Existing R208 cancellation and R267 deadline attribution do not authorize dropping required VOD content.

Next gate or reopening condition: Reopen for an explicit live transport/latency policy outside the current packaged-stream owner. Test late groups, dependency closure, pause/resume, A/V/subtitle resync and a strict VOD no-drop control; report skipped intervals and latency, not equal-output savings.

Reviewed: `src/internal/shaka-backend.ts`, `src/internal/native-player.ts`, `web/range-reader.js`.

### EB22 — Publish narrow contracts for prepared-media reuse and virtual presentations

Owner: [R018.cache-prepared-media-by-timeline-and-transformation-recipe](../../../items/R018.cache-prepared-media-by-timeline-and-transformation-recipe/README.md). Outcome: **deferred_until_trigger**.

Merge into R018; retain engine-sharing links without counting their savings again or inventing a universal graph.

Engine preparation already shares immutable assets and preview work has separate owners. R018 owns source/recipe prepared-media caching and the unified study owns engine sharing. Neither is evidence for sharing live parsers or clocks between export and playback.

Next gate or reopening condition: When a repeated-preparation workload warrants integration, key reuse by immutable source, selected tracks, recipe, metadata epoch, destination and runtime; test individual invalidations and consumer cancellation, then charge retained memory and cold preparation.

Reviewed: `src/internal/engine-preparation.ts`, `web/prepared-engine.js`, `src/preview/controller.ts`.

## Oracle matrix

See [oracle-matrix.md](oracle-matrix.md) for the integrated EB20 acceptance contract. Each subsequent experiment must record actual references and outcomes; the matrix is not an executed conformance result.
