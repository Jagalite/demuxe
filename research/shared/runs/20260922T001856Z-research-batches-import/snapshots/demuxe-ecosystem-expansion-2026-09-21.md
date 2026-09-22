# Demuxe ecosystem audit — expanded search

**Research snapshot: 2026-09-21. Demuxe baseline: `3bfeac8178bd34047e5396d1618e09a31cf8618a`.**

## Results at a glance

This expansion screens **38 additional distinct repository targets** beyond the accepted 29-target audit, and records **22 additional mechanism/qualification cards, EB01–EB22**. The combined inventory now contains **67 targets**, not 67 fully audited independent players. Existing dependencies such as mpv and FFmpeg are valuable upstream references, not proposed new dependencies.

The accepted EA01–EA18 findings remain unchanged. EB labels are provisional campaign identifiers, not allocated canonical Demuxe research numbers. Several cards deliberately expand those accepted leads or existing research; no external implementation is evidence by itself that Demuxe lacks the mechanism.

**Executed work:** source and documentation retrieval, selected code/API/test inspection, comparison with the accepted ledger, current Demuxe commit/count refresh, and preparation of the evidence/experiment package. **Not executed:** upstream test suites, browser playback, conformance binaries, new local media experiments, CPU benchmarks or production changes. The previous audit's six Node probes are not new evidence in this expansion.

