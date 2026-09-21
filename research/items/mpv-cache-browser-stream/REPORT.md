<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Bounded mpv cache investigation

**Enabling mpv caching substantially improved interruption tolerance in this experiment. Production defaults and routing remain unchanged.** The normal bounded strategy and one same-total-budget tuning merit further qualification.

Exact configuration, raw samples/events, Range traces, CPU/RSS, source/packet/audio/video diagnostics, startup and completed-seek measurements are in [metrics.json](evidence/metrics.json) and its referenced run directories. [Reproduction](README.md), [measurement corrections and limitations](METHOD-NOTES.md), and [media attribution](NOTICES.md) accompany the evidence.

**Configurations.** Browser reference: actual Demuxe NativePlayer, direct HTTP MP4, `preload=auto`, remux disabled. Hybrid/Software use the frozen actual WasmPlayer backends. Router/probing/UI costs are excluded. Within each mode, decoder, presenter, audio configuration, source bytes and binaries are identical.

| Setting | Current | Normal strategy, bounded | Tuned, high-bitrate only |
|---|---:|---:|---:|
| `cache` | `no` | `yes` | `yes` |
| `demuxer-max-bytes` | 32 MiB | 32 MiB | 24 MiB |
| `demuxer-max-back-bytes` | 8 MiB | 8 MiB | 16 MiB |

