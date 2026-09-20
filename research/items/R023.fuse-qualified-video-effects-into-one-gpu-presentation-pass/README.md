<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Fuse qualified video effects into one GPU presentation pass

Disposition: **pursue**. correctness: **passed**, performance: **passed**.

Implemented a narrow exact GPU effect presenter: prepared opaque320x192RGBA code-value pixels rotated90 degrees, optional channel inversion and integer-rounded straight-alpha subtitle composition, fused in one actual WebGPU render pass. Full192x320 output matches independently generated Python integer reference for all4 input images and rotation/color/subtitle/combined subsets. Wrong-alpha reference differs, unsupported operations reject, actual device.destroy followed by fresh device produces exact output, and an in-flight old-owner GPU result is discarded by source epoch before publication; all GPUbuffers/textures/devices destroy. Initial setup failed because this Chrome consumes an adapter after device destruction; preserve that failure and one correction requests a fresh adapter perowner. Nine alternating32-frame task pairs charge adapter/device/pipeline/upload, CPU effect work or fusedshader, draws, finalfullreadback/hash and teardown. Baseline uses a single cheaper fused scalar CPU loop plus GPUblit, not artificially redundant CPU stages. Baseline32.233ms versuscandidate7.622ms, saving76.35% (95%[70.4177322905617, 81.2407242737413]), passes10%lower-bound gate. This qualifies an isolated prepared-RGBA effect component; no arbitraryFFmpegfilters, YUVconversion, HDR, linear-light alpha, scaling, retained-video externaltexture, physical driverloss or integratedplayer speed claim.

Next: Scoped exact prepared-RGBA component gates complete. Any extension to retainedVideoFrame/YUV/color-managed/HDR/scaling or actual player filter routing needs its own predeclared output contract and end-to-end comparison; production unchanged.

[Current record](item.json) · [History](history.jsonl) · [Run analysis](evidence/20260919T220048Z-fresh-adapter/analysis.md)
