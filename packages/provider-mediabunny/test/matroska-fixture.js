// SPDX-License-Identifier: Apache-2.0
// Independently authored, deliberately small Matroska fixture writer. No
// MediaBunny mux code is used. Element IDs/layout follow RFC 9559:
// https://www.matroska.org/technical/elements.html
const join = parts => {
  const bytes = new Uint8Array(parts.reduce((size, part) => size + part.length, 0));
  let at = 0;
  for (const part of parts) { bytes.set(part, at); at += part.length; }
  return bytes;
};
function integer(value) {
  if (!Number.isSafeInteger(value) || value < 0) throw new RangeError('Invalid fixture integer');
  const bytes = [];
  do { bytes.unshift(value % 256); value = Math.floor(value / 256); } while (value);
  return new Uint8Array(bytes);
}
function size(value) {
  for (let width = 1; width <= 4; width++) if (value < 2 ** (7 * width) - 1) {
    const bytes = new Uint8Array(width);
    for (let i = width - 1; i >= 0; i--) { bytes[i] = value % 256; value = Math.floor(value / 256); }
    bytes[0] |= 1 << (8 - width);
    return bytes;
  }
  throw new RangeError('Fixture too large');
}
const element = (id, data) => join([integer(id), size(data.length), data]);
const uint = (id, value) => element(id, integer(value));
const text = (id, value) => element(id, new TextEncoder().encode(value));
const group = (id, children) => element(id, join(children));
function float(id, value) {
  const bytes = new Uint8Array(8); new DataView(bytes.buffer).setFloat64(0, value);
  return element(id, bytes);
}

/** One VP8 track, no lacing/edits, explicit BlockDuration and key/delta flags.
 * Bitstreams are supplied by the test; this helper never creates a codec. */
export function matroskaFixture(packets, {width, height, scale = 1000000, name = 'Independent VP8', language = 'eng', colorSpace} = {}) {
  if (!packets.length || width < 1 || height < 1) throw new TypeError('Invalid fixture tracks');
  const colors = [];
  if (colorSpace) {
    if (colorSpace.primaries !== 'bt709' || colorSpace.matrix !== 'bt709' || !['bt709', 'iec61966-2-1'].includes(colorSpace.transfer) || typeof colorSpace.fullRange !== 'boolean') throw new TypeError('Unsupported independent fixture color configuration');
    colors.push(group(0x55b0, [uint(0x55b1, 1), uint(0x55ba, colorSpace.transfer === 'bt709' ? 1 : 13), uint(0x55bb, 1), uint(0x55b9, colorSpace.fullRange ? 2 : 1)]));
  }
  let previousTicks;
  const blocks = packets.map(packet => {
    const rawTicks = packet.timestamp * 1e9 / scale, rawDuration = packet.duration * 1e9 / scale;
    const ticks = Math.round(rawTicks), duration = Math.round(rawDuration);
    if (Math.abs(ticks - rawTicks) > 1e-6 || ticks < 0 || ticks > 32767 || Math.abs(duration - rawDuration) > 1e-6 || duration < 0 || (packet.type !== 'key' && previousTicks === undefined)) throw new RangeError('Fixture timeline is outside its finite profile');
    const header = new Uint8Array([0x81, ticks >> 8, ticks & 255, 0]);
    const reference = previousTicks - ticks;
    previousTicks = ticks;
    return group(0xa0, [element(0xa1, join([header, packet.data])), uint(0x9b, duration), ...(packet.type === 'key' ? [] : [element(0xfb, new Uint8Array([(reference >> 8) & 255, reference & 255]))])]);
  });
  const duration = Math.max(...packets.map(packet => packet.timestamp + packet.duration)) * 1e9 / scale;
  return join([
    group(0x1a45dfa3, [uint(0x4286, 1), uint(0x42f7, 1), uint(0x42f2, 4), uint(0x42f3, 8), text(0x4282, 'matroska'), uint(0x4287, 4), uint(0x4285, 2)]),
    group(0x18538067, [
      group(0x1549a966, [uint(0x2ad7b1, scale), float(0x4489, duration), text(0x4d80, 'Demuxe independent fixture'), text(0x5741, 'Demuxe independent fixture')]),
      group(0x1654ae6b, [group(0xae, [uint(0xd7, 1), uint(0x73c5, 1), uint(0x83, 1), text(0x86, 'V_VP8'), text(0x536e, name), text(0x22b59c, language), group(0xe0, [uint(0xb0, width), uint(0xba, height), ...colors])])]),
      group(0x1f43b675, [uint(0xe7, 0), ...blocks]),
    ]),
  ]);
}
