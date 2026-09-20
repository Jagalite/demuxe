<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Browser-side video normalization

Disposition: **pursue**. correctness: **passed**, performance: **not_applicable**.

Exact source card says measure additional source/destination capability, otherwise cost. The retained actual WebCodecs normalization experiment supplies72VP9 inputframes to AVCencoder with explicitPTS; all72returned framePTS preserved and allvisibleRGB PSNR values exceed declared32dB lossyqualitygate; wrongtimestamporderrejects and codecs/framesclose without errors. Source-reported MediaRecorder clock drift is not present in this explicitPTS component. This is permitted lossy frame normalization capability, no speed/resource advantage hypothesis, so comparativeperformance is notapplicable to this endpoint. Do not compare AVCencoding with original-packet copying or invent a speedclaim. No newexperiment; exact archived output reread and verified. Mux/audio/nativeMSEintegration and arbitraryformats remainexcluded.

Next: Scoped permitted-lossy normalization research capability endpoint complete. Production mux/audio/presentation integration must be separately scoped; any efficiency claim needs an equivalent permitted-lossy baseline and predeclared workload.

[Current record](item.json) · [History](history.jsonl) · [Run analysis](evidence/20260919T211419Z-capability-endpoint/analysis.md)

[Fixture provenance metadata amendment](../../shared/runs/20260919T211636Z-presentation-provenance-amendment/analysis.md); output and gate decisions unchanged.
