<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# R008 whole-player rotation qualification

The actual Software CPU transpose route and the isolated Hybrid retained-frame rotation route both executed H.264 video and PCM stereo audio. This is a real filter request, not a new claim about already-supported metadata rotation. The candidate does not meet the declared whole-player output gate. No performance run was allowed.

The initial untagged/scaled fixture revealed color and scaling differences. A new fixture packet-copies the same source while declaring BT709 primaries, transfer and matrix in both bitstream and container. Flat red then matches across routes. The original observations remain retained; scaled integer-padded reference results are diagnostic only, because fractional fit policy introduces another variable.

A fresh profile was declared before capture: explicit BT709, square pixels, 320x180 source, 180x320 native portrait canvas, clockwise90, no subtitles, maximum3 RGB levels and exact alpha. An independent host operation-order control justified the3level gate: FFmpeg YUV transpose before RGB versus RGB conversion before transpose differs by at most2 levels. This is a new bounded profile, not a relabeling of the original component's exact-output gate.

At seek PTS1,6,10, Software exactly matches the independent FFmpeg transpose oracle (max0). Hybrid differs by max50,59,18, respectively, with1280 RGB channels above3 for each picture. At PTS1 all large errors lie at two chroma-boundary columns. A no-filter control removes rotation: Software max2 passes, Hybrid max50 fails, now on exactly two source rows. This isolates the discrepancy to the existing cross-decoder/presentation chroma-edge behavior rather than rotation coordinates. It does not identify the exact browser sampling implementation.

Both routes produced moving pictures and440/880Hz stereo audio, forward/backward seeks completed, and cleanup removed all player surfaces. Full cancel/source-replacement qualification and performance were not advanced after failed fidelity. Exact unsupported filter spellings/chains, Native admission and combined audio filters were rejected in source-function controls; general production admission was not changed. Candidate metadata geometry was adjusted in the isolated snapshot to report180x320; the existing Software public mediaInfo remained320x180 despite correct portrait pixels. That API defect is separately disclosed.

Disposition: stop this whole-player Software-to-Hybrid replacement profile. Reopen after independently qualifying matching chroma reconstruction or a separately justified fidelity contract, with maintained transform intent, metadata geometry, lifecycle and eligibility. The earlier55.8% prepared-frame component benefit remains historical and is not whole-player savings. No default routing, production source, or shipping behavior changed.

`probe*/result.json` records successful script execution, while this run's `results.json` and pixel-comparison files determine correctness. A script execution pass does not override the failed picture gate.

