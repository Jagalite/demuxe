// SPDX-License-Identifier: LGPL-2.1-or-later
// Shared experiment-only FFmpeg 9.0.2 ProRes 10-bit integer IDCT.
// Concatenated with one-block and one-slice wrappers at shader creation.

// FFmpeg stores dequantized values and both IDCT passes back into int16_t.
fn i16_wrap(value: i32) -> i32 {
  return bitcast<i32>(bitcast<u32>(value) << 16u) >> 16u;
}

// FFmpeg's SUINT is unsigned in release builds. Keep every accumulation in
// u32, then reinterpret its low 32 bits before the arithmetic right shift.
fn product(weight: i32, value: i32) -> u32 {
  return bitcast<u32>(weight) * bitcast<u32>(value);
}
fn shifted(value: u32, bits: u32) -> i32 {
  return bitcast<i32>(value) >> bits;
}
fn pixel(value: u32) -> u32 {
  return u32(clamp(i16_wrap(shifted(value, 18u)), 4, 1019));
}

fn prores_idct_10(coefficients: array<i32, 64>, matrix: array<i32, 64>, qscale: i32) -> array<u32, 64> {
  var samples: array<u32, 64>;
  var block: array<i32, 64>;
  for (var i = 0u; i < 64u; i++) {
    let scaled_quantizer = i16_wrap(matrix[i] * qscale);
    block[i] = i16_wrap(coefficients[i] * scaled_quantizer);
  }

  for (var row = 0u; row < 8u; row++) {
    let base = row * 8u;
    let c0 = block[base];
    let c1 = block[base + 1u];
    let c2 = block[base + 2u];
    let c3 = block[base + 3u];
    let c4 = block[base + 4u];
    let c5 = block[base + 5u];
    let c6 = block[base + 6u];
    let c7 = block[base + 7u];
    let baseValue = product(16384, c0) + 16384u;
    let a0 = baseValue + product(21407, c2) + product(16384, c4) + product(8867, c6);
    let a1 = baseValue + product(8867, c2) - product(16384, c4) - product(21407, c6);
    let a2 = baseValue - product(8867, c2) - product(16384, c4) + product(21407, c6);
    let a3 = baseValue - product(21407, c2) + product(16384, c4) - product(8867, c6);
    let b0 = product(22725, c1) + product(19265, c3) + product(12873, c5) + product(4520, c7);
    let b1 = product(19265, c1) - product(4520, c3) - product(22725, c5) - product(12873, c7);
    let b2 = product(12873, c1) - product(22725, c3) + product(4520, c5) + product(19265, c7);
    let b3 = product(4520, c1) - product(12873, c3) + product(19265, c5) - product(22725, c7);
    block[base]      = i16_wrap(shifted(a0 + b0, 15u));
    block[base + 7u] = i16_wrap(shifted(a0 - b0, 15u));
    block[base + 1u] = i16_wrap(shifted(a1 + b1, 15u));
    block[base + 6u] = i16_wrap(shifted(a1 - b1, 15u));
    block[base + 2u] = i16_wrap(shifted(a2 + b2, 15u));
    block[base + 5u] = i16_wrap(shifted(a2 - b2, 15u));
    block[base + 3u] = i16_wrap(shifted(a3 + b3, 15u));
    block[base + 4u] = i16_wrap(shifted(a3 - b3, 15u));
  }

  for (var column = 0u; column < 8u; column++) {
    // FFmpeg adds 8192 to int16_t row zero before each column transform.
    let c0 = i16_wrap(block[column] + 8192);
    let c1 = block[8u + column];
    let c2 = block[16u + column];
    let c3 = block[24u + column];
    let c4 = block[32u + column];
    let c5 = block[40u + column];
    let c6 = block[48u + column];
    let c7 = block[56u + column];
    // (1 << (COL_SHIFT - 1)) / W4 = 8, COL_SHIFT = 18.
    let baseValue = product(16384, c0 + 8);
    let a0 = baseValue + product(21407, c2) + product(16384, c4) + product(8867, c6);
    let a1 = baseValue + product(8867, c2) - product(16384, c4) - product(21407, c6);
    let a2 = baseValue - product(8867, c2) - product(16384, c4) + product(21407, c6);
    let a3 = baseValue - product(21407, c2) + product(16384, c4) - product(8867, c6);
    let b0 = product(22725, c1) + product(19265, c3) + product(12873, c5) + product(4520, c7);
    let b1 = product(19265, c1) - product(4520, c3) - product(22725, c5) - product(12873, c7);
    let b2 = product(12873, c1) - product(22725, c3) + product(4520, c5) + product(19265, c7);
    let b3 = product(4520, c1) - product(12873, c3) + product(19265, c5) - product(22725, c7);
    samples[column]       = pixel(a0 + b0);
    samples[8u + column]  = pixel(a1 + b1);
    samples[16u + column] = pixel(a2 + b2);
    samples[24u + column] = pixel(a3 + b3);
    samples[32u + column] = pixel(a3 - b3);
    samples[40u + column] = pixel(a2 - b2);
    samples[48u + column] = pixel(a1 - b1);
    samples[56u + column] = pixel(a0 - b0);
  }
  return samples;
}
