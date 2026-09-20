<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# AAC selective channel-element reconstruction

Full key: `R268.aac-selective-channel-element-reconstruction`

Current decision: **stop_current_profile** (2026-09-19T23:01:28.660279+00:00).

Actual AAC-LC48k independent-SCE parser traverses ICS/window groups, sections, scale factors, spectral Huffman signs/escapes without reconstructing PCM. Six separately encoded mono streams assembled with explicit six-SCE6.0 PCE; selected631Hz tag4 retained coded bits unchanged apart from mono tag naming. All49152 samples match original mono and selected full-source channel exactly in host FFmpeg and Chrome, with native render/end/closed. CPE, coupling, prediction, SBR, truncation, source identity, invalid intent and cancellation reject. Host selected channel index4 differs from Chrome index5; all-channel diagnostic uniquely identified exact native mapping, initial incorrect index failure retained. Five alternating cold source identity/read/full parser/table-load/write/mono-decode jobs152.561ms vs six-channel decode/slice31.200ms ratio4.88978 fails<=0.9. Selected bytes8712 vs51053 is separate from CPU/latency.

Stop this cold Python AAC selector cost profile. Compressed-domain independent-SCE capability is real, but transfer-limited use or faster implementation requires new declared measurements. Six SCEs are truthfully6.0 here, not ordinary5.1 requiring an LFE element; do not inherit report layout label or half-CPE/SBR/coupling admission. LGPL tables read from pinned original FFmpeg source retaining notices; no production integration.

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

[Run](../../shared/runs/20260919T230128Z-aac-elements/run.json) · [Analysis](../../shared/runs/20260919T230128Z-aac-elements/analysis.md) · [Manifest](../../shared/runs/20260919T230128Z-aac-elements/manifest.json) · [History](history.jsonl) · [Evidence](evidence/index.json)
