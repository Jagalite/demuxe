# Demuxe — R353–R357 executed research results

**19 September 2026 · 5 exact proposal cards · 55/55 QA checks passed · no production source changes**

Environment: Chromium 144.0.7559.96, FFmpeg 7.1.5, Python 3.13.5, Node 22.16.0, FLAC 1.5.0, libebur128 1.2.6.

## Decision summary

| ID | Verdict | Decisive result |
|---|---|---|
| R353 | **BLOCKED — browser capability** | Ordinary MediaSource exists, but ManagedMediaSource and ManagedSourceBuffer are both undefined in this Chromium build. No synthetic-demand result is promoted to a browser result. |
| R354 | **PROMISING handoff component / memory value unproven** | One MediaSource stayed alive through a prep-worker switch. Old WebAssembly.Memory was 64 MiB; replacement was 128 KiB. The first continuation fragment was byte-verified, corrupt replacement rejected, stale old generation ignored, and playback reached EOF. |
| R355 | **PROMISING explicit normalization / built-in merge insufficient** | `merge_pmt_versions=1` collapses PID migration to two streams but reorders one H.264 AU. Explicit validated PID→logical-track normalization preserved all 200 video and 376 audio payloads, PTS/DTS, exact decode, seek and browser EOF. |
| R356 | **PROMISING exact mechanism / tradeoff** | First-order independent stereo FLAC was converted to truthful mid/side using parity-state residuals. libFLAC and FFmpeg decode exactly; file size fell 14175→13237 B (-6.62%). Naive residual averaging fails on 1030 residuals. |
| R357 | **PROMISING / strong repeated-query cache** | Sorted pre-gate window energies reproduce direct libebur128 gain runs within 4.30e-13 LU. 500 queries were 70.9× faster on a 138,800-window replicated history; measured setup break-even ≈27.7 queries. |

## R353 — ManagedMediaSource-driven production

The first gate is decisive. On the permitted Chromium page, `MediaSource` is present and worker construction is supported, but both `ManagedMediaSource` and `ManagedSourceBuffer` are undefined. The card explicitly requires real browser demand/eviction behavior before claiming scheduling or energy value, so this is **BLOCKED**, not a failure of packet-copy remuxing.

## R354 — replaceable preparation worker

An eight-fragment H.264/AAC fMP4 was used as the immutable packet-copy output. The media owner remained on the page. The old worker owned a deliberately grown 64 MiB `WebAssembly.Memory`; after three fragments, the page constructed a fresh worker with a 128 KiB memory, supplied the continuation index, requested the next fragment from both generations, and committed only after a byte-for-byte match. The old worker was then terminated and the new worker produced the remaining fragments.

The browser buffered 0–8.021353 s and reached EOF with no media error. A deliberately corrupted replacement fragment was rejected and a stale generation token was ignored. The exact init segment plus the eight fragment slices reconstruct the fragmented file byte-for-byte, and source video/audio coded payload hash sequences are preserved.

This proves the **ownership/handoff primitive**, not real OS memory reclamation or a complete Wasm remux-worker speedup. The 64 MiB high-water is actual WebAssembly memory but synthetic scratch; a production test still needs a measured real preparation spike and process-memory accounting.

## R355 — MPEG-TS PID migration

The fixture is one continuous H.264/AAC program split at a fresh TS/PES boundary. In the second segment, video PID 256→288 and audio PID 257→289, PCR follows video, and PMT version increments. Without PMT merging FFmpeg exposes four streams. With `merge_pmt_versions=1` it reuses two logical streams and audio remains exact, but one H.264 access unit immediately before the transition is held until EOF, so video packet order and decoded output are not reference-equivalent. The behavior reproduced without B-frames and with AUD NALs.

The explicit candidate validates the unique H.264/AAC identity transition and maps the new transport PIDs back to stable downstream logical PIDs. That output has exactly 200/200 video packets and 376/376 audio packets with identical payload hashes, PTS and DTS to the stable-PID reference; decoded A/V is exact. Remuxing that normalized transport to MP4 gives Chromium readyState 4, a successful mid-file seek, zero waiting events in the measured run, and EOF at 8.021333 s.

The durable finding is therefore not “enable FFmpeg's merge option.” It is that **transport addresses must be normalized behind a separately validated logical-track identity**, and the generic merge path is not sufficient for this H.264 boundary.

## R356 — parity-state residual mid/side conversion

A single 4096-sample, 16-bit stereo FLAC frame was forced to independent-channel coding with fixed predictor order 1 and Rice partition order 0. Both source channels used Rice k=4. From the two residual streams, the candidate advanced the one-bit parity state and generated order-1 mid and side residuals without reconstructing full L/R sample arrays as part of the transform. The target uses FLAC mid-side assignment 10 with k=4 for mid and k=2 for side.

The generated residuals exactly match a separately PCM-derived M/S oracle. The output decodes sample-for-sample identically in both libFLAC and FFmpeg. The correlated fixture shrank from 14175 to 13237 bytes. A naive `floor((rL+rR)/2)` construction differs on 1030 residuals, demonstrating why the parity correction is necessary; the parity bit changes 2060 times in the frame.

The representation result is positive, but the Python component timing did not beat forming M/S from PCM (3318.4 vs 3135.4 ms over 4000 repetitions). This is an **exact compressed-domain primitive**, not yet a preparation-speed win.

## R357 — sorted loudness-energy index

The test uses libebur128 1.2.6 itself to generate the 400 ms / 100 ms-hop momentary windows for a 35 s 48 kHz mono signal. Crucially, all 347 windows are retained before absolute gating. Momentary loudness is converted back to its underlying weighted block energy, sorted once, and indexed by long-double suffix sums.

For gains 0, 0.25, 0.5, 0.8, 1, 1.25, 2 and 3.5, binary-search gating produced the same absolute-gate and final-gate counts as direct scans. Final integrated loudness agrees with fresh gain-scaled libebur128 measurements to maximum error 4.30e-13 LU, including material that crosses the absolute gate after gain.

On a replicated 138,800-window history, 500 gain queries took median 1.618 ms using the index versus 114.781 ms rescanning windows (70.9×). Sorting/index construction took 6.266 ms, corresponding to an estimated break-even of about 27.7 repeated queries in this prototype.

The result is restricted to one global positive gain with unchanged filtering, windows and channel weights. It predicts neither true peak nor clipping, automation, remixing, or changed filters.

## Evidence boundary

Host timings do not predict a matching Wasm/browser implementation. R354's private Wasm high-water is deliberately synthetic and does not prove OS RSS reduction. R355's stable-PID normalizer is an experiment adapter, not current Demuxe production behavior. R356 is a single-frame restricted FLAC profile. R357 is an analysis cache and still requires rendering the finally selected audio setting.