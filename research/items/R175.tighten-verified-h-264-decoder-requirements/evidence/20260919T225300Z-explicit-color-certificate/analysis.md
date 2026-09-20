<!-- SPDX-License-Identifier: CC-BY-4.0 -->

Complete60-picture progressive baseline I/P trace certifies one active short-term reference, no list reordering/MMCO/long-term or frame-number gaps. Rewriting only overstated SPS num_ref_frames8→1 restores original SPS and leaves all other NALs unchanged.60host pictures/timestamps/types exact; explicit BT709 native60full queries and59continuous pictures exact with seeks/EOF/cleanup. Genuine two-reference source and stale identity/generation reject. Initial unspecified-color browser discrepancy retained; no memory/speed claim.

Correctness: Independent FFmpeg full slice/header trace plus whole-source SHA certificate.2IDR/58P, progressive, active/default list0 count1, no reordering/adaptive MMCO/long-term, frame_num modulo16/IDR resets validated.60host frameMD5/timing/type records identical and all non-SPS NALs unchanged. Explicit-color native60queries/59continuous frames exact, backward/forward seeks, EOF/stale append/cleanup. Actual two-reference fixture fails oneDefaultRef and source binding; changed source/generation reject.

Performance: Source-defined capability is truthful advertised requirements after actual bitstream certificate. Neither allocated decoder surfaces nor latency/RSS is measured; a smaller SPS num_ref_frames is not itself a performance result. No claimed cost win, so benchmark gate N/A.

Next/reopen: Consider only source-hash-bound restricted progressive I/P profiles with explicit color. A production validator must reject unsupported reference marking, gaps, B/field pictures and changed SPS/PPS. Qualify any measured decoder allocation/performance claim separately; unresolved unspecified-color native discrepancy must not be generalized away.

Bounded research result, not production or release admission.
