<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Integrate video exposure over real frame durations instead of frame counts

Disposition: **pursue**. correctness: **passed**, performance: **not_applicable**.

Implemented actual VideoFrame PTS/duration-driven GPU exposure accumulation for an explicitly requested64x64 opaque black/white linear-color intermediate. Independent Python Fraction oracle verifies10/30ms→exact0.75 atall4096pixels; splitting the30ms hold into3x10ms remains exactly0.75. Partial5/25ms exposure gives5/6 with1.99e-8 maximum float error, within unchanged1e-7bound; endpoint windows produceexact0/1. Framecountaverage0.5 fails, zero-duration/gapped/overlapping timelines reject, oldsource-epoch GPUresult isdiscarded whilefreshresult survives, allframes/buffers/devicesclose. Preserve two diagnosed failed implementations: GPU runtime normalization introduced1ulp above1 atwhiteendpoint; CPU-normalized duration weights alone stillfailedexactsplit invariance becauseGPU byte255/255 conversion also usedapproximate division. Final admittedendpoint conversion usesexact0/1 selection plusnormalized durationweights; no tolerance relaxation or generalcolorspace claim. This qualifies a new duration-aware exposure intermediate, not ordinaryplayback averaging, HDR/generalcolor processing/displaytransfer or a speedimprovement. Performance isnotapplicable for this additionalcapability endpoint.

Next: Scoped duration-weighted linear-endpoint intermediate iscorrect. Extending toarbitrary color/HDR/displaytransfer or actual exposure/exportfeature requires separate color/numerical/outputcontracts; ordinaryplayback remains unchanged.

[Current record](item.json) · [History](history.jsonl) · [Run analysis](evidence/20260919T224044Z-exact-endpoints/analysis.md)
