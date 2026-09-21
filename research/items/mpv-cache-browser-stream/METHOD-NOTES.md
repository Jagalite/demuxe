<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Measurement qualifications and follow-ups

The original `PLAN.md` is retained. These findings refine observation, not
production behavior or the image-comparison acceptance threshold.

1. **Seek command versus presentation.** The internal Wasm backend resolves its
   command promise before the target frame is presented. The public `Player`
   subsequently waits for timestamped presentation and `confirmSeek()`. The
   original harness omitted that second step. Therefore **v1 seek latency is
   command acknowledgement only**, and rapid successive v1 seeks can overlap.
   Do not use those latency or per-seek reuse results for a completed-seek claim.
   `page-v2.mjs` checks the actual presentation timestamp, `seeking` state and
   mpv `confirmSeek()`; Native waits for a matching video-frame callback. The
   original network sequence finishes before these seeks, so its continuous
   playback/cache/outage observations remain applicable. Total transfer counts
   including v1 seeks must disclose that protocol; use pre-seek counts for the
   main network comparison.

2. **Idle render versus source first frame.** Software may render a black idle
   canvas during engine initialization. The raw v1/v2 `firstFrame` counter can
   therefore precede a source video track. `analyze.py` retains that raw field
   and separately derives `qualifiedSourceFrame`: the first sample with a
   selected source-video track, timestamped presentation and a rendered/drawn
   frame. Use this derived field for Wasm first-frame comparisons (100 ms
   sampling and up to 200 ms diagnostic cadence). Native uses its rVFC/frame
   observation. None is physical photon timing. Startup includes mpv option
   readback overhead and excludes browser launch/router/probing/UI.

3. **Property observation lag.** Demux-cache property notifications and worker
   diagnostics can lag command acknowledgement. Per-seek deltas are taken from
   the last sampled state in the 500 ms post-completion observation window,
   not just the immediate command reply. Background prefetch can create requests
   during a cache-hit seek: correlate target membership, low-level seek counters,
   source reads and server ranges. Native `buffered` did not guarantee zero new
   requests on high-bitrate backward seeks. Byte cache is never converted to time.

4. **Initial wrong-picture record.** One original high-bitrate Software baseline
   screenshot was the wrong scene after the acknowledgement-only seek, then an
   identical repeat passed. Retain both. This is not established as a production
   seek defect or a cache fix. The corrected observer rechecks the whole matrix.

5. **Single justified tuning.** At 16.197 Mbps the normal 32/8 MiB allocation
   protected the eight-second outage, but the reported packet range started
   after the five-second-back target. Test `cache=yes`, forward 24 MiB, backward
   16 MiB; all other defaults unchanged. Total configured packet budget remains
   40 MiB. Test output/cleanup first, then repeat the high-bitrate network sequence.

6. **Follow-up protocols.** Corrected correctness trials additionally measure
   completed short backward, short forward, and distant seeks after the 10/30 s
   oracle checks. This cache history differs from the 50 s network sequence and
   is labeled separately. Cold-start follow-up uses 1.05x file bitrate from the
   first media request. The 2x high-bitrate follow-up uses five 8 s phases; network
   rates remain relative to file bitrate, so 1.05x file bitrate is only 0.525x
   playback consumption. The shorter 40 s sequence avoids the 90 s fixture EOF.

7. **Auto is not explicit enablement.** A separate H.264 Hybrid `cache=auto`
   probe retained approximately one second of demux readahead and no seekable
   packet ranges. Explicit `cache=yes` is needed for the candidate behavior on
   this callback stream. Actual `paused-for-cache` occurred during baseline
   outages even with `cache=no`; do not infer runtime pause behavior solely from
   the upstream manual's network-cache wording.

   Page-target CDP network events cover Native media requests. Worker-owned
   Wasm fetches are accounted for by RangeReader counters and the controlled
   server, so their page-target `network.json` can be empty. Server body writes
   may exceed bytes delivered to the client on cancellation; they are not wire
   bytes or a complete browser-internal allocation measurement.

8. **Limits.** One shared M1/8 GiB macOS host and Chrome build; user processes
   remain active. No RTT/loss emulation, full-title playback, physical audio/A-V
   synchronization, allocator live-byte peak, hardware-power measurement, or
   browser-family qualification. Rebuffer events are >=500 ms timeline plateaus
   corroborated by cache underrun/pause or Native readiness, with approximately
   100–200 ms observation uncertainty. No 20-second outage beyond the existing
   15-second RangeReader request deadline is included.

9. **Harness and counter cleanup.** The initial server's raced event waits left
   losing EventEmitter listeners attached until response close, producing a
   `MaxListenersExceededWarning` on long Native responses. After measurements,
   the reproducible harness was repaired to detach both listeners on completion;
   the aggregate-rate/Range/stall test was rerun. Frozen run copies preserve the
   server actually measured. No production code or pacing policy changed.
   An out-of-range unsigned PCM queue difference was observed during a v1 seek
   epoch reset. Keep the raw sample, exclude values above the physical 8192-frame
   ring capacity from occupancy peaks, and do not interpret wraparound as memory
   allocation. Backend buffering event totals and >=500 ms timeline-freeze totals
   are both recorded; the former includes shorter buffering episodes.
