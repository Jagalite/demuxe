<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Try integer-lossless source codecs before changing lossy decoders

Current disposition: **pursue**. Historical execution reconciled; no new media run.

ALAC rejected by native media element and decodeAudioData, then isolated pinned ALAC Wasm decoder reproduced all 96000 stereo frames exactly with missing-extradata and truncated-packet rejection. Worth pursuing ALAC adaptation; TrueHD and complete route cost remain untested.

Correctness: **passed**. Performance: **pending**.

Native ALAC rejection is separately recorded. Isolated pinned FFmpeg ALAC Wasm returns exact 384000 PCM bytes/96000 stereo frames; missing extradata and truncated packets reject, cleanup passes. TrueHD and complete route excluded.

Next: Integrate only declared ALAC adaptation owner with seek/cancel, then measure full startup and output costs.

[Current record](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json) · [Acceptance review](../../shared/runs/20260919T201644Z-top100-31-65-reconciliation/analysis.md)
