<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# browser zlib + ZMBV reconstruction

Previously missing GPUstage now actually executes: persistent native browserdeflate plus GPUmotioncopy/XOR reconstruct all8genuine32x32BGR0 frames exactly against independent FFmpeg oracle. Baseline uses same inflater/parser, packed32 CPUmotion/XOR thenGPUupload; both output residentGPUbuffers, readbackallbytes forcorrectness andcloseinflater/GPUowner. Cold delta and unsupportedformat reject; eachnewowner startskey cleanly. Whole task includescoldGPU/shader/buffers/inflater, parse/vector/residualuploads, checks/teardown. Candidate mean5.344ms versusbaseline4.444ms: saving-20.25% bootstrap95[-24.038461203681383, -15.931373344636214], fails10%valuegate and is consistentlyslower. Stop GPUstage for this tinyprofile; retained CPU/native-inflater capability remainscorrect. Candidate uploads full4096byteresidual scratchperdelta evenwhenpartlyused, an implementation limitation recorded, not a claimaboutoptimalGPUlowerbound. Nootherbitdepth or integratedpresentationclaim.

Next: Retain independently correct CPU/browser-inflater capability. Reopen GPUvalue only for an explicit larger/residual workload or sparse residual-upload implementation, predeclaring comparable complete costs before testing.
