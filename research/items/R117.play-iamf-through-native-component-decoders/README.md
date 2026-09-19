<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Play IAMF through native component decoders

Current disposition: **pursue**. Historical execution reconciled; no new media run.

Genuine authored IAMF stereo presentation passes strict one-element/one-layer/zero-gain applicability gate; host-extracted FLAC component natively decodes all96000 frames matching original PCM. Unsupported gain rejects. Host demux prerequisite and flat presentation only; no generic IAMF renderer or browser IAMF parser.

Correctness: **passed**. Performance: **pending**.

Strict flat stereo IAMF presentation validates one element/layer and zero gain. Native extracted FLAC returns all 96000 frames, maximum host sample error 3.055e-6; unsupported gain and truncated input reject. Accepted flat whole-file component, not general IAMF renderer.

Next: Specify browser parsing/parameter ownership and complete cost before broad IAMF support or performance claims.

[Current record](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json) · [Acceptance review](../../shared/runs/20260919T201644Z-top100-31-65-reconciliation/analysis.md)
