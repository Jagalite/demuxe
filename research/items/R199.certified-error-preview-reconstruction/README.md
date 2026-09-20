<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# certified-error preview reconstruction

Full key: `R199.certified-error-preview-reconstruction`

Current decision: **stop_current_profile** (2026-09-20T00:35:52.771582+00:00).

Actual JPEG coefficient adapter feeds explicitly selected double8x8 IDCT preview consumer. Per-block omitted-term L1 bounds plus1 rounding and gamma1024 floating allowance remain below requested2code-value budget; all65536 preview pixels differ by at most1 from independent batched full-IDCT model. Four actual JPEGs omit437nonzero terms of54246; max certificate1.97993, max observed error/certificate ratio0.67116. Native libjpeg difference1–2 is observed only, never inherited as a certificate. Wrong source/impossible budget/uncharged DC omission controls pass. Actual Chrome Canvas/ImageBitmap presentation is byte-exact to candidate; stale epoch suppresses publish and resources close. Five alternating full JPEG read/hash/libjpeg coefficient/quantizer/reconstruction jobs86.565vs16.221ms ratio5.33651 fails0.9.

Stop this sparse-term certified preview implementation on complete cost. The certificate belongs only to its declared double-IDCT/round/clamp consumer; it does not certify arbitrary browser JPEG reconstruction. Coarser error contracts, transformed reuse or optimized sparse kernels require a new gate; no automatic lossy preview admission or production route.

No production integration or release qualification. Original provisional directory renamed after capture; replay into a new output directory. Exact original protocol and all measured samples retained.

| Stage | Status |
| --- | --- |
| define | passed |
| prepare | passed |
| screen | passed |
| correctness | passed |
| performance | failed |
| results | passed |
| decision | passed |

[Run](../../shared/runs/20260920T003552Z-jpeg-preview/run.json) · [Analysis](../../shared/runs/20260920T003552Z-jpeg-preview/analysis.md) · [Manifest](../../shared/runs/20260920T003552Z-jpeg-preview/manifest.json) · [History](history.jsonl) · [Evidence](evidence/index.json)