The current registry describes **435 item homes**. The refreshed commit also contains corrections to comparison-harness interpretation; this report does not reuse older default-route failures as codec-support verdicts. Sources: [registry](https://github.com/Jagalite/demuxe/blob/3bfeac8178bd34047e5396d1618e09a31cf8618a/research/ITEMS.md) and [baseline commit](https://github.com/Jagalite/demuxe/commit/3bfeac8178bd34047e5396d1618e09a31cf8618a).

## Main conclusions

The strongest additional direction is to make boundaries between existing components more precise: browser-observed buffer state, dependency-safe eviction, retained memory, frame representation, initialization barriers, sample trimming and clock progress. These can prevent a small compatibility problem from becoming an unnecessary route change. They do not justify adding every discovered player as a fallback.

The most distinct new candidates are **observed-buffer reconciliation (EB01)**, **resource/representation negotiation (EB05)**, **checked metadata projections (EB14)**, **confidence-aware reconnect overlap (EB16)**, **explicit repair accounting (EB19)** and **live dependency-group deadlines (EB21)**. Novelty against all current canonical Demuxe items remains to be checked before creating new homes.

The first qualification wave should pair **EB01/EB02 with R005 and R132/R133**, **EB04 with ownership/accounting**, **EB07/EB08 with component admission**, **EB09/EB10 with independently decoded audio**, and **EB19/EB20 with every proposed shortcut**. The existing production-priority sequence need not be interrupted. Run only tests that can decide an actual uncovered gap.

## What counts as evidence here

Implementation sections are stronger evidence of a mechanism than a README claim, but neither constitutes executed browser correctness. Headers establish an API contract; tests establish intended assertions; documentation establishes a described architecture or feature. A source snapshot can be newer than a release or Demuxe's bundled dependency. Each record says exactly what was read, and whether a commit or only a file blob/document location is known.

Depth counts: 13 selected-implementation, 2 architecture-contract, 15 documentation, 3 source-excerpt, 1 example-contract, 1 api-contract, 1 selected-test-code, 1 fixture-documentation, 1 test-suite-documentation.

## Coverage map

**Browser controllers:** RxPlayer, Video.js HTTP Streaming (VHS), xgplayer MP4 loader.

**Browser engines:** Chromium media pipeline, WebKit media pipeline, Firefox media pipeline.

**Native pipelines:** mpv demux cache, VLC clock architecture, GStreamer allocation and buffer pools, libplacebo.

**Browser components:** libav.js, libav.js WebCodecs polyfill, libav.js WebCodecs bridge, TransAVormer, videojs-libav.

**Containers and transforms:** FFmpeg trim bitstream filter, GPAC native framework, Bento4, ts-ebml, NGINX VOD packager.

**Audio specialists:** Symphonia, Wasm audio decoders, Codec Parser, MSE Audio Wrapper, Icecast metadata player, audio-feeder, Web Audio Samples, synaudio.

**Sources and transport:** render-media, WebTorrent file iterator, Media over QUIC implementation, videostream.

**Subtitles and presentation:** libass core.

**Conformance and evidence:** Web Platform Tests, Matroska test files, MediaConch implementation, GPAC testsuite, Compliance Warden.

## Additional repository findings

### T01 — RxPlayer

**Source/depth:** [S01: canalplus/rx-player](https://github.com/canalplus/rx-player/blob/c1a6300a11fa2c4dc9417c1b9b4072b8af132729/src/core/segment_sinks/inventory/segment_inventory.ts). **selected-implementation**; commit `c1a6300a11fa2c4dc9417c1b9b4072b8af132729`. Reviewed: 1-240.

**Observed:** The inventory distinguishes partially pushed, fully loaded and failed chunks, and inferred buffered ranges from expected bounds. Failed appends may have partially affected the destination. Container byte size is explicitly not an exact memory footprint.

**Demuxe relevance:** Reconcile intended work, completed operations and observed browser ranges rather than treating them as interchangeable.

**Boundary:** Use browser observations with completion timing and uncertainty; do not install a second streaming scheduler beside Shaka.

### T02 — Chromium media pipeline

**Source/depth:** [S02: chromium/chromium](https://github.com/chromium/chromium/blob/cfaf038e745952481eb0ed0b2a2ea641687fbecc/media/filters/source_buffer_stream.cc). **selected-implementation**; commit `cfaf038e745952481eb0ed0b2a2ea641687fbecc`. Reviewed: 110-340.

**Observed:** Append processing maintains coded-frame groups and configuration IDs. When removal destroys a dependency group, creation of a new range skips dependent frames until a keyframe; absent a keyframe, those incoming frames are not buffered.

**Demuxe relevance:** Test remux eviction/repopulation at dependency boundaries, including overlap and partial-fragment append.

**Boundary:** This is a selected internal implementation, not a cross-browser guarantee or a full review of Chromium garbage collection.

### T03 — WebKit media pipeline

**Source/depth:** [S03: WebKit/WebKit](https://github.com/WebKit/WebKit/blob/7213978fbc70cca1cfaca0253962a1559277bf67/Source/WebCore/platform/graphics/SourceBufferPrivate.cpp). **selected-implementation**; commit `7213978fbc70cca1cfaca0253962a1559277bf67`. Reviewed: Selected computeBufferedRanges, computeSeekTime, clearTrackBuffers and provideMediaData sections.

**Observed:** Track ranges are combined with special ended-state handling. Seek-time conversion handles floating-point round trips. Clearing buffers updates visible state; sample delivery is gated on destination readiness and reenqueue state.

**Demuxe relevance:** Separate demux EOF, samples enqueued and presentation completion; make buffer and seek assertions tolerant of representation changes but not missing output.

**Boundary:** A full-file response was fetched but only named sections reviewed. An initial request beyond the file returned empty and provides no evidence.

### T04 — Firefox media pipeline

**Source/depth:** [S04: mozilla-firefox/firefox](https://github.com/mozilla-firefox/firefox/blob/a4d4f7ecfae304e10b0f6724595f9c931d7c919b/dom/media/mediasource/ResourceQueue.cpp). **selected-implementation**; commit `a4d4f7ecfae304e10b0f6724595f9c931d7c919b`. Reviewed: 1-215.

**Observed:** The byte queue can return contiguous access or copy across spans. Partial eviction removes a prefix from a span. Memory accounting deduplicates shared backing MediaByteBuffers rather than summing views.

**Demuxe relevance:** Expose logical bytes and unique retained backing allocations separately; investigate compaction only when small surviving views pin excessive storage.

**Boundary:** Removing logical bytes does not by itself prove an allocation was freed. The older gecko-dev mirror was not counted as another project.

### T05 — mpv demux cache

**Source/depth:** [S05: mpv-player/mpv](https://github.com/mpv-player/mpv/blob/c6c4c38d7f4aa82ad2a29a4c3b142f19123f5b9e/demux/demux.c). **selected-implementation**; commit `c6c4c38d7f4aa82ad2a29a4c3b142f19123f5b9e`. Reviewed: 300-430.

**Observed:** Cached ranges cover enabled streams, with per-stream queues, keyframe indexes, monotonicity tracking, beginning/end markers and distinct reader positions. Selected and eager/passively read streams are separate concepts.

**Demuxe relevance:** Reuse and expose existing mpv cache knowledge before designing an additional cache or index; distinguish buffered from safely seekable data.

**Boundary:** mpv is already a Demuxe dependency. This is an upstream contract audit, not a newly discovered library or proof that the browser port exposes all fields.

### T06 — VLC clock architecture

**Source/depth:** [S06: videolan/vlc](https://github.com/videolan/vlc/blob/69b5246ae9d711affff002649ed009c4d4f3e31e/doc/clock.md). **architecture-contract**; commit `69b5246ae9d711affff002649ed009c4d4f3e31e`. Reviewed: 1-200.

**Observed:** The design separates master and slave clocks, uses an affine mapping to system time, and describes different master choices for files and live input. Pausing a master requires special handling to avoid artificial drift.

**Demuxe relevance:** Make clock policy, source timestamp preservation and epoch resets explicit for independently rendered components.

**Boundary:** Architecture documentation is not a runtime measurement. Do not add audio resampling solely to imitate another clock policy.

### T07 — libav.js

**Source/depth:** [S07: Yahweasel/libav.js](https://github.com/Yahweasel/libav.js). **documentation**; documentation snapshot; commit not captured. Reviewed: Repository README overview.

**Observed:** The project exposes FFmpeg library operations in JavaScript/Wasm, with build variants and companion bridge/polyfill/transformer projects.

**Demuxe relevance:** Use as another reference for a bounded library-style media component, not only a command-line-in-Wasm interface.

**Boundary:** This is not Banou libav-wasm. Build coverage, startup cost and licensing depend on the chosen variant and linked components.

### T08 — libav.js WebCodecs polyfill

**Source/depth:** [S08: ennuicastr/libavjs-webcodecs-polyfill](https://github.com/ennuicastr/libavjs-webcodecs-polyfill). **documentation**; documentation snapshot; commit not captured. Reviewed: README interaction-with-native section.

**Observed:** The documented getXY selectors return matching codec/data constructors. Native and polyfilled raw-frame objects cannot simply be interchanged; explicit conversions incur copying.

**Demuxe relevance:** Route over representation-compatible component combinations and count conversion edges, not just independently preferred decoders.

**Boundary:** An API-shaped polyfill is not native acceleration or complete parity with a newer specification. No implementation or playback suite was run.

### T09 — libav.js WebCodecs bridge

**Source/depth:** [S09: Yahweasel/libavjs-webcodecs-bridge](https://github.com/Yahweasel/libavjs-webcodecs-bridge/blob/29c70f8b0940de475db22f21b0fb26306394022d/src/mux.ts). **selected-implementation**; commit `29c70f8b0940de475db22f21b0fb26306394022d`. Reviewed: 230-380; related docs/API.md read separately.

**Observed:** Video conversion can populate initially missing codec extradata from encoded-output metadata. The inspected audio path notes that metadata is not used. Initial extradata population is not a general configuration-change mechanism.

**Demuxe relevance:** Introduce a bounded first-output configuration barrier before emitting a destination init segment, and distinguish later configuration epochs.

**Boundary:** Do not infer that this code handles every audio codec or configuration update. The documentation contains an oversimplified H.264/H.265 keyframe explanation that is not adopted as a technical rule here.

### T10 — TransAVormer

**Source/depth:** [S10: Yahweasel/transavormer](https://github.com/Yahweasel/transavormer). **documentation**; documentation snapshot; commit not captured. Reviewed: README transformation model.

**Observed:** The project describes stream-based media transformations assembled from libav.js and WebCodecs operations, including muxing and random-access output.

**Demuxe relevance:** Explore an explicit transformation plan that keeps copy/remux separate from decode/encode and accounts for every ownership boundary.

**Boundary:** A pipeline builder is not proof that a chosen graph is minimal, bounded or suitable for interactive playback.

### T11 — Video.js HTTP Streaming (VHS)

**Source/depth:** [S11: videojs/http-streaming](https://github.com/videojs/http-streaming/blob/a9f9d7ac0264b373f14da1bb2f2e7fe8f2775c4f/src/segment-transmuxer.js). **source-excerpt**; commit `a9f9d7ac0264b373f14da1bb2f2e7fe8f2775c4f`. Reviewed: gopsToAlignWith call site and transmuxer-worker alignGopsWith excerpt.

**Observed:** The transmuxer boundary passes GOP alignment state, including an empty array specifically used to clear it; the worker takes a copied list.

**Demuxe relevance:** Test stale boundary state across seeks, discontinuities and representation changes instead of treating reset as only clearing bytes.

**Boundary:** This is a separate implementation repository from the Video.js shell screened before. The complete GOP algorithm was not reviewed.

### T12 — xgplayer MP4 loader

**Source/depth:** [S12: bytedance/xgplayer](https://github.com/bytedance/xgplayer/blob/2c4e5f6c44af7a536b3b8c39c5f4f7567b08078e/packages/xgplayer-mp4-loader/README.md). **documentation**; commit `2c4e5f6c44af7a536b3b8c39c5f4f7567b08078e`. Reviewed: 1-200.

**Observed:** The loader contract includes a moov-end hint, source/cache identity, target segment duration, bounded download-info history, request transformations and custom caching.

**Demuxe relevance:** Test trusted metadata hints and range-directed inspection against ordinary probing; bind hints to source identity and validate them.

**Boundary:** A configurable hint is not proof of a faster loader or safe handling of stale/hostile hints. Do not copy example duration or size defaults.

### T13 — videojs-libav

**Source/depth:** [S13: ffplayout/videojs-libav](https://github.com/ffplayout/videojs-libav/blob/main/packages/videojs-libav/src/audio-worklet.ts). **selected-implementation**; file blob `4cf6ce8280ac474117696ac1ada2117f6ba1daaf`; branch `main`. Reviewed: Full small audio sink; repository architecture README also screened.

**Observed:** The sink preserves bounded audio queued before a user gesture, closes zero-frame AudioData, and transfers planar buffers. Its local clock uses elapsed AudioContext time while its processor emits silence when its queue is empty.

**Demuxe relevance:** Test consumed-media-sample clocks, pre-gesture backpressure, starvation accounting and gain changes on already-queued audio.

**Boundary:** This is a sink-level observation, not a reproduced whole-player sync bug: surrounding player logic may compensate. A bounded pending list alone does not prove end-to-end backpressure.

### T14 — FFmpeg trim bitstream filter

**Source/depth:** [S14: FFmpeg/FFmpeg](https://github.com/FFmpeg/FFmpeg/blob/cb5a63736a01a9673b63fffcd7dee025490ae376/libavcodec/bsf/trim.c). **selected-implementation**; commit `cb5a63736a01a9673b63fffcd7dee025490ae376`. Reviewed: 1-240.

**Observed:** The inspected trim filter distinguishes time/packet axes, checked timestamp conversions, carried audio skip state and a bounded preroll FIFO. Compressed-packet trimming and decoded-output trimming are separate concerns.

**Demuxe relevance:** Carry precise sample trimming and decoder recovery requirements through component adapters rather than trimming twice or dropping necessary preroll.

**Boundary:** This is current upstream source, not evidence that Demuxe ships this filter/version. A destination must preserve and honor any translated trimming semantics.

### T15 — GStreamer allocation and buffer pools

**Source/depth:** [S15: GStreamer/gstreamer](https://github.com/GStreamer/gstreamer/blob/4f552219bccf68a45190f826876776fbb0fc80af/subprojects/gstreamer/gst/gstbufferpool.c). **selected-implementation**; commit `4f552219bccf68a45190f826876776fbb0fc80af`. Reviewed: 1250-1390; official bufferpool design documentation separately.

**Observed:** Acquisition accounts for outstanding buffers before calling the pool. Release checks ownership, memory shape and exclusivity; unsuitable buffers are discarded instead of blindly recycled.

**Demuxe relevance:** Give cross-component resources explicit lifetime, memory-domain, reuse and cancellation contracts, with a bounded outstanding count.

**Boundary:** WebCodecs does not expose every native decoder allocator. Transfer the ownership invariant, not an inaccessible native allocation API.

### T16 — Symphonia

**Source/depth:** [S16: pdeljanov/Symphonia](https://github.com/pdeljanov/Symphonia/blob/ee35874b571a35a9a6e15d3bc9a3aaf8f11fbeee/symphonia-core/src/packet.rs). **source-excerpt**; commit `ee35874b571a35a9a6e15d3bc9a3aaf8f11fbeee`. Reviewed: packet trimming, migration and MP3 decoder excerpts.

**Observed:** Packet duration and head/tail trim are distinct values; the MP3 decoder excerpt applies trimming under its gapless option. The migration guide distinguishes timestamp and duration types.

**Demuxe relevance:** Use typed units and a single explicit trimming owner when a small audio decoder participates in a mixed pipeline.

**Boundary:** No broad codec-conformance or performance claim follows from these excerpts or from implementation language.

### T17 — Wasm audio decoders

**Source/depth:** [S17: eshaz/wasm-audio-decoders](https://github.com/eshaz/wasm-audio-decoders). **documentation**; documentation snapshot; commit not captured. Reviewed: README decoder/package organization.

**Observed:** The repository documents codec-specific decoders and container-specific wrappers, including distinctions such as raw Opus versus Ogg Opus and worker-backed variants.

**Demuxe relevance:** Compare a selected audio decoder plus its actual wrapper/clock cost against Demuxe’s existing audio path.

**Boundary:** A small module is not automatically a smaller complete route. Keep upstream library licenses and codec/profile coverage distinct.

### T18 — Codec Parser

**Source/depth:** [S18: eshaz/codec-parser](https://github.com/eshaz/codec-parser/blob/main/README.md). **documentation**; file blob `690696d24706afb52ce153f29031039aa35319d4`; branch `main`. Reviewed: 1-130.

**Observed:** Incremental parsing retains incomplete frames and uses consecutive frames to establish synchronization. The README explicitly says data inconsistent with the selected MIME type is discarded.

**Demuxe relevance:** Reuse parsed frames at audio wrapper boundaries and expose skipped/resynchronized bytes as diagnostics or policy decisions.

**Boundary:** Resynchronization can be appropriate for a live stream but must not silently masquerade as fidelity-preserving arbitrary-file repair.

### T19 — MSE Audio Wrapper

**Source/depth:** [S19: eshaz/mse-audio-wrapper](https://github.com/eshaz/mse-audio-wrapper). **documentation**; documentation snapshot; commit not captured. Reviewed: README supported input/output and frame iterator contract.

**Observed:** The wrapper documents fMP4 and WebM audio outputs, configurable grouping, codec-update callbacks and a parsed-frame input API that can avoid reparsing.

**Demuxe relevance:** Broaden destination-aware audio wrapping around R031/R032 while leaving video compressed and browser-owned.

**Boundary:** Muxer output support is not browser decoder support. Its discarded-input policy and initial grouping delay need explicit qualification.

### T20 — Icecast metadata player

**Source/depth:** [S20: eshaz/icecast-metadata-js](https://github.com/eshaz/icecast-metadata-js/blob/f648fa849b8c78edc5da86ec598f64ced470492a/src/icecast-metadata-player/src/FrameQueue.js). **selected-implementation**; commit `f648fa849b8c78edc5da86ec598f64ced470492a`. Reviewed: 1-260.

**Observed:** Reconnect handling indexes compressed-frame CRCs, searches an overlapping sequence, and can proceed to a PCM correlation path. It distinguishes syncing, synchronized and unsynchronized outcomes and bounds work by buffered time.

**Demuxe relevance:** Investigate transparent reconnect overlap removal before a full restart, with exact-byte matching separate from perceptual alignment.

**Boundary:** CRC matches are not cryptographic proof; repeated silence/music can create ambiguous alignment. PCM correlation is not sample identity.

### T21 — audio-feeder

**Source/depth:** [S21: bvibber/audio-feeder](https://github.com/bvibber/audio-feeder). **documentation**; documentation snapshot; commit not captured. Reviewed: README refill, starvation and tempo contracts.

**Observed:** The API distinguishes early low-buffer notification from immediate starvation handling, and documents different input/output timing behavior when tempo changes.

**Demuxe relevance:** Separate refill warning thresholds, hard render deadlines and media-time accounting.

**Boundary:** This is a historical reference, not a current deployment recommendation. Its documented tempo/channel behavior must not be assumed fidelity-preserving for multichannel output.

### T22 — Web Audio Samples

**Source/depth:** [S22: GoogleChromeLabs/web-audio-samples](https://googlechromelabs.github.io/web-audio-samples/audio-worklet/design-pattern/wasm-ring-buffer/). **example-contract**; documentation snapshot; commit not captured. Reviewed: Official Wasm ring-buffer example.

**Observed:** The official example bridges a 1024-frame C++ processing kernel and a 128-frame AudioWorklet quantum.

**Demuxe relevance:** Test batch-to-render-quantum adapters with real deadlines, occupancy telemetry and worker-side preparation.

**Boundary:** A larger ring does not create more callback CPU time. Kernel batching, minimum latency and starvation resilience are separate metrics.

### T23 — render-media

**Source/depth:** [S23: feross/render-media](https://github.com/feross/render-media). **documentation**; documentation snapshot; commit not captured. Reviewed: README media rendering strategies.

**Observed:** The documented rendering helper uses different strategies, including videostream for MP4 and fallbacks whose source access can differ.

**Demuxe relevance:** Keep route evidence explicit about range-streamed versus full-file preparation and about selected backend behavior.

**Boundary:** A successful render helper is not evidence that every format remains incremental, seekable or near-native.

### T24 — WebTorrent file iterator

**Source/depth:** [S24: webtorrent/webtorrent](https://github.com/webtorrent/webtorrent/blob/b6debb50cc02b2e56d71ea95b4bd9bfae4d0b4fd/lib/file-iterator.js). **selected-implementation**; commit `b6debb50cc02b2e56d71ea95b4bd9bfae4d0b4fd`. Reviewed: 1-220.

**Observed:** Each iterator selects a piece range, waits for verified pieces, marks upcoming pieces critical and deselects on destruction. Late store callbacks check whether the iterator was destroyed.

**Demuxe relevance:** Tie source-read priority and cancellation to consumer leases; preserve other consumers and require verified bytes before parsing.

**Boundary:** The selected code does not establish all overlap/refcount semantics of the torrent scheduler. Audit those before copying the selection behavior.

### T25 — Media over QUIC implementation

**Source/depth:** [S25: moq-dev/moq](https://github.com/moq-dev/moq). **documentation**; documentation snapshot; commit not captured. Reviewed: README media/subscription and transport architecture.

**Observed:** The project describes a prioritized, subscription-driven media transport and browser-facing playback components.

**Demuxe relevance:** For an explicitly live route, investigate dropping obsolete dependency groups and suspending work without active consumers.

**Boundary:** Do not apply live loss/concealment policies to exact VOD. This evolving implementation is not a frozen transport-standard guarantee.

### T26 — GPAC native framework

**Source/depth:** [S26: gpac/gpac](https://github.com/gpac/gpac). **documentation**; documentation snapshot; commit not captured. Reviewed: README framework and tools overview.

**Observed:** GPAC exposes a native multimedia framework behind its tools and describes a separate functional testsuite.

**Demuxe relevance:** Use independent container tools and graph-oriented references to check remux output and transformation boundaries.

**Boundary:** A different front end may still share decoding dependencies. Document reference lineage before calling it an independent pixel/audio oracle.

### T27 — Bento4

**Source/depth:** [S27: axiomatic-systems/Bento4](https://github.com/axiomatic-systems/Bento4). **documentation**; documentation snapshot; commit not captured. Reviewed: README SDK/tools overview.

**Observed:** Bento4 provides MP4/packaging inspection and processing tools useful as a second structural implementation.

**Demuxe relevance:** Check sample tables, init segments, offsets and fragment organization independently of the main remux path.

**Boundary:** Structural validity does not prove decoded fidelity, player lifecycle correctness or hardware acceleration.

### T28 — videostream

**Source/depth:** [S28: jhiesey/videostream](https://github.com/jhiesey/videostream/blob/master/mp4-remuxer.js). **selected-implementation**; file blob `0a34e4caf4e299eb24694e04d0529701a103901c`; branch `master`. Reviewed: 1-180.

**Observed:** The moov scanner skips small boxes in the current stream and reopens at a later offset for larger boxes. The sample-table path constructs timing/offset records and selects specific supported sample entries.

**Demuxe relevance:** Compare metadata-directed seeking against sequential skipping using actual request setup cost, validated lengths and a bounded scan.

**Boundary:** The fixed skip threshold and restricted sample-entry handling are not general Demuxe defaults. Eagerly materialized per-sample tables can create their own cost.

### T29 — ts-ebml

**Source/depth:** [S29: legokichi/ts-ebml](https://github.com/legokichi/ts-ebml/blob/master/src/tools.ts). **selected-implementation**; file blob `357a5c18c4f36a967a3211dce0eae71890515a5f`; branch `master`. Reviewed: 200-395.

**Observed:** makeMetadataSeekable builds Duration, SeekHead and Cues for a streaming WebM profile. Offset values affect encoded metadata length, so construction iterates toward a stable layout with a maximum iteration count.

**Demuxe relevance:** Investigate checked metadata projections and bounded offset fixpoints for eligible recorded media, preserving original cluster bytes.

**Boundary:** This function assumes a specific Segment-header representation. It is not a general Matroska repair algorithm; unknown elements and source metadata require separate preservation.

### T30 — libplacebo

**Source/depth:** [S30: haasn/libplacebo](https://github.com/haasn/libplacebo/blob/e2972fdd09adacd383656738d7d280f0cd84a761/src/include/libplacebo/utils/frame_queue.h). **api-contract**; commit `e2972fdd09adacd383656738d7d280f0cd84a761`. Reviewed: 30-230.

**Observed:** The queue API separates lazy GPU mapping, unmapping and discarding unused frames. It distinguishes EOF from needing more data, supports bounded producer waiting and requires resets for discontinuous timeline jumps.

**Demuxe relevance:** Delay GPU import/conversion until a frame is needed; keep terminal frame ownership and actual presentation demand explicit.

**Boundary:** Skipping mapping does not imply skipping dependency-required decoding. This is a native API contract, not a portable browser implementation or performance result.

### T31 — libass core

**Source/depth:** [S31: libass/libass](https://github.com/libass/libass/blob/f61db567e6593df3470e91594bcd4ad2d0473aff/libass/ass.h). **source-excerpt**; commit `f61db567e6593df3470e91594bcd4ad2d0473aff`. Reviewed: ass_render_frame detect_change contract; matching ass_render.c excerpt.

**Observed:** The renderer change result distinguishes identical output, changed positions and changed content.

**Demuxe relevance:** Reuse unchanged subtitle content while updating placement, with explicit renderer generation and font/geometry invalidation.

**Boundary:** The flag is conservative (may have changed), not permission to skip all future rendering. Respect returned-image lifetimes and animated ASS.

### T32 — Web Platform Tests

**Source/depth:** [S32: web-platform-tests/wpt](https://github.com/web-platform-tests/wpt/blob/34cfec8be4420b39fd7845691b7841a0998074a6/webcodecs/videoDecoder-codec-specific.https.any.js). **selected-test-code**; commit `34cfec8be4420b39fd7845691b7841a0998074a6`. Reviewed: 240-450.

**Observed:** The inspected tests cover corrupted decoding, close/reset during flush, reconfiguration inside an output callback, negative timestamps and decoding after flush.

**Demuxe relevance:** Port relevant adversarial sequences into Demuxe adapters with resource accounting and output-generation assertions.

**Boundary:** These tests were read, not executed. A browser API conformance pass does not qualify the complete Demuxe route.

### T33 — Matroska test files

**Source/depth:** [S33: ietf-wg-cellar/matroska-test-files](https://github.com/ietf-wg-cellar/matroska-test-files). **fixture-documentation**; documentation snapshot; commit not captured. Reviewed: Wave 1 README and official Matroska test-suite description.

**Observed:** The documented corpus targets container behavior such as non-default timestamp scale, header stripping, live recording, multiple tracks, cue-less seeking, unknown/damaged elements and audio gaps.

**Demuxe relevance:** Use orthogonal container cases instead of treating extension/codec combinations as sufficient coverage.

**Boundary:** A small historical corpus is a starting point, not exhaustive modern Matroska coverage. Retain individual media attribution and expected outcomes.

### T34 — MediaConch implementation

**Source/depth:** [S34: MediaArea/MediaConch-Implementation](https://github.com/MediaArea/MediaConch-Implementation). **documentation**; documentation snapshot; commit not captured. Reviewed: README conformance tool architecture.

**Observed:** The project distinguishes implementation checking, policy checking and reporting, with preservation-format emphasis including Matroska/LPCM/FFV1.

**Demuxe relevance:** Separate spec validity, application policy and playback capability in the research oracle and error taxonomy.

**Boundary:** A policy failure is not automatically malformed media; a successful checker is not a video/audio output oracle. No fixer is proposed for automatic use.

### T35 — GPAC testsuite

**Source/depth:** [S35: gpac/testsuite](https://github.com/gpac/testsuite/blob/master/README.md). **test-suite-documentation**; file blob `0d383513d74135f9208aa6e91756384f3954daf3`; branch `master`. Reviewed: 1-100; framework testing overview separately.

**Observed:** The testsuite has dedicated use, writing and CI documentation and is a separate repository referenced by GPAC.

**Demuxe relevance:** Select reproducible packaging/roundtrip tests and generators rather than rebuilding every fixture ad hoc.

**Boundary:** No suite was executed and no test-specific pass is claimed. Some fixtures may be external; do not fetch bulk media before reviewing provenance and need.

### T36 — Compliance Warden

**Source/depth:** [S36: gpac/ComplianceWarden](https://github.com/gpac/ComplianceWarden/blob/master/README.md). **architecture-contract**; file blob `4cafe19e5dcfe79a78110d1d9d62c54683d798c5`; branch `master`. Reviewed: 1-180.

**Observed:** The checker separates parsed structures from specification rules and documents known-good and known-bad vectors plus specification-specific coverage.

**Demuxe relevance:** Add independent structural rules and negative controls for container rewrites, with the exact checked specification recorded.

**Boundary:** Coverage grows rule by rule. A pass must not be relabeled complete MP4/CMAF/HDR or decoder conformance.

### T37 — NGINX VOD packager

**Source/depth:** [S37: kaltura/nginx-vod-module](https://github.com/kaltura/nginx-vod-module). **documentation**; README snapshot unpinned; separate parser-header excerpt at `26f06877b0f2a2336e59cda93a3de18d7b23a3e2`. Reviewed: README modes/features; parser-header/search excerpt only.

**Observed:** The project documents on-demand repackaging in local, remote HTTP-range and mapped modes, demonstrating that presentation layout can be separated from the original file.

**Demuxe relevance:** Compare a virtual presentation recipe over immutable source ranges with repeated materialization of prepared output.

**Boundary:** Server caches, I/O and request overhead are not free in a browser. This is a reference design, not a proposed server dependency or browser performance claim.

### T38 — synaudio

**Source/depth:** [S38: eshaz/synaudio](https://github.com/eshaz/synaudio/blob/main/README.md). **documentation**; file blob `acc73c6dde17e4cc3407efe9cce87e1272ed24b1`; branch `main`. Reviewed: 1-140.

**Observed:** The library documents sample-offset estimation through PCM correlation, with worker variants and different requirements for some multi-clip operations.

**Demuxe relevance:** Use as an optional alignment estimator for explicit reconnect/alternate-source cases, or an investigative tool for offset diagnosis.

**Boundary:** Correlation is not proof of identical samples or an unambiguous location. Silence, repeated patterns, rate mismatch and low confidence must be rejected or reported.

## Additional mechanism and qualification cards

These are proposed experiments, not newly passing research items. A candidate gap in Demuxe has not been established solely by inspecting another project.

### EB01 — Reconcile intended, committed and observed media inventory

**Disposition:** new-mechanism-candidate-pending-dedup. **Qualification wave:** first. **Accepted-audit relationships:** No direct EA parent; canonical dedup required.

**Source basis:** [S01: canalplus/rx-player](https://github.com/canalplus/rx-player/blob/c1a6300a11fa2c4dc9417c1b9b4072b8af132729/src/core/segment_sinks/inventory/segment_inventory.ts); [S02: chromium/chromium](https://github.com/chromium/chromium/blob/cfaf038e745952481eb0ed0b2a2ea641687fbecc/media/filters/source_buffer_stream.cc); [S03: WebKit/WebKit](https://github.com/WebKit/WebKit/blob/7213978fbc70cca1cfaca0253962a1559277bf67/Source/WebCore/platform/graphics/SourceBufferPrivate.cpp).

**Proposed mechanism:** Track media submitted to an owner, operations that completed, and media actually observed in destination ranges as distinct states. Include partial failure, source/configuration epoch and uncertainty.

**Smallest useful experiment:** Append overlapping fragments, fail an append, remove a range, then trigger browser eviction. Compare bookkeeping to observed ranges before deciding what to reproduce.

**Correctness gate:** No permanently claimed-but-missing data; no duplicate output after retry; marked A/V remains continuous or reports an explicit gap; late events cannot mutate a new source.

**Stop/reopen rule:** Retain only regression coverage if current Native/remux/Shaka ownership already reconciles these states. Do not create a competing controller for packaged streams.

**Measure only after correctness:** Avoided duplicate append/remux/read work and recovery reliability; observe latency and bytes before CPU.

**Candidate canonical links:** `R188.schedule-verified-playable-data`

### EB02 — Evict and refill complete decoding dependency closures

**Disposition:** existing-research-extension. **Qualification wave:** first. **Accepted-audit relationships:** EA08, EA18.

**Source basis:** [S02: chromium/chromium](https://github.com/chromium/chromium/blob/cfaf038e745952481eb0ed0b2a2ea641687fbecc/media/filters/source_buffer_stream.cc); [S03: WebKit/WebKit](https://github.com/WebKit/WebKit/blob/7213978fbc70cca1cfaca0253962a1559277bf67/Source/WebCore/platform/graphics/SourceBufferPrivate.cpp); [S05: mpv-player/mpv](https://github.com/mpv-player/mpv/blob/c6c4c38d7f4aa82ad2a29a4c3b142f19123f5b9e/demux/demux.c).

**Proposed mechanism:** Eviction and replenishment must preserve or recreate the keyframe/configuration/preroll closure needed by remaining samples, rather than treating all byte intervals as independently playable.

**Smallest useful experiment:** Use a long GOP with B-frames; remove the leading random-access sample, append the dependent tail, then refill from a valid recovery point. Include paused and backward-seek cases.

**Correctness gate:** Independent picture order/timestamps, no claimed playable range without required output, and eventual progress after valid refill; distinguish demux EOS from presentation completion.

**Stop/reopen rule:** Do not add unnecessary padding or replay when the current implementation already computes the closure. Prior stopped eviction profiles need a genuinely uncovered case.

**Measure only after correctness:** Seek/recovery success, redundant decode/remux work and retained closure bytes.

**Candidate canonical links:** `R005.move-mse-ownership-off-the-window-thread`; `R136.worker-owned-mse-with-mediasourcehandle.report-continuity`; `R137.transferable-compressed-buffers-into-worker-mse.report-continuity`; `R132.incremental-mdat-sample-release.report-continuity`; `R133.append-moof-and-mdat-separately.report-continuity`; `R144.evict-through-a-paused-current-position.report-continuity`

### EB03 — Advertise cache capabilities, not one ambiguous buffered value

**Disposition:** existing-research-extension. **Qualification wave:** first. **Accepted-audit relationships:** EA11.

**Source basis:** [S01: canalplus/rx-player](https://github.com/canalplus/rx-player/blob/c1a6300a11fa2c4dc9417c1b9b4072b8af132729/src/core/segment_sinks/inventory/segment_inventory.ts); [S05: mpv-player/mpv](https://github.com/mpv-player/mpv/blob/c6c4c38d7f4aa82ad2a29a4c3b142f19123f5b9e/demux/demux.c); [S24: webtorrent/webtorrent](https://github.com/webtorrent/webtorrent/blob/b6debb50cc02b2e56d71ea95b4bd9bfae4d0b4fd/lib/file-iterator.js).

**Proposed mechanism:** Distinguish raw bytes available, demuxed packets available, decoder-ready closure, browser-buffered media and a verified seekable interval. Reuse mpv knowledge instead of duplicating it.

**Smallest useful experiment:** Compare cache reports for a sparse subtitle track, missing audio, cue-less file and a source whose byte cache is full but recovery point is absent.

**Correctness gate:** Every exposed readiness level has a demonstrable operation that succeeds; source replacement invalidates observations; sparse tracks do not deadlock unrelated playback.

**Stop/reopen rule:** If upstream mpv already provides the needed state, wire and qualify it rather than implement another cache. Never infer all tracks ready from video bytes alone.

**Measure only after correctness:** Fewer unnecessary reopen/read operations and more truthful diagnostics; not an automatic steady-state CPU gain.

**Candidate canonical links:** `R140.cue-less-webm-native-seek.report-continuity`; `R349.seek-through-hierarchical-mp4-indexes-without-loading-the-whole-index`

### EB04 — Budget unique backing allocations separately from logical payload

**Disposition:** existing-research-extension. **Qualification wave:** first. **Accepted-audit relationships:** EA02.

**Source basis:** [S04: mozilla-firefox/firefox](https://github.com/mozilla-firefox/firefox/blob/a4d4f7ecfae304e10b0f6724595f9c931d7c919b/dom/media/mediasource/ResourceQueue.cpp); [S15: GStreamer/gstreamer](https://github.com/GStreamer/gstreamer/blob/4f552219bccf68a45190f826876776fbb0fc80af/subprojects/gstreamer/gst/gstbufferpool.c).

**Proposed mechanism:** Track unique parent allocations and live views. Consider a bounded compaction copy only when retaining small survivors pins disproportionate storage; account for the copy and ownership transfer.

**Smallest useful experiment:** Keep small packet slices from several large buffers while evicting prefixes; compare logical payload, unique backing bytes and actual retained allocator references before/after candidate compaction.

**Correctness gate:** Identical packet bytes, valid sibling views, no stale pooled storage and no double release; memory counters distinguish proxies from actual owned allocations.

**Stop/reopen rule:** R298 was previously stopped under its scope. This does not reopen it without a changed retention workload and measurable benefit; retain only accounting regressions otherwise.

**Measure only after correctness:** Owned allocation retention and copy cost separately; do not report view-byte reduction as freed browser process memory.

**Candidate canonical links:** `R047.assemble-output-as-headers-plus-original-payload-views`; `R100.transfer-owned-packet-storage-into-webcodecs-chunks`; `R137.transferable-compressed-buffers-into-worker-mse.report-continuity`; `R298.copy-surviving-packets-to-release-oversized-backing-buffers`

### EB05 — Negotiate resource representation and bounded outstanding ownership

**Disposition:** new-mechanism-candidate-pending-dedup. **Qualification wave:** next. **Accepted-audit relationships:** EA02, EA14.

**Source basis:** [S08: ennuicastr/libavjs-webcodecs-polyfill](https://github.com/ennuicastr/libavjs-webcodecs-polyfill); [S15: GStreamer/gstreamer](https://github.com/GStreamer/gstreamer/blob/4f552219bccf68a45190f826876776fbb0fc80af/subprojects/gstreamer/gst/gstbufferpool.c); [S30: haasn/libplacebo](https://github.com/haasn/libplacebo/blob/e2972fdd09adacd383656738d7d280f0cd84a761/src/include/libplacebo/utils/frame_queue.h).

**Proposed mechanism:** Describe memory domain, ownership transfer, permitted representations, maximum outstanding frames and terminal actions at each component boundary. A locally preferred decoder is inadmissible when its consumer requires a costly or unavailable representation.

**Smallest useful experiment:** Connect native and Wasm frame producers to each candidate presenter/audio sink. Exhaust the resource budget, cancel, replace the source and return resources from the previous generation.

**Correctness gate:** One terminal release per owned object, all waits cancelable, representation mismatches explicit, no old-generation resource reused as current, and marked output unchanged.

**Stop/reopen rule:** Do not emulate a native allocator the browser does not expose. Stop if this duplicates existing component contracts without revealing a missing edge or ownership bug.

**Measure only after correctness:** Total conversion/copy edges, retained surfaces, resource wait time and recovery; never infer zero-copy from API shape.

**Candidate canonical links:** `R047.assemble-output-as-headers-plus-original-payload-views`; `R100.transfer-owned-packet-storage-into-webcodecs-chunks`; `R137.transferable-compressed-buffers-into-worker-mse.report-continuity`; `granular-engine-loading`; `unified-hybrid-software-engine`

### EB06 — Map/import only frames needed for presentation

**Disposition:** existing-research-extension. **Qualification wave:** next. **Accepted-audit relationships:** EA10.

**Source basis:** [S30: haasn/libplacebo](https://github.com/haasn/libplacebo/blob/e2972fdd09adacd383656738d7d280f0cd84a761/src/include/libplacebo/utils/frame_queue.h).

**Proposed mechanism:** Keep a lazy frame representation until the presenter needs it, then map/import it; discard never-needed outputs without conversion while preserving all dependency-required decode work.

**Smallest useful experiment:** Compare eager versus demand-driven mapping under superseded previews, main-thread stalls and cadence changes. Inject map failure and source replacement while frames are outstanding.

**Correctness gate:** Same required visible pictures/timestamps; no use-after-close; failed mapping cleaned once; no dependency packet dropped merely because its picture will not be shown.

**Stop/reopen rule:** Do not claim decode savings when only mapping is avoided. Reopen a prior presentation optimization only with the changed work boundary and measured profile.

**Measure only after correctness:** GPU imports/conversions/uploads per delivered frame and total lifecycle cost; benchmark steady playback and scrubbing separately.

**Candidate canonical links:** `R318.decode-a-gop-once-for-exact-reverse-frame-playback.report-continuity`; `R360.retarget-in-flight-decoding-instead-of-restarting-a-forward-scrub`; `R334.share-one-demux-pass-across-independent-playback-and-export-timelines`

### EB07 — Use coherent native/polyfilled constructor families

**Disposition:** extension-of-accepted-lead. **Qualification wave:** first. **Accepted-audit relationships:** EA04, EA07, EA14.

**Source basis:** [S08: ennuicastr/libavjs-webcodecs-polyfill](https://github.com/ennuicastr/libavjs-webcodecs-polyfill); [S09: Yahweasel/libavjs-webcodecs-bridge](https://github.com/Yahweasel/libavjs-webcodecs-bridge/blob/29c70f8b0940de475db22f21b0fb26306394022d/src/mux.ts); [S10: Yahweasel/transavormer](https://github.com/Yahweasel/transavormer).

**Proposed mechanism:** Capability evidence must include the concrete codec implementation and the frame/chunk family accepted by downstream components. Materialization into another family is an explicit transformation, not invisible plumbing.

**Smallest useful experiment:** Run a small source through native-only, software-only and mixed adapters; deliberately supply an incompatible frame family and verify rejection before publication.

**Correctness gate:** No software path labeled native, no implicit color/crop loss, conversion ownership explicit and no global shim contaminates cached capability evidence.

**Stop/reopen rule:** Do not add a global WebCodecs polyfill to solve one missing codec. Keep an adapter-local implementation only when its complete route is qualified.

**Measure only after correctness:** Correct route selection, conversion count, actual output format and complete asset cost.

**Candidate canonical links:** `granular-engine-loading`; `unified-hybrid-software-engine`

### EB08 — Delay mux initialization until actual output configuration is known

**Disposition:** extension-of-accepted-lead. **Qualification wave:** first. **Accepted-audit relationships:** EA01, EA07, EA15.

**Source basis:** [S09: Yahweasel/libavjs-webcodecs-bridge](https://github.com/Yahweasel/libavjs-webcodecs-bridge/blob/29c70f8b0940de475db22f21b0fb26306394022d/src/mux.ts); [S10: Yahweasel/transavormer](https://github.com/Yahweasel/transavormer); [S19: eshaz/mse-audio-wrapper](https://github.com/eshaz/mse-audio-wrapper).

**Proposed mechanism:** Prepare bounded initial output from every selected encoded track, collect required decoder configuration, then commit a compatible initialization segment. Later changes create a qualified configuration epoch.

**Smallest useful experiment:** Delay one track’s first packet, return encoder-derived configuration different from the request, cancel before admission and introduce a later config change.

**Correctness gate:** Init configuration matches actual packets; no media emitted against stale config; no unbounded first-track queue; errors release provisional state; selected audio/video timing preserved.

**Stop/reopen rule:** If the existing FFmpeg route already handles this ordering, add tests only around new browser-encoder or module boundaries. Do not infer dynamic support from initial extradata setup.

**Measure only after correctness:** Avoided failed startup/reopen and bounded provisional memory; any latency reduction must include first-output preparation.

**Candidate canonical links:** `R059.construct-a-selected-track-mp4-view-without-remuxing-samples`; `R162.compile-a-qualified-mux-configuration-into-a-small-patch-program`; `R086.native-video-with-an-independent-generated-pcm-clock`

### EB09 — Preserve trim, codec delay and decoder preroll exactly once

**Disposition:** extension-of-accepted-lead. **Qualification wave:** first. **Accepted-audit relationships:** EA15, EA16.

**Source basis:** [S14: FFmpeg/FFmpeg](https://github.com/FFmpeg/FFmpeg/blob/cb5a63736a01a9673b63fffcd7dee025490ae376/libavcodec/bsf/trim.c); [S16: pdeljanov/Symphonia](https://github.com/pdeljanov/Symphonia/blob/ee35874b571a35a9a6e15d3bc9a3aaf8f11fbeee/symphonia-core/src/packet.rs); [S17: eshaz/wasm-audio-decoders](https://github.com/eshaz/wasm-audio-decoders).

**Proposed mechanism:** Keep audible sample bounds distinct from decoder input/recovery bounds. Use explicit rational/sample units and one responsible component for each trim or codec delay.

**Smallest useful experiment:** Use impulses and channel labels around AAC/MP3/Opus head/tail boundaries; seek near the start and into a stream; compare one-shot decode with chunked/mixed-route output.

**Correctness gate:** Reference sample count and impulse positions, no double trim or priming leakage, correct channel identities, and required recovery packets still supplied.

**Stop/reopen rule:** A wrapper must not silently discard side data it cannot represent. Preserve a working baseline or reject the new route when sample-accurate semantics are unavailable.

**Measure only after correctness:** Audio correctness and additional component admission; CPU only after equivalent samples and policies match.

**Candidate canonical links:** `R086.native-video-with-an-independent-generated-pcm-clock`; `R060.extract-in-band-closed-captions-from-compressed-video-headers`; `R220.scoped-transport-clock-normalization`; `R231.aac-exact-seek-needs-a-tool-aware-profile.report-continuity`; `R233.make-independently-resampled-audio-chunks-join-exactly`

### EB10 — Drive split playback from consumed media samples, not elapsed context alone

**Disposition:** extension-of-accepted-lead. **Qualification wave:** first. **Accepted-audit relationships:** EA15, EA16.

**Source basis:** [S06: videolan/vlc](https://github.com/videolan/vlc/blob/69b5246ae9d711affff002649ed009c4d4f3e31e/doc/clock.md); [S13: ffplayout/videojs-libav](https://github.com/ffplayout/videojs-libav/blob/main/packages/videojs-libav/src/audio-worklet.ts); [S21: bvibber/audio-feeder](https://github.com/bvibber/audio-feeder).

**Proposed mechanism:** Record actual queued/consumed media samples and intentional silence separately. Clock mappings must account for starvation, pause/resume, rate and device latency without inventing source progress.

**Smallest useful experiment:** Starve audio while video is buffered, pause/resume and change playback rate. Compare sink elapsed time, consumed frames and observed A/V markers before and after recovery.

**Correctness gate:** Bounded digital A/V skew with the chosen silence policy, no artificial accumulated progress after starvation, correct user-visible time and cancellation. Acoustic latency remains a separate qualification.

**Stop/reopen rule:** The observed videojs-libav sink alone does not prove a whole-player bug. Reuse existing mpv clock ownership unless a tested independent audio path requires this contract.

**Measure only after correctness:** Drift/recovery correctness and unnecessary resampling avoided; no generic CPU saving predicted.

**Candidate canonical links:** `R086.native-video-with-an-independent-generated-pcm-clock`; `R060.extract-in-band-closed-captions-from-compressed-video-headers`; `R220.scoped-transport-clock-normalization`; `R170.separate-audio-clock-drift-from-an-audio-latency-jump`

### EB11 — Make audio preload, batching and render deadlines separate budgets

**Disposition:** extension-of-accepted-lead. **Qualification wave:** next. **Accepted-audit relationships:** EA15, EA17.

**Source basis:** [S13: ffplayout/videojs-libav](https://github.com/ffplayout/videojs-libav/blob/main/packages/videojs-libav/src/audio-worklet.ts); [S21: bvibber/audio-feeder](https://github.com/bvibber/audio-feeder); [S22: GoogleChromeLabs/web-audio-samples](https://googlechromelabs.github.io/web-audio-samples/audio-worklet/design-pattern/wasm-ring-buffer/).

**Proposed mechanism:** Bound pre-gesture and decode queues with backpressure rather than silent overflow. Keep worker batch sizes, worklet quantum, warning thresholds and hard starvation deadlines separate.

**Smallest useful experiment:** Preload without a play gesture, exceed the candidate queue cap, vary kernel batch size and stall the producer. Change gain after audio is already enqueued.

**Correctness gate:** No lost initial samples or unbounded allocations, correct gain policy, worklet stays within the measured callback deadline, and source replacement clears only its own samples.

**Stop/reopen rule:** R014/R026-style generic batch/polling changes are not reopened by an example alone. Stop when current bounded queues and deadlines already meet this contract.

**Measure only after correctness:** Underruns, startup latency, queued media milliseconds and callback work; CPU and latency tradeoffs reported separately.

**Candidate canonical links:** `R086.native-video-with-an-independent-generated-pcm-clock`

### EB12 — Prefer qualified audio wrapping over unnecessary audio decoding

**Disposition:** extension-of-accepted-lead. **Qualification wave:** next. **Accepted-audit relationships:** EA15, EA18.

**Source basis:** [S17: eshaz/wasm-audio-decoders](https://github.com/eshaz/wasm-audio-decoders); [S18: eshaz/codec-parser](https://github.com/eshaz/codec-parser/blob/main/README.md); [S19: eshaz/mse-audio-wrapper](https://github.com/eshaz/mse-audio-wrapper).

**Proposed mechanism:** Reuse already parsed compressed frames, select a destination-specific audio container, and keep the browser as audio decoder where the exact configuration and fidelity are verified.

**Smallest useful experiment:** Feed identical parsed AAC/MP3/FLAC/Opus/Vorbis frames into applicable container alternatives, including partial-frame input, codec updates and discontinuity.

**Correctness gate:** Exact selected payloads where copy is promised; reference decoded duration/channels/timing; discarded bytes explicitly reported; true output verification rather than MIME acceptance.

**Stop/reopen rule:** Do not treat a wrapper’s output MIME list as a browser support matrix. Stop at an unsupported destination and retain the existing route.

**Measure only after correctness:** Avoided decode/encode work and native component coverage; include mux/parse/setup cost.

**Candidate canonical links:** `R086.native-video-with-an-independent-generated-pcm-clock`; `R132.incremental-mdat-sample-release.report-continuity`; `R133.append-moof-and-mdat-separately.report-continuity`; `R031.raw-aac-mp3-audio-beside-fragmented-video`; `R032.use-different-output-containers-for-different-tracks`

### EB13 — Choose seek-versus-skip using validated container boundaries

**Disposition:** existing-research-extension. **Qualification wave:** next. **Accepted-audit relationships:** EA11.

**Source basis:** [S12: bytedance/xgplayer](https://github.com/bytedance/xgplayer/blob/2c4e5f6c44af7a536b3b8c39c5f4f7567b08078e/packages/xgplayer-mp4-loader/README.md); [S23: feross/render-media](https://github.com/feross/render-media); [S28: jhiesey/videostream](https://github.com/jhiesey/videostream/blob/master/mp4-remuxer.js).

**Proposed mechanism:** Use known box lengths or verified metadata hints to avoid scanning irrelevant payload; decide whether to skip or reopen a range using measured source costs, not a copied constant.

**Smallest useful experiment:** Compare front/tail moov, large free boxes, stale hints, 64-bit sizes, zero-sized/truncated boxes, a server ignoring Range and local Blob input.

**Correctness gate:** Identical parsed metadata and selected sample offsets; no out-of-bounds read or unbounded retry; stale identity rejected; ignored Range responses handled explicitly.

**Stop/reopen rule:** Do not reopen R003’s stopped profile without a changed mechanism/source. If normal inspection already reads only useful ranges, keep adverse tests instead.

**Measure only after correctness:** Requests, fetched bytes and startup delay including request overhead; no expected gain percentage.

**Candidate canonical links:** `R140.cue-less-webm-native-seek.report-continuity`; `R349.seek-through-hierarchical-mp4-indexes-without-loading-the-whole-index`; `R003.coalesce-range-reads-around-useful-media-boundaries`

### EB14 — Construct checked metadata projections with bounded offset fixpoints

**Disposition:** new-mechanism-candidate-pending-dedup. **Qualification wave:** later. **Accepted-audit relationships:** EA01, EA11.

**Source basis:** [S27: axiomatic-systems/Bento4](https://github.com/axiomatic-systems/Bento4); [S29: legokichi/ts-ebml](https://github.com/legokichi/ts-ebml/blob/master/src/tools.ts); [S37: kaltura/nginx-vod-module](https://github.com/kaltura/nginx-vod-module).

**Proposed mechanism:** For an explicitly eligible source, create seek metadata or a virtual presentation without rewriting payload. Solve metadata-size/offset dependencies with checked arithmetic, a convergence bound and a failure fallback.

**Smallest useful experiment:** Use WebM recordings with cue offsets near encoded-size boundaries and MP4 mapped views; retain cluster/sample hashes and independently inspect the projected structure.

**Correctness gate:** All offsets resolve to intended source bytes; original file remains unchanged; unknown required metadata survives or eligibility rejects; malformed sizes and nonconvergence fail closed.

**Stop/reopen rule:** Do not generalize ts-ebml’s recording assumptions to arbitrary Matroska. A server packager’s architecture is not evidence that an equivalent browser view is cheap.

**Measure only after correctness:** Prepared bytes avoided, seek coverage and metadata construction cost, including index acquisition and source identity.

**Candidate canonical links:** `R059.construct-a-selected-track-mp4-view-without-remuxing-samples`; `R162.compile-a-qualified-mux-configuration-into-a-small-patch-program`; `R140.cue-less-webm-native-seek.report-continuity`; `R349.seek-through-hierarchical-mp4-indexes-without-loading-the-whole-index`

### EB15 — Use consumer-owned source-priority and cancellation leases

**Disposition:** extension-of-accepted-lead. **Qualification wave:** next. **Accepted-audit relationships:** EA03, EA10.

**Source basis:** [S24: webtorrent/webtorrent](https://github.com/webtorrent/webtorrent/blob/b6debb50cc02b2e56d71ea95b4bd9bfae4d0b4fd/lib/file-iterator.js); [S25: moq-dev/moq](https://github.com/moq-dev/moq).

**Proposed mechanism:** Attach requested ranges/groups, priorities and cancellation to playback, preview and inspection consumers. Releasing one consumer removes only its demand, not shared work still needed elsewhere.

**Smallest useful experiment:** Overlap playback and preview reads, cancel the preview, replace the source and deliver a late verified block. Inspect scheduler selections and producer completion.

**Correctness gate:** Playback continues; canceled consumers receive no stale data; shared verified data stays usable; no orphan demand/listener; unverified bytes never enter a trusted parser path.

**Stop/reopen rule:** Do not duplicate an already correct source scheduler. WebTorrent’s local iterator does not prove the scheduler’s overlap accounting; inspect that layer before adoption.

**Measure only after correctness:** Unnecessary fetched/verified bytes and cancel-to-quiescence time, preserving useful shared reads.

**Candidate canonical links:** `R208.make-cancellation-follow-media-dependency-boundaries`; `R006.offer-a-non-pthread-remux-path-without-isolation`; `R176.jspi-backed-synchronous-wasm-i-o`; `R318.decode-a-gop-once-for-exact-reverse-frame-playback.report-continuity`; `R360.retarget-in-flight-decoding-instead-of-restarting-a-forward-scrub`; `R334.share-one-demux-pass-across-independent-playback-and-export-timelines`; `R188.schedule-verified-playable-data`

### EB16 — Recover reconnect overlap with explicit identity and confidence levels

**Disposition:** new-mechanism-candidate-pending-dedup. **Qualification wave:** later. **Accepted-audit relationships:** EA16.

**Source basis:** [S20: eshaz/icecast-metadata-js](https://github.com/eshaz/icecast-metadata-js/blob/f648fa849b8c78edc5da86ec598f64ced470492a/src/icecast-metadata-player/src/FrameQueue.js); [S38: eshaz/synaudio](https://github.com/eshaz/synaudio/blob/main/README.md).

**Proposed mechanism:** Try bounded exact compressed-sequence overlap first; use PCM correlation only for an explicitly permitted alternative-source alignment. Record exact, estimated, ambiguous and unmatched outcomes.

**Smallest useful experiment:** Reconnect with duplicated compressed frames, changed packetization, a separately encoded overlap, silence, periodic audio and deliberate CRC-collision/false-match controls.

**Correctness gate:** Exact mode does not drop unique samples; byte-verify hash candidates; approximate mode reports confidence and bounded offset; ambiguous matches fall back without claiming continuity.

**Stop/reopen rule:** Do not use correlation as a fidelity oracle or automatically delete data on a hash hit. Keep this out of ordinary VOD seeking unless its source contract calls for it.

**Measure only after correctness:** Repeated-audio/stall avoidance, bounded alignment work and recovery latency; quality changes remain explicit.

**Candidate canonical links:** `R060.extract-in-band-closed-captions-from-compressed-video-headers`; `R220.scoped-transport-clock-normalization`

### EB17 — Keep clock epochs and transition metadata tied to their source

**Disposition:** extension-of-accepted-lead. **Qualification wave:** next. **Accepted-audit relationships:** EA09, EA16.

**Source basis:** [S03: WebKit/WebKit](https://github.com/WebKit/WebKit/blob/7213978fbc70cca1cfaca0253962a1559277bf67/Source/WebCore/platform/graphics/SourceBufferPrivate.cpp); [S06: videolan/vlc](https://github.com/videolan/vlc/blob/69b5246ae9d711affff002649ed009c4d4f3e31e/doc/clock.md); [S11: videojs/http-streaming](https://github.com/videojs/http-streaming/blob/a9f9d7ac0264b373f14da1bb2f2e7fe8f2775c4f/src/segment-transmuxer.js).

**Proposed mechanism:** Model source-time to presentation-time mappings as epochs with explicit rate/offset and flush rules. Clear GOP/configuration alignment state together when the epoch changes.

**Smallest useful experiment:** Combine nonzero starts, rate changes, seeks, period discontinuity and a delayed old-epoch metadata or sample event. Include unequal track tails and final drain.

**Correctness gate:** No offset applied twice, no stale GOP alignment, correct subtitle/audio/video markers, and EOS only after required presented output drains.

**Stop/reopen rule:** Do not replace Shaka or mpv clock management wholesale. Add a boundary adapter only where existing owners demonstrably disagree.

**Measure only after correctness:** Correct transitions and fewer avoidable reopenings; source timestamp fidelity before responsiveness.

**Candidate canonical links:** `R138.one-sourcebuffer-different-codec-and-container.report-continuity`; `R139.continuous-playback-through-h-264-fmp4-vp9-webm.report-continuity`; `R242.keep-decoder-sessions-continuous-across-transport-and-mux-boundaries.report-a`; `R060.extract-in-band-closed-captions-from-compressed-video-headers`; `R220.scoped-transport-clock-normalization`

### EB18 — Reuse subtitle content independently of placement updates

**Disposition:** extension-of-accepted-lead. **Qualification wave:** next. **Accepted-audit relationships:** EA12.

**Source basis:** [S31: libass/libass](https://github.com/libass/libass/blob/f61db567e6593df3470e91594bcd4ad2d0473aff/libass/ass.h); [S30: haasn/libplacebo](https://github.com/haasn/libplacebo/blob/e2972fdd09adacd383656738d7d280f0cd84a761/src/include/libplacebo/utils/frame_queue.h).

**Proposed mechanism:** Use renderer-provided output-change classes to separate unchanged content from position updates, while respecting frame/image lifetimes and font/layout generations.

**Smallest useful experiment:** Exercise static captions, moving ASS text, karaoke, font replacement and viewport resize; compare a full redraw baseline with reuse of unchanged content only.

**Correctness gate:** Independent libass/image reference where possible, identical required glyphs/colors/positions at sampled times, no stale pointer use or missed animated change.

**Stop/reopen rule:** R021 remains scoped by its existing negative result. This is only a reopening candidate if the change-class boundary removes work the prior experiment did not.

**Measure only after correctness:** Rasterizations/uploads versus placement updates and actual whole-player cost; no benefit assumed on already cached overlays.

**Candidate canonical links:** `R019.extract-embedded-ass-while-leaving-video-native`; `R021.cache-subtitle-tiles-and-schedule-only-useful-redraws`

### EB19 — Expose repairs and resynchronization instead of silently discarding data

**Disposition:** new-mechanism-candidate-pending-dedup. **Qualification wave:** first. **Accepted-audit relationships:** EA06, EA18.

**Source basis:** [S18: eshaz/codec-parser](https://github.com/eshaz/codec-parser/blob/main/README.md); [S29: legokichi/ts-ebml](https://github.com/legokichi/ts-ebml/blob/master/src/tools.ts); [S34: MediaArea/MediaConch-Implementation](https://github.com/MediaArea/MediaConch-Implementation); [S36: gpac/ComplianceWarden](https://github.com/gpac/ComplianceWarden/blob/master/README.md).

**Proposed mechanism:** Every skip, repaired field, inferred duration or rejected metadata element has an explicit reason and input/output range. Separate strict-file fidelity, explicit salvage and live concealment policies.

**Smallest useful experiment:** Inject junk between audio frames, malformed EBML sizes, truncated initialization and metadata disagreements. Compare strict, diagnostic and opt-in repair paths.

**Correctness gate:** No silent data loss classified as preservation; unchanged path remains byte-identical when valid; repair budget bounded; unsupported semantics return an explicit outcome.

**Stop/reopen rule:** Do not turn a permissive parser into an automatic arbitrary-file fixer. Avoid implementing validation rules that cannot be sourced or independently checked.

**Measure only after correctness:** Correct admission, trustworthy diagnostics and fewer hidden fidelity failures; validation overhead measured separately.

**Candidate canonical links:** `R091.in-band-video-configuration-changes-with-avc3-and-qualified-hev1`; `R099.expose-an-hdr10-compatible-dolby-vision-base-without-video-re-encoding`; `R243.remove-nonessential-h-264-sei.report-c`; `R132.incremental-mdat-sample-release.report-continuity`; `R133.append-moof-and-mdat-separately.report-continuity`

### EB20 — Build an oracle matrix with independent structural and behavioral references

**Disposition:** qualification-campaign. **Qualification wave:** first. **Accepted-audit relationships:** EA01, EA05, EA07, EA18.

**Source basis:** [S26: gpac/gpac](https://github.com/gpac/gpac); [S27: axiomatic-systems/Bento4](https://github.com/axiomatic-systems/Bento4); [S32: web-platform-tests/wpt](https://github.com/web-platform-tests/wpt/blob/34cfec8be4420b39fd7845691b7841a0998074a6/webcodecs/videoDecoder-codec-specific.https.any.js); [S33: ietf-wg-cellar/matroska-test-files](https://github.com/ietf-wg-cellar/matroska-test-files); [S34: MediaArea/MediaConch-Implementation](https://github.com/MediaArea/MediaConch-Implementation); [S35: gpac/testsuite](https://github.com/gpac/testsuite/blob/master/README.md); [S36: gpac/ComplianceWarden](https://github.com/gpac/ComplianceWarden/blob/master/README.md).

**Proposed mechanism:** Separate container validity, decoded output, metadata fidelity, lifecycle and route ownership. Record implementation lineage so two FFmpeg-based tools are not counted as independent votes.

**Smallest useful experiment:** Select one relevant positive and negative fixture per mechanism, use a second structural parser, and add WPT-style reset/flush sequences to the same marked-output playback fixture.

**Correctness gate:** The negative control actually fails for the expected reason; spec version and oracle tolerance recorded; fixture validity is not mistaken for browser playback or HDR fidelity.

**Stop/reopen rule:** Do not download/run every corpus blindly or let majority agreement replace a clear contract. Stop broad fixture expansion that does not change a research decision.

**Measure only after correctness:** Evidence quality and regression detection, with corpus/licensing/setup costs recorded; not a playback speed experiment.

**Candidate canonical links:** `R059.construct-a-selected-track-mp4-view-without-remuxing-samples`; `R162.compile-a-qualified-mux-configuration-into-a-small-patch-program`; `R262.configuration-interval-seek`; `R132.incremental-mdat-sample-release.report-continuity`; `R133.append-moof-and-mdat-separately.report-continuity`

### EB21 — Limit live work by dependency-group deadlines, not VOD policy

**Disposition:** new-mechanism-candidate-pending-dedup. **Qualification wave:** later. **Accepted-audit relationships:** EA03, EA13.

**Source basis:** [S25: moq-dev/moq](https://github.com/moq-dev/moq); [S20: eshaz/icecast-metadata-js](https://github.com/eshaz/icecast-metadata-js/blob/f648fa849b8c78edc5da86ec598f64ced470492a/src/icecast-metadata-player/src/FrameQueue.js).

**Proposed mechanism:** For a declared live-latency policy, stop consuming superseded media groups and select a valid newer random-access group. Tie subscription demand to active playback, not unconditional producer work.

**Smallest useful experiment:** Delay one group while delivering later groups, pause/resume the consumer and vary queue pressure. Run a separate strict-VOD control that must not use lossy skipping.

**Correctness gate:** No display of dependent frames without their closure; skipped intervals reported; timeline and audio/subtitles resynchronize; VOD control retains required content.

**Stop/reopen rule:** No new transport dependency unless product scope needs it. Preserve the existing packaged-stream owner and avoid conflating evolving protocol behavior with standards guarantees.

**Measure only after correctness:** Live lateness and stale-work reduction under explicit loss policy, not equal-output CPU savings.

**Candidate canonical links:** `R208.make-cancellation-follow-media-dependency-boundaries`; `R006.offer-a-non-pthread-remux-path-without-isolation`; `R176.jspi-backed-synchronous-wasm-i-o`; `R125.buffer-according-to-predicted-decode-work`; `R267.deadline-slack-before-optimization`

### EB22 — Publish narrow contracts for prepared-media reuse and virtual presentations

**Disposition:** existing-research-extension. **Qualification wave:** later. **Accepted-audit relationships:** EA01, EA11, EA14.

**Source basis:** [S05: mpv-player/mpv](https://github.com/mpv-player/mpv/blob/c6c4c38d7f4aa82ad2a29a4c3b142f19123f5b9e/demux/demux.c); [S10: Yahweasel/transavormer](https://github.com/Yahweasel/transavormer); [S26: gpac/gpac](https://github.com/gpac/gpac); [S37: kaltura/nginx-vod-module](https://github.com/kaltura/nginx-vod-module).

**Proposed mechanism:** Separate source identity, selected tracks, transform recipe, metadata epoch and destination representation in reusable prepared state. Share immutable work while keeping live parser/decoder clocks independent.

**Smallest useful experiment:** Open the same source for playback, preview and export; vary one track, recipe or destination at a time. Force cancellation of one consumer and source identity change.

**Correctness gate:** Reuse only when dependencies match, no stale timeline state, original payload checks pass, and selected owners remain isolated through failure.

**Stop/reopen rule:** This is not a license to construct a universal graph engine. Reuse existing R018/mpv/FFmpeg facilities first; stop if bookkeeping exceeds saved preparation.

**Measure only after correctness:** Repeated preparation, distinct assets/compilations and source reads, with retained-memory and invalidation cost.

**Candidate canonical links:** `R059.construct-a-selected-track-mp4-view-without-remuxing-samples`; `R162.compile-a-qualified-mux-configuration-into-a-small-patch-program`; `R140.cue-less-webm-native-seek.report-continuity`; `R349.seek-through-hierarchical-mp4-indexes-without-loading-the-whole-index`; `granular-engine-loading`; `unified-hybrid-software-engine`; `R018.cache-prepared-media-by-timeline-and-transformation-recipe`

## What not to infer or import

A browser internal class is not a browser API. Native buffer-pool allocation and GPU mapping mechanisms can motivate ownership contracts, but their native facilities cannot simply be called from JavaScript.

A remuxer's output format list is not a browser support guarantee. A WebCodecs-shaped polyfill is not hardware acceleration. An audio correlation peak is not sample identity. A structural validator pass is not a decoded-image, surround-channel, HDR-output or whole-player lifecycle pass.

A larger queue can hide transient starvation while increasing latency or retention. A smaller logical view can retain the same large backing allocation. Fewer mappings can save presentation work without changing decoding. A server packager's cache advantages must include the equivalent browser setup, memory and request costs before comparison.

Do not adopt silent discard, resynchronization, downmix or live-skip policies under a fidelity-preserving label. Do not delete opaque metadata simply because it is unused by a minimal fixture. Do not copy old browser-support tables or sample thresholds into production policy.

## Source and fixture rights

No third-party source files, binaries, fonts or media fixtures are redistributed by this package. Source links and file identities are retained. Before copying code or downloading fixtures, check the exact file-level license, generated/linked dependency provenance and media attribution. A repository's top-level badge does not establish a Wasm bundle's complete license. The accepted audit's existing restricted-source gates remain in force.

## Search completeness and remaining depth

This is a broad, layered ecosystem search rather than a star-count list: browser owners, other controllers, native pipelines, byte sources, audio specialists, mux/demux utilities, subtitle/rendering contracts and independent evidence sources were included. Dependency families and renamed/mirrored repositories were distinguished to avoid artificial breadth.

It is not proof that every relevant repository was found. Deeper audits still require current Demuxe-code comparison, the exact deployed upstream versions, browser/OS/driver-specific execution and relevant real-bitstream fixtures. Documentation-only targets have not received implementation audits. Closed-source player internals, DRM-system internals and hardware firmware are outside this source campaign.

The useful next work is not an indiscriminate hunt for more names: first close the named code-depth and Demuxe-gap questions for mechanisms that have a clear test and a plausible route benefit. Preserve successful existing routes and scoped negative research decisions.

## Package contents

- `AUDIT.md`: this report, including all 38 target notes and 22 cards.
- `audit-ledger.json`: machine-readable targets, provisional relationships and falsifiable experiment contracts.
- `sources.json`: reviewed source locations, commit/blob distinctions and evidence levels.
- `search-coverage.json`: search families, identity resolutions and explicit coverage limits.
- `RUNBOOK.md`: instructions for canonical deduplication and selective local qualification.
- `validate_package.py` and `package-validation.json`: integrity checks of this artifact package only, not media tests.
- `SHA256SUMS.txt`: hashes of the packaged files.

