<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Prove where an audio edit stops affecting subsequent output

Full key: `R166.prove-where-an-audio-edit-stops-affecting-subsequent-output`

Current decision: **pursue** (2026-09-19T23:53:48.984129+00:00).

Actual restricted mono AAC-LC coded packet substitutions at 10/20/30 change exactly 2048 decoded samples each; unchanged suffix begins at edit+2, with every suffix and prefix sample exact in FFmpeg8.1.2 and Chrome152. Each full output has49152 samples, native render/EOF/cleanup passes. Claiming closure one packet earlier differs by1024 samples. Strict ICS/Huffman traversal rejects persistent/unknown tools and DRC fill; source identity, boundary and changed window-state guards reject. Five alternating cold read/hash/table-load/strict-parse/three-edit/certificate jobs median57.340ms versus same coded outputs plus independent full source and three modified decodes159.027ms, ratio0.36057 passes0.9. This proves a controlled overlap-only consumer profile, not arbitrary AAC edit closure.

Pursue the controlled long-window mono AAC-LC certificate. General AAC tools, changed consumer implementations, subsequent DSP state, production timeline integration and Wasm cost require new evidence; reject those profiles rather than extending this certificate.

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

[Run](../../shared/runs/20260919T235348Z-aac-closure/run.json) · [Analysis](../../shared/runs/20260919T235348Z-aac-closure/analysis.md) · [Manifest](../../shared/runs/20260919T235348Z-aac-closure/manifest.json) · [History](history.jsonl) · [Evidence](evidence/index.json)