All three retain runtime-queried mpv v0.40.0 settings: `cache-secs=3600000`, `demuxer-readahead-secs=1`, `demuxer-hysteresis-secs=0`, `demuxer-seekable-cache=auto`, `cache-pause=yes`, `cache-pause-wait=1`, `cache-pause-initial=no`, `demuxer-thread=yes`, and `cache-on-disk=no`. No other tuning was applied. A separate `cache=auto` Hybrid probe behaved like the current baseline: approximately one second ahead, no seekable packet ranges. Explicit `yes` is necessary here. The pinned [mpv implementation](https://github.com/mpv-player/mpv/blob/v0.40.0/demux/demux.c) explains how `yes` enables readahead and cache seeking; raw `paused-for-cache` events confirm that this build can pause for starvation even with `cache=no`.

**Environment and workload.** macOS 26.5.2, MacBookAir10,1, 8 GiB RAM, headed Chrome 152.0.7977.83, fresh browser/profile per trial; frozen revision `ee7fe7774270fe34fe617cb0dd5adb9d9e9f689e` plus captured dirty state. User workloads remained running. Licensed Big Buck Bunny derivatives, 30 fps, AAC stereo:

| File | Video | Duration | File size |
|---|---|---:|---:|
| H.264 | 640×360 | 90 s | 22.35 MiB |
| HEVC | 960×540 | 90 s | 62.78 MiB |
| High | H.264 960×540, added temporal noise | 90 s | 173.77 MiB |
| Long | H.264 640×360 | 634.60 s | 155.05 MiB |

The controlled Demuxe test server supports closed, open-ended and suffix Ranges, no-store responses, and one aggregate media-rate budget. After startup: 100 Mbps for 10 s → 1.5× file bitrate for 10 s → 1.05× for 10 s → zero writes for 8 s → 2× for 12 s. These are sequential phases with cache carryover. Runtime assets are unthrottled. Additional cold starts use 1.05× bitrate; the 2× high-bitrate playback screen uses five 8 s phases to avoid EOF. No RTT or packet loss was emulated.

**Buffering results.** Cells are buffering-event count / total seconds, from Native waiting/playing or mpv paused-for-cache transitions. Independently detected ≥500 ms timeline freezes corroborated the main outcome. Baselines resumed about 0.6–0.9 s after network restoration; all cache-enabled 1× cases and Native maintained progression through the outage.

| File, 1× | Native | Hybrid no | Hybrid yes | Software no | Software yes |
|---|---:|---:|---:|---:|---:|
| H.264 2.08 Mbps | 0 / 0.00 | 1 / 8.24 | 0 / 0.00 | 1 / 8.44 | 0 / 0.00 |
| HEVC 5.85 Mbps | 0 / 0.00 | 1 / 8.00 | 0 / 0.00 | 1 / 7.91 | 0 / 0.00 |
| High 16.20 Mbps | 0 / 0.00 | 1 / 8.22 | 0 / 0.00 | 1 / 8.27 | 0 / 0.00 |
| Long 2.05 Mbps | 0 / 0.00 | 1 / 8.19 | 0 / 0.00 | 2 / 8.43 | 0 / 0.00 |

At 2× on the high-bitrate file, Native had **3 / 3.96 s**, Hybrid no **7 / 15.95 s**, Hybrid yes **1 / 8.05 s**, Software no **7 / 15.41 s**, Software yes **1 / 7.80 s**. The 1.5×/1.05× network phases are below 2× playback consumption. Native initially buffered about 25 media seconds versus 14 at 1×; mpv stayed around 16 under its fixed byte cap. This is a rate/throughput stress screen, not full 2× fidelity qualification.

**Preload and requests.** Current mpv buffered approximately one demux second. With cache enabled, high-bitrate forward seek coverage was roughly 14–16 s; the long source had a measured packet range of approximately **22.17–166.70 s at playback position 51 s**, showing old-packet eviction and partial-file retention. Native exposed roughly 14–25 s ahead across the tested 1× sequences. Native `seekable` could cover the entire remote file while `buffered` covered only part; even a target in `buffered` sometimes caused refetching.

The following is startup plus network-sequence server body MiB / requests, **before the original seek section**. No overlapping/refetched body bytes occurred in this portion. These are server writes, not wire bytes; cancellation can overstate delivery. Client RangeReader fetched-byte counters and all seek-related overlaps are separately retained.

| File | Native | Hybrid no | Hybrid yes | Software no | Software yes |
|---|---:|---:|---:|---:|---:|
| H.264 2.08 Mbps | 19.2 / 1 | 11.0 / 49 | 22.3 / 90 | 10.8 / 49 | 22.3 / 90 |
| HEVC 5.85 Mbps | 48.8 / 1 | 29.5 / 123 | 62.8 / 257 | 29.2 / 122 | 62.8 / 257 |
| High 16.20 Mbps | 132.8 / 1 | 86.0 / 349 | 130.8 / 528 | 85.1 / 346 | 130.2 / 526 |
| Long 2.05 Mbps | 19.1 / 1 | 11.0 / 49 | 41.5 / 171 | 11.0 / 49 | 41.5 / 171 |

Native normally started with `bytes=0-`; later seeks could cancel/reopen an open-ended response. Wasm used serial ≤256 KiB ranges (`0-262143`, `262144-524287`, then offsets requested by the demuxer). Enabling cache changes read demand, not that transport granularity. More transfer includes both extra preload and more successfully played media during the outage.

**Startup, memory and CPU.** Fast-start backend-open times were 0.39–0.49 s Native and 0.72–1.49 s Wasm; first timestamped source-frame observations were 0.39–0.48 s Native and 0.85–1.57 s Wasm. At near-bitrate cold H.264 startup, source frames appeared at 1.13 s Native, 1.80/1.70 s Hybrid no/yes, and 1.49/1.54 s Software no/yes. No consistent startup advantage from caching is established. Backend-ready/open/source-frame timings are separate in the data; Wasm samples have up to 200 ms diagnostic uncertainty and include option-readback overhead.

Keep these memory owners separate:

- Source byte cache: unchanged 16 MiB JS LRU, one ≤256 KiB active read. No playable seconds are inferred from its bytes.
- Demux packets: current peaks roughly 0.46–2.86 MiB; enabled peaks 24.79–40.04 MiB. Packet-granularity overshoot is possible; the packet options are not an exact allocator ceiling.
- Decoded video/audio: unchanged decoder/presenter paths, Hybrid retained-frame cap 16 (observed peak ≤7 in the main matrix), mpv `audio-buffer=0.1`, and 8192-frame PCM ring. Invalid epoch-reset queue-counter samples are excluded from occupancy, retained raw.
- Wasm: **128 MiB peak committed linear memory in every measured Wasm trial**, with the unchanged 1 GiB hard module maximum and 128 MiB per-allocation FFmpeg limit. Live/peak malloc usage and opaque browser decoder allocations are unavailable. Equal committed heap does not mean packet caching is free.

Fast-phase Chrome CPU, including prefill, spanned Native 34–41%, Hybrid no/yes 56–67% / 44–68%, Software no/yes 50–85% / 59–88% of one logical core. Summed process RSS was about 839–902 MiB Native and 889–1093 MiB Wasm, with shared-page double counting and substantial run variation. These measurements do not establish CPU or total-memory savings. Server CPU and physical energy are excluded.

**Completed seeks and cache reuse.** Corrected oracle/seek trials passed for all 20 base cells plus both tuned cells. Across the four fixtures, confirmed latency ranges were:

| Configuration | Back 5 s | Forward 5 s | Distant, 80% of duration |
|---|---:|---:|---:|
| Native | 36–290 ms | 13–65 ms | 36–227 ms |
| Hybrid no | 302–518 ms | 296–569 ms | 316–441 ms |
| Hybrid yes | 266–498 ms | 263–294 ms | 271–414 ms |
| Software no | 302–502 ms | 355–581 ms | 360–655 ms |
| Software yes | 305–500 ms | 330–453 ms | 336–648 ms |

Those trials follow the 10/30 s image checks; their cache history differs from continuous playback. A separate continuous high-bitrate repeat found the 32/8 MiB strategy missed the 5 s back target. Redistributing the same budget to **24/16 MiB** kept the outage smooth and changed backward latency **588→317 ms Hybrid**, **498→412 ms Software**, with **zero new requests and zero low-level seeks** for that backward seek. Forward targets reused packets too, but triggered 36/38 requests to refill ahead. Forward coverage fell to about 11–12 s. Distant seeks still read the source. This is one scoped tuning run, not a universal preset recommendation.

Every measured trial closed its player surfaces/workers and active media requests; tracked Chrome processes exited. Original acknowledgement-only seek timings and an early wrong-picture capture remain archived but are excluded from completed-seek claims. [Method notes](METHOD-NOTES.md) explain these corrections, the idle-render first-frame correction, and remaining observation limits.

**Default and next experiment.** `cache=no` remains a defensible shipping default while qualification is incomplete: it uses less packet storage and avoids aggressive preload; the normal enabled strategy can evict useful source-cache history and still misses some nearby high-bitrate seeks. This experiment establishes no bridge incompatibility that requires disabling mpv caching. Keep defaults unchanged now. Next, repeat 32/8 versus 24/16 MiB with realistic 50–100 ms RTT, memory pressure and >15 s interruptions on another browser/device; the existing RangeReader deadline is a separate recovery risk. Then assess a modest `cache-secs` cap for low-bitrate overfetch before considering integration.

**mpv cache looks promising for Hybrid/Software**
