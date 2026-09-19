<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Presentation component experiments

The corrected run uses 64x48, 12 fps synthetic H.264 baseline I/P and all-IDR fixtures. FFmpeg host decoding is an independent pixel oracle with passthrough cadence and an exact frame-count assertion. Browser decoding prefers software; this hint does not prove physical decoder identity. No production routing or player implementation changed.

All five components ran; no fallback was used. Pixel ownership tests compare canonical visible I420 planes, converting NV12 plane layout when needed, rather than comparing padded surfaces. Reverse playback is reverse presentation of forward-decoded pictures, never reversed packet submission. Independent-job baseline creates six decoders; the candidate creates one. Worker view baseline is a separate canvas rendering of the same decoded frame.

The earlier run preserved two useful setup failures. Chrome rejects explicit copyTo I420 conversion for some decoded formats. After native plane extraction, the independent host oracle initially disagreed because raw H.264 demux timing caused host FFmpeg to duplicate frames. The failed raw outputs contain twice the expected frame count. The corrected oracle uses -fps_mode passthrough and asserts exact counts; all 24 browser frames and six IDR jobs then match host pixels exactly. The earlier default decoder variant was not rerun after correcting the oracle; it is not a decoder correctness failure.

No performance stage was accepted. Decoder object counts and 55,296 visible retained GOP bytes are component accounting, not total process memory, physical surfaces, hardware utilization, latency or energy. R360 has no demonstrated opportunity against the existing final-only scrub UI. Missing full consumer cancellation, malformed-job recovery and configuration/source restart paths remain explicit correctness work for the relevant items. No production integration or release qualification is implied.
