<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Restricted H.264 entropy translation and full slice checkpoint prototype

Original harness files are Apache-2.0. They patch a separate pinned MIT OxideAV
checkout (552f9883f6dc5bbdf69441063e65e9cb27af614b); its copyright and license
remain intact. OXIDEAV-LICENSE.txt is the retained upstream notice. Cargo.lock
pins build dependencies. No production source or routing is modified.

Run `python3 research/shared/tooling/entropy-qualification/rerun.py /tmp/new-entropy-source research/shared/runs/NEW-UNIQUE-RUN` from repository root. Both paths must not already exist. Requires Git/network, Rust, and FFmpeg with libx264. Cold setup/build is separately logged; release command timings charge fresh-process startup and all fixture/output I/O, not development compilation.

The translator accepts progressive, one-slice-per-picture 8-bit 4:2:0 CABAC I/P
without 8x8 transform/subpartitions/FMO/constrained intra. This is a restricted
research profile, not a general input parser or production implementation.
Original quantized syntax crosses from CABAC parser to CAVLC writer; no inverse
transform, pixel reconstruction, motion compensation or quantization occurs in
that path. FFmpeg independently decodes both streams for the picture oracle.
Unchanged SPS Main-profile signaling does not establish Baseline-only device
compatibility; no browser hardware/tier improvement is claimed.

Checkpoints contain complete macroblock-parser state, neighbor/motion/reference
syntax grids and prefix macroblocks, bound to source RBSP plus parameter/header
identity and integrity hashes. A fresh process skips prefix entropy symbols and
continues through full slice termination. Prefix syntax is retained and complete
picture reconstruction (including reference pictures) is deliberately charged;
this is not a standalone suffix-only picture or decoder-DPB capsule. JSON is a
research serialization format whose large storage cost is measured, not hidden.
