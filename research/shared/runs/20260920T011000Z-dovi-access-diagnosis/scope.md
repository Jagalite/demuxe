<!-- SPDX-License-Identifier: CC-BY-4.0 -->

Bounded R184 diagnostic, not qualification or a replacement output contract. No fitting or tolerance relaxation. Own files are separate from previously captured parent/nativeoracle runs.

Explicit VideoDecoderConfig.colorSpace BT709/fullRange=true still produces actualVideoFrame formatnull, BT709/fullRange=false; GPUExternalTexture floatcapture is byteidentical to default (comparison hashes recorded). Thus this explicit override does not resolve rawbase access. Predefined directencoded, SRGB-to-BT709, andlinear-to-BT709 transfer interpretations combined withstandardfull/limited ranges do not restore hostbaseY exactly. These diagnostics do not identify a hidden matrix, prove nativeDolbyprocessing, or establish a reversible model.

Native libplacebo trace capturesactualvertex/fragmentshader, plane source rectangles andspecializationconstants. Chroma rect(.25,0)..(960.25,540) matches centeredcoordinate sample x/2,y/2−.25; no extra tonemap/gamutstage appears inthis executedshader. PerplaneR16 normalization is65535/1023.

Rawsampling control deliberately bypassesDOVI/colorspace conversion: treats uploadedY/U/V planes as fullrangeRGB withlineartransfer onbothsourceandtarget while retainingplanes/chroma geometry. CapturedJSON targetlabel remainedhardcodedPQ; metadata-label-erratum.json corrects its interpretation without rewritingcapturedbytes. This is a plane-sampling diagnostic, not viewablecolor.

ActualsampledY vs hostnormalizedY differs at most6.83e−8. Chroma versus mathematicalbilinear differs max.000488823 (roughlyhalf10bitcode), withmean.000172741/.000202521. Feedingthoseactualsampledvalues to independentfloat32math greatlyreducesbutdoesnoteliminate finalPQ disagreement: max.0129512,397RGBscalars exceed2/1023. Hostfloat64input max.115223 with248770overbudget; float32 hostinput max.115302 with245366overbudget. Actualsamplersemantics account for muchobserved difference; remaining numericalpath difference remains unresolved. No arbitrarycorrection fitted, no allowance increased, no claimed exact inverseexternaltexture.

Correctness/performance disposition belongs to parentcombinedR184 campaign. These files document truthfulsignalboundaries only. No production changes or installedruntime changes. OriginaltoolsApache2.0; derivedfloat/decodedmedia remainsNOASSERTION with genuine source provenance in005243Z; native runtimeidentities in010000Z/runtime/provenance.json.
