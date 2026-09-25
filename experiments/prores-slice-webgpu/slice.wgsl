// SPDX-License-Identifier: LGPL-2.1-or-later
// Appended after ../prores-idct-webgpu/idct-core.wgsl by the local runner.
// One workgroup per macroblock; each of its eight lanes owns one 8x8 block.

struct PackedCoefficients { words: array<u32> };
struct PackedMatrices { words: array<u32, 32> };
struct SliceParams {
  mbCount: u32,
  codedWidth: u32,
  visibleWidth: u32,
  visibleHeight: u32,
  qscale: i32,
  yPlaneSamples: u32,
  uvPlaneSamples: u32,
  reserved: u32,
};
struct PlanarSamples { samples: array<u32> };

@group(0) @binding(0) var<storage, read> coefficients: PackedCoefficients;
@group(0) @binding(1) var<storage, read> matrices: PackedMatrices;
@group(0) @binding(2) var<uniform> params: SliceParams;
@group(0) @binding(3) var<storage, read_write> planar: PlanarSamples;

@compute @workgroup_size(8)
fn main(@builtin(workgroup_id) group: vec3<u32>,
        @builtin(local_invocation_index) lane: u32) {
  let mb = group.x;
  if (mb >= params.mbCount) { return; }
  var block: array<i32, 64>;
  var matrix: array<i32, 64>;
  let coefficientBase = mb * 256u + lane * 32u;
  let matrixBase = select(64u, 0u, lane < 4u);
  for (var i = 0u; i < 64u; i++) {
    let packed = coefficients.words[coefficientBase + i / 2u];
    block[i] = i16_wrap(bitcast<i32>(packed >> ((i & 1u) * 16u)));
    let quant = matrices.words[(matrixBase + i) / 4u];
    matrix[i] = i32((quant >> ((i & 3u) * 8u)) & 255u);
  }
  let samples = prores_idct_10(block, matrix, params.qscale);
  let isLuma = lane < 4u;
  let isV = lane >= 6u;
  let chromaIndex = select(lane - 4u, lane - 6u, isV);
  let blockIndex = select(chromaIndex, lane, isLuma);
  let blockX = select(mb * 8u, mb * 16u + (blockIndex & 1u) * 8u, isLuma);
  let blockY = select(blockIndex * 8u, (blockIndex / 2u) * 8u, isLuma);
  let stride = select(params.codedWidth / 2u, params.codedWidth, isLuma);
  let width = select(params.visibleWidth / 2u, params.visibleWidth, isLuma);
  let planeBase = select(params.yPlaneSamples, 0u, isLuma)
                + select(0u, params.uvPlaneSamples, isV);
  for (var y = 0u; y < 8u; y++) {
    let outputY = blockY + y;
    if (outputY >= params.visibleHeight) { continue; }
    for (var x = 0u; x < 8u; x++) {
      let outputX = blockX + x;
      if (outputX < width) {
        planar.samples[planeBase + outputY * stride + outputX] = samples[y * 8u + x];
      }
    }
  }
}
