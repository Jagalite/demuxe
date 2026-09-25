// SPDX-License-Identifier: Apache-2.0
// Parse a single live FFmpeg 9.0.2 DPC1 frame produced from an mpv packet.
export function parseCapture(bytes, expectedWidth = 640, expectedHeight = 360) {
  const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  let at = 0;
  function requireBytes(count) {
    if (at + count > data.byteLength) throw Error('Truncated live ProRes capture');
  }
  function tag() { requireBytes(4); const value = String.fromCharCode(...data.subarray(at, at + 4)); at += 4; return value; }
  function u32() { requireBytes(4); const value = view.getUint32(at, true); at += 4; return value; }
  function i64() { requireBytes(8); const value = Number(view.getBigInt64(at, true)); at += 8; return value; }
  function raw(count) { requireBytes(count); const value = data.subarray(at, at + count); at += count; return value; }
  if (tag() !== 'DPC1' || tag() !== 'FRAM') throw Error('Wrong live ProRes capture header');
  const frame = u32(), width = u32(), height = u32(), frameType = u32(), sourcePts = i64();
  if (width !== expectedWidth || height !== expectedHeight || frameType !== 0 || width % 2)
    throw Error('Unsupported live ProRes frame geometry');
  const mbWidth = Math.ceil(width / 16), mbHeight = Math.ceil(height / 16);
  const mbCount = mbWidth * mbHeight;
  const slices = [], coverage = new Uint8Array(mbCount);
  let current = null, matrix = null;
  while (at < data.byteLength) {
    const kind = tag();
    if (kind === 'SLIC') {
      const frameIndex = u32(), field = u32(), slice = u32(), mbX = u32(), mbY = u32();
      const count = u32(), qscale = u32();
      u32(); u32(); u32(); u32(); // Component and header byte counts.
      raw(64); // Scan order is already reflected in quantized coefficient indices.
      const luma = raw(64), chroma = raw(64);
      if (frameIndex !== frame || field !== 0 || count < 1 || mbX + count > mbWidth || mbY >= mbHeight)
        throw Error(`Invalid ProRes slice ${slice}`);
      for (let x = mbX; x < mbX + count; x++) {
        const index = mbY * mbWidth + x;
        if (coverage[index]) throw Error('Overlapping ProRes slices');
        coverage[index] = 1;
      }
      const entries = new Uint8Array(128); entries.set(luma); entries.set(chroma, 64);
      if (matrix && entries.some((value, index) => value !== matrix[index]))
        throw Error('Frame quant matrices differ across slices');
      matrix = entries;
      current = {slice, mbX, mbY, mbCount: count, qscale, components: [], packedWordOffset: 0};
      slices.push(current);
    } else if (kind === 'COMP') {
      const frameIndex = u32(), field = u32(), slice = u32(), component = u32(), blocks = u32();
      if (!current || frameIndex !== frame || field !== 0 || slice !== current.slice ||
          component !== current.components.length || blocks !== current.mbCount * (component === 0 ? 4 : 2))
        throw Error('Invalid live ProRes component');
      current.components.push(raw(blocks * 128));
    } else throw Error(`Unknown live ProRes record ${kind}`);
  }
  if (slices.length === 0 || coverage.some(value => !value) ||
      slices.some(slice => slice.components.length !== 3)) throw Error('Incomplete live ProRes frame');
  const packedWords = new Uint32Array(mbCount * 256);
  const packedBytes = new Uint8Array(packedWords.buffer);
  const descriptorWords = new Int32Array(slices.length * 8);
  let packedWordOffset = 0;
  for (let s = 0; s < slices.length; s++) {
    const slice = slices[s];
    slice.packedWordOffset = packedWordOffset;
    for (let mb = 0; mb < slice.mbCount; mb++) {
      const dst = packedWordOffset * 4 + mb * 1024;
      packedBytes.set(slice.components[0].subarray(mb * 512, (mb + 1) * 512), dst);
      packedBytes.set(slice.components[1].subarray(mb * 256, (mb + 1) * 256), dst + 512);
      packedBytes.set(slice.components[2].subarray(mb * 256, (mb + 1) * 256), dst + 768);
    }
    descriptorWords.set([packedWordOffset, slice.mbX, slice.mbY, slice.mbCount,
      slice.qscale, 0, 0, 0], s * 8);
    packedWordOffset += slice.mbCount * 256;
  }
  const matrixWords = new Uint32Array(32);
  const matrixBytes = new Uint8Array(matrixWords.buffer);
  matrixBytes.set(matrix);
  return {frame, width, height, sourcePts, mbCount, sliceCount: slices.length,
    maxSliceMbCount: Math.max(...slices.map(slice => slice.mbCount)),
    packedWords, descriptorWords, matrixWords,
    frameWords: new Uint32Array([width, height, width * height, width * height / 2])};
}

// DPP1 is written in place by the FFmpeg entropy decoder. Views reference the
// mailbox until operation 2 is acknowledged; WebGPU upload must happen first.
export function parsePackedCapture(memory, packetOffset, size, frameWords) {
  const h = new Uint32Array(memory, packetOffset, 16);
  const [magic, frame, width, height, coeffOffset, coeffBytes,
    descriptorOffset, matrixOffset, totalBytes, sliceCount, maxSliceMbCount,
    , frameType] = h;
  if (magic !== 0x31505044 || width !== 640 || height !== 360 || frameType !== 0 ||
      totalBytes !== size || coeffOffset !== 64 || coeffBytes !== 40 * 23 * 1024 ||
      descriptorOffset !== coeffOffset + coeffBytes ||
      matrixOffset !== descriptorOffset + 8192 || totalBytes !== matrixOffset + 128 ||
      sliceCount < 1 || sliceCount > 256 || maxSliceMbCount < 1 || maxSliceMbCount > 8)
    throw Error('Invalid direct-packed ProRes mailbox frame');
  const descriptors = new Uint32Array(memory, packetOffset + descriptorOffset, sliceCount * 8);
  let covered = 0;
  for (let i = 0; i < sliceCount; i++) {
    const at = i * 8;
    if (descriptors[at] !== covered * 256 ||
        descriptors[at + 1] !== covered % 40 ||
        descriptors[at + 2] !== Math.floor(covered / 40) ||
        descriptors[at + 3] < 1 ||
        descriptors[at + 3] > maxSliceMbCount || descriptors[at + 1] + descriptors[at + 3] > 40 ||
        descriptors[at + 2] >= 23) throw Error(`Invalid direct-packed ProRes slice ${i}`);
    covered += descriptors[at + 3];
  }
  if (covered !== 40 * 23) throw Error('Incomplete direct-packed ProRes coefficients');
  frameWords[0] = width; frameWords[1] = height;
  frameWords[2] = width * height; frameWords[3] = width * height / 2;
  return {frame, width, height, sliceCount, maxSliceMbCount,
    packedWords: new Uint32Array(memory, packetOffset + coeffOffset, coeffBytes / 4),
    descriptorWords: new Int32Array(memory, packetOffset + descriptorOffset, sliceCount * 8),
    matrixWords: new Uint32Array(memory, packetOffset + matrixOffset, 32),
    frameWords};
}
