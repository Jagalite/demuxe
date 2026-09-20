<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Hybrid audio component capability probes

The seven retained audio-driven Hybrid combinations were probed on the same
Chrome version as their correctness records. [Results](result.json) identify the
exact codec strings and source-record hashes. [Probe source](files/probe-hybrid-mse.mjs)
is retained with [integrity hashes](manifest.json).

Video-only H.264/HEVC MSE hints are positive. AC-3/E-AC-3 audio-only and combined
MP4 hints are negative. These are API hints, not independent decoded-output tests;
the Hybrid audit supplies the actual Native video/audio verification observations.
No DTS packaging support is invented or inferred from Demuxe's absent construction
contract. No performance measurement was taken.

Rerun: `node tests/head-to-head/probe-hybrid-mse.mjs <correctness-run> <fresh-output>`.
