<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# AV1 large-scale tile viewport decode

Actual lossless large-scale AV1 tile decoder output matches independently generated original Y/U/V source crop exactly for all30 keyframes, both selected-tile and full-decode/crop. Truncated IVF rejects with10, out-of-range selection rejects with3, wrong tile differs; a fresh owner after failure reproduces exact output and every process destroys decoder. Both paths read complete IVF and output identical2949120bytes. Nine alternating fresh process pairs include process startup/read/decode/crop/write/output comparison/teardown and command logging; prepared encoding excluded. Selected mean204.798ms versus full540.262ms: saving62.09% bootstrap95[56.71187006201919, 67.02984794779702], passes predeclared lower-bound10%gate. One512x512 procedural picture repeated30times, tile256x256, pinned libaom and AV1D_EXT_TILE_DEBUG path. No browser, temporal dependencies, sparse transport, byte savings, physical memory or energy claim. Concurrent host research load and warm filesystem cache limit external timing generalization.

Next: Scoped research gates complete. Browser integration or temporal tiled sources require separate exact contracts and validation; no production admission changed.
