<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Test an explicit quantized-FLAC policy using the normal decoder

Full key: `R011.test-an-explicit-quantized-flac-policy-using-the-normal-decoder`

Current decision: **stop_current_profile** (2026-09-19T21:51:52.136279+00:00).

Explicit research-only nearest signed24/32 no-dither policy keeps ordinary AC3float decoder and rejects nonfinite/out-of-range instead of clipping. All96768stereo normal-decoder frames retained, including AC3padding; FLACinteger roundtrips exact. Native Chrome complete render max/RMS errors24bit5.96046e-8/3.44907e-8 and32bit2.32831e-10/2.68456e-11. Chrome actually admits experimental32bitFLAC; ordinary encoder silently chooses24bit, preserved diagnostic.24bit223872bytes versus774144float bytes. Five alternating full decode/quantize/encode/binary-delivery/render/cleanup pairs:24bit208.773/150.581ms ratio1.38645,32bit218.601/150.686ms ratio1.45071; both fail1.25. Truncated destination and closed-render ownership controls pass.

Stop current cold Python/subprocess quantization bridge cost profile, not explicit fidelity-policy feasibility. Both precisions obey declared error bound;32bit encoder is explicitly experimental. No automatic source admission or lossless-float claim; no dither/headroom/clipping changes. Reopen on optimized implementation or explicitly valued compressed delivery/storage workload with complete cost and same precision oracle.

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

[Run](../../shared/runs/20260919T215152Z-quantized-flac/run.json) · [Analysis](../../shared/runs/20260919T215152Z-quantized-flac/analysis.md) · [Manifest](../../shared/runs/20260919T215152Z-quantized-flac/manifest.json) · [History](history.jsonl) · [Evidence](evidence/index.json)
