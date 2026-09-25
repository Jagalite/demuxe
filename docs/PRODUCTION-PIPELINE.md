<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Maintained Native playback paths

Worker-capable browsers now run the existing remux scheduler and MSE owner in a dedicated worker. Its source-reader and FFmpeg workers remain separate. Transferable encoded buffers travel directly from the producer to the MSE owner; the window receives a MediaSourceHandle, element operations, and bounded diagnostic snapshots. The maintained producer uses pthread Wasm and requires cross-origin isolation. Browser-native routes remain usable without isolation.

The public Player modes and complete-plan admission remain unchanged. Native remux diagnostics distinguish `mseOwner`, `fragmentTransport`, and `delivery.mode`. A worker construction/attachment or SourceBuffer capability failure before media append falls back to the window owner. Source transport failures retain their original meaning. Audio adaptation retains its existing window owner. Worker-owned seeks currently regenerate the bounded presentation; the optional window buffered-seek optimization is not enabled in the worker owner.

The `native-video-mpv-audio` plan uses the maintained FFmpeg packet-copy remux producer in video-only mode. The browser owns video decode, presentation and the master media clock. A second reader in a separate mpv service selects and decodes AC-3 or DTS audio only, then feeds timestamped PCM through the existing shared ring and an AudioWorklet. This route uses the window MSE owner so the video element and audio controller can transact seeks and rate changes together. Hybrid remains the next automatic plan on diagnosed selective-route failure. The route's admission and browser scope are documented in [Playback tier policy](PLAYBACK-TIER-POLICY.md#native-video-with-mpv-audio).

The existing scheduler still owns append/update completion, source generations, seek restarts, EOF, RAP-aware eviction, buffering limits, and producer pull backpressure. New parts cannot advance an append until its updateend has been consumed, even if `SourceBuffer.updating` is already false. Shutdown first cancels the source mailbox and terminates child workers, then retires the MSE owner. Worker and window paths share that scheduler.

## Selected-track MP4 view (R059)

Before local packet-copy preparation, a bounded metadata adapter can select audio in an ordinary, immutable three-track MP4: one AVC video followed by two AAC tracks, IDs 1/2/3, 32-bit boxes, one mdat, bounded moov, equal declared movie/track tails, at most one ordinary unit-rate edit per track, an unambiguous default audio selection, and self-contained codec/data references. Both possible selected views must pass the maintained conservative MP4 metadata admission. Unknown structures, dependencies, fragmented MP4, external data, other codecs, and remote sources retain FFmpeg remux. Browser startup failure falls back to normal remux.

The view composes original Blob slices with same-size rewritten metadata. Selected sample tables, offsets, coded samples and timestamps are unchanged. Unselected media bytes remain present: this is not a redacted or exported file. Front/tail moov, exact decoded video/PCM, marked selected browser audio, track switching, seeks and EOF were checked. `backend.projection.route` reports `selected-mp4-view`; the existing public Native remux plan/track identity stays intact.

This branch plays through the browser's ordinary file destination. It does not turn a nonfragmented MP4 into MSE segments, and does not pass through the R005/R132/R133 chain. Combining that branch with MSE would require a separately qualified construction contract.

## Fragment delivery (R132/R133)

The producer/consumer protocol accepts initialization, ordered fragment parts, and a completion marker for the outstanding pull ID. It is independent of window/worker MSE ownership. At most one bounded producer operation is outstanding. Cancellation retires the worker generation and queued pieces; stale operations cannot append into its replacement.

The default separate-buffer path avoids application gathering for MP4 batches of at least 128 KiB with 2–32 owned callback buffers. Small batches and other containers keep existing gathering/single-buffer reuse. This avoids one application copy, not FFmpeg's own buffering or browser copies. Extra append calls are charged in the measurements.

An internal `RemuxPlayer` option, `fragmentDelivery: 'progressive'`, additionally parses qualified relative moof/traf/tfhd/tfdt/trun output at the actual Wasm write callback. It releases metadata and only byte ranges ending at complete, proven sample boundaries; rejects address gaps, overlaps, unproven decode time, malformed or truncated tails; and permits a complete final mfra trailer. Unsupported headers fall back before any progressive metadata is emitted. A corrupt tail after admission fails the session. Selected-audio adaptation and unknown layouts are excluded.

Progressive delivery is **not the default**. Current FFmpeg produces its internal fragments before serializing their callbacks; no artificial delayed tail was added to claim a gain. The tested progressive adapter copied approximately as many bytes as gathering and showed no clear benefit over separate-buffer delivery. It is available for bounded regression/producer qualification, not a public Player option or a general startup-speed promise.

## Compiled mux patches (R162)

No new patch constructor is enabled. The authoritative template experiment requires a fixed, video-only, one-sample 104-byte moof. None of the 120 inspected maintained-output fragments matched even that template's size. Current remux construction is inside FFmpeg; a JavaScript patch pass over its completed output would not replace that work. A new generic muxer is outside the contract.

D09 absolute addressing and D10 authored missing-tfdt continuity remain handled by the existing demux/mux implementation. Fresh maintained-Player captures again match the ordinary remux control's full decoded video and PCM. Arbitrary relocation or missing-time repairs are not admitted by the progressive adapter.

## Evidence and limits

[Production qualification report](../research/shared/runs/20260921T203100Z-production-pipeline/analysis.md) separates per-item and combined results, including regressions and failed development runs. Chrome qualification is bounded; fallback behavior remains essential elsewhere. Timings are descriptive small paired samples. Startup/seek regressions are retained, no savings are added across overlapping mechanisms, and no hardware acceleration, physical A/V latency, endurance, or release certification is claimed.

[Worker lifecycle review and fixes](../research/shared/runs/20260921T223200Z-worker-mse-review/analysis.md) cover pause intent during recovery and awaiting an already pending shutdown. The intermittent browser retirement observation remains documented separately.
