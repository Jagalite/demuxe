<!-- SPDX-License-Identifier: CC-BY-4.0 -->

Actual authored zero-shift LPC coefficients exactly equal fixed predictors1..4; converter preserves every warmup and Rice residual bit while changing predictor syntax/framing. All1028samples match original and independent ordinary encoding exactly in FFmpeg/Chrome, libFLAC integrity/render/end/closed pass. Near coefficient, nonzero shift, CRC and truncation reject. A real ordinary FFmpeg encoding of same PCM had one order7/shift13 non-binomial LPC subframe and zero eligible opportunities; no broader prevalence inference. Five cold transform/write/decode jobs48.462ms versus simply decoding original already-valid LPC41.689ms ratio1.16245 fails<=0.9. Authored output2066 vs2075bytes.

Stop this cold LPC-syntax conversion profile. Mathematical conversion is exact only for admitted zero-shift binomial predictors, but direct decoding is cheaper here and the one ordinary encoding showed no opportunity. Do not invent re-encoding work in baseline or infer normal-catalogue exposure from authored equivalent fixtures. Reopen only with measured eligible frequency or repeated-decode savings including preparation.

No production integration or release qualification. Original provisional directory renamed after capture; replay into a new output directory. Exact original protocol and all measured samples retained.
