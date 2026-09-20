<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# GPU JPEG entropy decoding

Full key: `R177.gpu-jpeg-entropy-decoding`

Current decision: **stop_current_profile** (2026-09-20T00:44:10.160910+00:00).

Actual WebGPU Huffman JPEG entropy kernel dispatches64 real restart-delimited intervals,4baseline grayscale blocks each. All16384 quantized coefficients match independent libjpeg and ordinary Wasm; every interval consumed-bit count matches. Actual source header/table/stuffing/restart parsing is included; GPU is not a CPU substitute. Truncated GPU interval, oversubscribed table, truncated whole JPEG and wrong restart order reject; stale epoch prevents publication and all buffers/device close. Five alternating complete source parsing/device/pipeline/upload/dispatch/readback jobs5.600ms vs ordinary prederived-table Wasm3.100ms ratio1.80645 fails0.9. First shader/device setup observations and prior prepared-buffer diagnostic retained.

Stop this tiny restarted-JPEG GPU entropy profile on complete cost; GPU environment prerequisite is resolved and actual kernel output is correct. Larger streams or persistent resident batches require new amortization measurements. No no-restart generality, color/interleaving, progressive JPEG, GPU IDCT or production browser route claim.

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

[Run](../../shared/runs/20260920T004410Z-gpu-jpeg/run.json) · [Analysis](../../shared/runs/20260920T004410Z-gpu-jpeg/analysis.md) · [Manifest](../../shared/runs/20260920T004410Z-gpu-jpeg/manifest.json) · [History](history.jsonl) · [Evidence](evidence/index.json)
