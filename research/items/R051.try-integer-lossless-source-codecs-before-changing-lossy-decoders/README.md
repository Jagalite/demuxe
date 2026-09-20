<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Try integer-lossless source codecs before changing lossy decoders

Full key: `R051.try-integer-lossless-source-codecs-before-changing-lossy-decoders`

Current decision: **pursue** (2026-09-19T21:26:58.284186+00:00).

Actual original native ALAC decode rejects; ordinary ALAC Wasm decoding plus ordinary FLAC adaptation and copied H264 produces384000 exact host PCM bytes/96000 stereo frames. Chrome recovers every signed16 sample exactly; all48 coded video packets are unchanged with normalized video timeline maximum error0.666ms (within the declared1.1ms source-timebase tolerance). Partial decoder job close/reopen, actual native MSE seek/audio/EOF and graph/worker cleanup pass. Finite bridge uses existing pinned modules, no different lossy decoder.

Original proposal is an input/destination feasibility question with no speed/resource hypothesis; performance is not applicable to this declared ALAC16 capability endpoint. Pursue normal integer-lossless adaptation for this profile. TrueHD,24bit, streaming memory ownership and production admission remain separately unqualified.

No production integration or release qualification. Original provisional directory renamed after capture; replay into a new output directory. Exact original protocol and all measured samples retained.

| Stage | Status |
| --- | --- |
| define | passed |
| prepare | passed |
| screen | passed |
| correctness | passed |
| performance | not_applicable |
| results | passed |
| decision | passed |

[Run](../../shared/runs/20260919T212658Z-alac-destination/run.json) · [Analysis](../../shared/runs/20260919T212658Z-alac-destination/analysis.md) · [Manifest](../../shared/runs/20260919T212658Z-alac-destination/manifest.json) · [History](history.jsonl) · [Evidence](evidence/index.json)

[Timing and source-license narrative correction](../../shared/runs/20260919T212747Z-alac-timing-erratum/analysis.md). No new execution.
