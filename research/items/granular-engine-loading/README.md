<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Granular engine loading

Full feasibility study completed; production integration not started. [Full report](FULL-REPORT.md), [current state](item.json), [decision history](history.jsonl), [initial screen](REPORT.md), [reproduction notes](tests/full/REPRODUCE.md).

- Lean Hybrid: 28.3% smaller gzip; Chrome HEVC startup at 10 Mbps 8.57 → 6.74 s.
- HEVC Software: 26.0% smaller gzip; Firefox 8.96 → 7.12 s at 10 Mbps and 1.46 → 1.26 s locally.
- Real lazy H264 module: exact decode/reload passes Chrome and Firefox; optimized host plus codec costs 6.8% more total Wasm gzip than static.
- Selective preparation avoids paying for unused engines; full preparation speeds fallback but can increase first-use latency, including a measured 15-second preparation timeout at 5 Mbps.

44 primary timing trials plus correctness, module and policy controls. VP8 Hybrid color fidelity and baseline ASS backing remain unqualified. Full report distinguishes component proof, measured player benefits and remaining integration work.
