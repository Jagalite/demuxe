<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Build a visualizer from Vorbis’s encoded spectral envelope

Full key: `R236.build-a-visualizer-from-vorbiss-encoded-spectral-envelope`

Current decision: **pursue** (2026-09-20T00:11:53.887295+00:00).

Actual isolated instrumented libvorbis1.3.7 decodes coded floors before residue/coupling/MDCT; floor-only candidate skips those later stages. All378 stereo packet/channel curves,1024bins each, are byte-identical to full decoder instrumentation. Exact packet identity/PTS/duration association includes initial negative overlap timestamp; one-packet misassociation differs and malformed Ogg header rejects. Encoded-envelope SVG is explicitly not waveform, loudness or final spectrum. Five alternating complete cold process/file/header/setup/floor capture/common block handling/teardown medians13.098vs18.172ms ratio0.72081 passes0.9; raw wall-time variance retained. Both paths share libvorbis floor math; oracle is actual instrumented complete decoding, not an independent floor algorithm.

Pursue this encoded-floor visualization capability and bounded cost profile. No final spectrum, true-peak, loudness or PCM claim; short/long transitions and production/browser/Wasm integration need separate admission. Original Xiph BSD source and modified snapshot retained; legacy obsolete test-linker failure preserved, required static decoder target built successfully.

No production integration or release qualification. Original provisional directory renamed after capture; replay into a new output directory. Exact original protocol and all measured samples retained.

| Stage | Status |
| --- | --- |
| define | passed |
| prepare | passed |
| screen | passed |
| correctness | passed |
| performance | passed |
| results | passed |
| decision | passed |

[Run](../../shared/runs/20260920T001153Z-vorbis-floor/run.json) · [Analysis](../../shared/runs/20260920T001153Z-vorbis-floor/analysis.md) · [Manifest](../../shared/runs/20260920T001153Z-vorbis-floor/manifest.json) · [History](history.jsonl) · [Evidence](evidence/index.json)
