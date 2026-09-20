<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# tighten verified H.264 decoder requirements

Current decision: **pursue**. Complete60-picture progressive baseline I/P trace certifies one active short-term reference, no list reordering/MMCO/long-term or frame-number gaps. Rewriting only overstated SPS num_ref_frames8→1 restores original SPS and leaves all other NALs unchanged.60host pictures/timestamps/types exact; explicit BT709 native60full queries and59continuous pictures exact with seeks/EOF/cleanup. Genuine two-reference source and stale identity/generation reject. Initial unspecified-color browser discrepancy retained; no memory/speed claim.

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | New executable probe and declared workload/controls registered with source/input/runtime evidence. |
| screen | passed | Complete60-picture progressive baseline I/P trace certifies one active short-term reference, no list reordering/MMCO/long-term or frame-number gaps. Rewriting only overstated SPS num_ref_frames8→1 restores original SPS and leaves all other NALs unchanged.60host pictures/timestamps/types exact; explicit BT709 native60full queries and59continuous pictures exact with seeks/EOF/cleanup. Genuine two-reference source and stale identity/generation reject. Initial unspecified-color browser discrepancy retained; no memory/speed claim. |
| correctness | passed | Independent FFmpeg full slice/header trace plus whole-source SHA certificate.2IDR/58P, progressive, active/default list0 count1, no reordering/adaptive MMCO/long-term, frame_num modulo16/IDR resets validated.60host frameMD5/timing/type records identical and all non-SPS NALs unchanged. Explicit-color native60queries/59continuous frames exact, backward/forward seeks, EOF/stale append/cleanup. Actual two-reference fixture fails oneDefaultRef and source binding; changed source/generation reject. |
| performance | not_applicable | Source-defined capability is truthful advertised requirements after actual bitstream certificate. Neither allocated decoder surfaces nor latency/RSS is measured; a smaller SPS num_ref_frames is not itself a performance result. No claimed cost win, so benchmark gate N/A. |
| results | passed | Actual new execution raw outcomes, controls and scoped interpretation retained. |
| decision | passed | pursue: Complete60-picture progressive baseline I/P trace certifies one active short-term reference, no list reordering/MMCO/long-term or frame-number gaps. Rewriting only overstated SPS num_ref_frames8→1 restores original SPS and leaves all other NALs unchanged.60host pictures/timestamps/types exact; explicit BT709 native60full queries and59continuous pictures exact with seeks/EOF/cleanup. Genuine two-reference source and stale identity/generation reject. Initial unspecified-color browser discrepancy retained; no memory/speed claim. |

Next/reopen: Consider only source-hash-bound restricted progressive I/P profiles with explicit color. A production validator must reject unsupported reference marking, gaps, B/field pictures and changed SPS/PPS. Qualify any measured decoder allocation/performance claim separately; unresolved unspecified-color native discrepancy must not be generalized away.

[Current contract](item.json) · [History](history.jsonl) · [Evidence](evidence/index.json)
