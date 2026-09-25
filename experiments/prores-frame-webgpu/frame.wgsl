// SPDX-License-Identifier: LGPL-2.1-or-later
// Experiment-only full-frame placement around the validated 10-bit IDCT core.
// One dispatch spans all slices: x=macroblock within slice, y=slice index.

struct PackedCoefficients { words: array<u32> };
struct PackedMatrices { words: array<u32, 32> };
struct FrameParams {
  width: u32,
  height: u32,
  yPlaneSamples: u32,
  uvPlaneSamples: u32,
};
struct SliceDescriptor {
  coefficientWordOffset: u32,
  mbX: u32,
  mbY: u32,
  mbCount: u32,
  qscale: i32,
  reserved0: u32,
  reserved1: u32,
  reserved2: u32,
};
struct SliceDescriptors { slices: array<SliceDescriptor> };
struct PlanarSamples { samples: array<u32> };

@group(0) @binding(0) var<storage, read> coefficients: PackedCoefficients;
@group(0) @binding(1) var<storage, read> matrices: PackedMatrices;
@group(0) @binding(2) var<uniform> frame: FrameParams;
@group(0) @binding(3) var<storage, read> descriptors: SliceDescriptors;
@group(0) @binding(4) var<storage, read_write> planar: PlanarSamples;

@compute @workgroup_size(8)
fn main(@builtin(workgroup_id) group: vec3<u32>,
        @builtin(local_invocation_index) lane: u32) {
  let slice = descriptors.slices[group.y];
  let mb = group.x;
  if (mb >= slice.mbCount) { return; }
  var block: array<i32, 64>;
  var matrix: array<i32, 64>;
  let coefficientBase = slice.coefficientWordOffset + mb * 256u + lane * 32u;
  let matrixBase = select(64u, 0u, lane < 4u);
  for (var i = 0u; i < 64u; i++) {
    let packed = coefficients.words[coefficientBase + i / 2u];
    block[i] = i16_wrap(bitcast<i32>(packed >> ((i & 1u) * 16u)));
    let quant = matrices.words[(matrixBase + i) / 4u];
    matrix[i] = i32((quant >> ((i & 3u) * 8u)) & 255u);
  }
  let samples = prores_idct_10(block, matrix, slice.qscale);
  let isLuma = lane < 4u;
  let isV = lane >= 6u;
  let chromaIndex = select(lane - 4u, lane - 6u, isV);
  let blockIndex = select(chromaIndex, lane, isLuma);
  let mbX = slice.mbX + mb;
  let blockX = select(mbX * 8u, mbX * 16u + (blockIndex & 1u) * 8u, isLuma);
  let blockY = slice.mbY * 16u + select(blockIndex * 8u, (blockIndex / 2u) * 8u, isLuma);
  let stride = select(frame.width / 2u, frame.width, isLuma);
  let width = stride;
  let planeBase = select(frame.yPlaneSamples, 0u, isLuma)
                + select(0u, frame.uvPlaneSamples, isV);
  for (var y = 0u; y < 8u; y++) {
    let outputY = blockY + y;
    if (outputY >= frame.height) { continue; }
    for (var x = 0u; x < 8u; x++) {
      let outputX = blockX + x;
      if (outputX < width) {
        planar.samples[planeBase + outputY * stride + outputX] = samples[y * 8u + x];
      }
    }
  }
}
