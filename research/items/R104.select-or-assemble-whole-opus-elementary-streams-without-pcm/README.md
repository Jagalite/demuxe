<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Select or assemble whole Opus elementary streams without PCM

Full key: `R104.select-or-assemble-whole-opus-elementary-streams-without-pcm`

Current decision: **stop_current_profile** (2026-09-19T22:45:52.505468+00:00).

Actual six-channel mapping-family-1 Opus, four elementary streams and two coupled pairs, parsed at real self-delimited coded frame boundaries. Mono stream extraction, complete coupled stereo extraction, and pair-plus-mono assembly retain every selected coded component and preserve preskip120/end trim. All96000 frames exactly match corresponding full-source channels in host FFmpeg and Chrome152, including offline render/ended/closed. Half-pair intent, mismatched preskip, CRC corruption and truncation rejected. Five alternating cold source-read/parse/CRC/Ogg-write/decode pairs versus full six-channel decode plus efficient PCM channel slicing: mono52.705ms vs42.117ms ratio1.2514; stereo55.710ms vs45.208ms ratio1.2323; three-channel70.973ms vs50.152ms ratio1.4152. All fail predeclared0.9 cost threshold.

Stop this cold Python parser/rewriter cost profile. Exact whole-elementary-stream capability is demonstrated only for fixed mapping, one CELT20ms frame per component, shared source/priming, and zero gain; not half-pair extraction, arbitrary packets, independently primed sources, or production integration. A materially faster implementation or transfer-limited workload needs a new declared experiment.

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

[Run](../../shared/runs/20260919T224552Z-opus-streams/run.json) · [Analysis](../../shared/runs/20260919T224552Z-opus-streams/analysis.md) · [Manifest](../../shared/runs/20260919T224552Z-opus-streams/manifest.json) · [History](history.jsonl) · [Evidence](evidence/index.json)
