<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Compile a decoder kernel for a repeatedly used Huffman codebook

Full key: `R292.compile-a-decoder-kernel-for-a-repeatedly-used-huffman-codebook`

Current decision: **stop_current_profile** (2026-09-20T00:34:39.315379+00:00).

Actual generated specialized Wasm versus ordinary prederived8bit Huffman lookup plus long-code fallback decodes four unchanged128x128 baseline grayscale JPEGs. All65536 quantized coefficients match independent libjpeg, all per-frame consumed bits/symbol counts match, and same-consumer reconstructed grayscale pixels are exact. Actual long-code/tail escapes244–376 and16–47 stuffed bytes per frame exercised. Changed optimized codebook rejects specialization then valid generic fallback matches; oversubscribed table/truncation and actual valid restart-JPEG exclusion controls pass. Five alternating first-use four-frame specialization jobs include trusted constant generation, native Wasm compiler, instantiation/table validation/read/decode/transfer:451.663ms vs maintained general3.626ms ratio124.565 fails0.9. Huge cold compiler/OS variance retained (first19seconds), no steady-state throughput claim.

Stop this cold four-frame codebook-specialization profile on setup cost. Warm repeatedly reused kernels may reopen only with independently charged preparation/amortization and actual throughput evidence. Current implementation targets the entropy/coefficient kernel; no production MJPEG route, full Wasm IDCT integration, restart support or browser-native speed claim.

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

[Run](../../shared/runs/20260920T003439Z-huffman-special/run.json) · [Analysis](../../shared/runs/20260920T003439Z-huffman-special/analysis.md) · [Manifest](../../shared/runs/20260920T003439Z-huffman-special/manifest.json) · [History](history.jsonl) · [Evidence](evidence/index.json)
