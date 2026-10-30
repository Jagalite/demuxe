// SPDX-License-Identifier: Apache-2.0
// A finite source-envelope check, not another demuxer. Inspect authored block
// timing that an A/V packet API may normalize before the adapter sees it.
const mismatch = () => { throw Object.assign(new Error('Unsupported authored Matroska packet profile'), {code: 'PROVIDER_PROFILE_MISMATCH'}); };
const containers = new Set([0x18538067, 0x1549a966, 0x1654ae6b, 0xae, 0xe0, 0x1f43b675]);

export async function inspectMatroskaPacketProfile(reader) {
  let scale = 1000000, defaultDuration, trackNumber, clusterTime = 0, nodes = 0;
  const blocks = [];
  const uint = async node => {
    if (node.size < 1 || node.size > 8) mismatch();
    const data = await reader.read(node.data, node.size);
    let value = 0;
    for (const byte of data) value = value * 256 + byte;
    if (!Number.isSafeInteger(value)) mismatch();
    return value;
  };
  const header = async (at, end) => {
    if (++nodes > 500000) mismatch();
    const bytes = await reader.read(at, Math.min(12, end - at));
    const width = (byte, maximum) => {
      let length = 1;
      while (length <= maximum && !(byte & (1 << (8 - length)))) length++;
      if (length > maximum) mismatch();
      return length;
    };
    const idWidth = width(bytes[0], 4), sizeWidth = width(bytes[idWidth], 8);
    if (idWidth + sizeWidth > bytes.length) mismatch();
    let id = 0, length = bytes[idWidth] & ((1 << (8 - sizeWidth)) - 1);
    for (let i = 0; i < idWidth; i++) id = id * 256 + bytes[i];
    let unknown = length === (1 << (8 - sizeWidth)) - 1;
    for (let i = 1; i < sizeWidth; i++) { length = length * 256 + bytes[idWidth + i]; unknown &&= bytes[idWidth + i] === 255; }
    const data = at + idWidth + sizeWidth;
    if (unknown) {
      // Only a top-level Segment can safely extend to EOF in this finite
      // profile. Unknown clusters require sibling-boundary parsing.
      if (id !== 0x18538067) mismatch();
      length = end - data;
    }
    if (!Number.isSafeInteger(length) || length < 0 || length > end - data) mismatch();
    return {id, data, size: length, end: data + length};
  };
  const block = async node => {
    if (blocks.length >= 100000 || node.size < 4) mismatch();
    const bytes = await reader.read(node.data, Math.min(11, node.size));
    let width = 1;
    while (width <= 8 && !(bytes[0] & (1 << (8 - width)))) width++;
    if (width > 8 || width + 3 > bytes.length) mismatch();
    let track = bytes[0] & ((1 << (8 - width)) - 1);
    for (let i = 1; i < width; i++) track = track * 256 + bytes[i];
    const relative = new DataView(bytes.buffer, bytes.byteOffset + width, 2).getInt16(0);
    const flags = bytes[width + 2];
    if (flags & 0x7f) mismatch(); // lacing, invisible, discardable or reserved flags
    return {track, ticks: clusterTime + relative, size: node.size - width - 3, key: !!(flags & 0x80)};
  };
  const walk = async (at, end, depth = 0) => {
    if (depth > 8) mismatch();
    while (at < end) {
      reader.check();
      const node = await header(at, end);
      if (node.id === 0x2ad7b1) { scale = await uint(node); if (!scale) mismatch(); }
      else if (node.id === 0x23e383) defaultDuration = await uint(node);
      else if (node.id === 0xd7) { if (trackNumber !== undefined) mismatch(); trackNumber = await uint(node); }
      else if (node.id === 0xe7) clusterTime = await uint(node);
      else if ([0x56aa, 0x56bb, 0x537f, 0x75a2, 0x53c0].includes(node.id)) { if (await uint(node)) mismatch(); }
      else if (node.id === 0x23314f || node.id === 0x6d80 || node.id === 0x75a1) mismatch();
      else if (node.id === 0xa3) blocks.push(await block(node));
      else if (node.id === 0xa0) {
        let packet, duration, referenced = false;
        for (let childAt = node.data; childAt < node.end;) {
          const child = await header(childAt, node.end);
          if (child.id === 0xa1) { if (packet) mismatch(); packet = await block(child); }
          else if (child.id === 0x9b) { if (duration !== undefined) mismatch(); duration = await uint(child); }
          else if (child.id === 0xfb) referenced = true;
          else if ([0x75a1, 0x75a2, 0x8e].includes(child.id)) mismatch();
          childAt = child.end;
        }
        if (!packet) mismatch();
        blocks.push({...packet, key: !referenced, duration});
      } else if (containers.has(node.id)) {
        if (node.id === 0x1f43b675) clusterTime = 0;
        await walk(node.data, node.end, depth + 1);
      }
      at = node.end;
    }
  };
  await walk(0, reader.size);
  if (!blocks.length || trackNumber === undefined) mismatch();
  return blocks.map(packet => {
    if (packet.track !== trackNumber) mismatch();
    const timestamp = packet.ticks * scale, duration = packet.duration === undefined ? defaultDuration : packet.duration * scale;
    if (!Number.isSafeInteger(timestamp) || timestamp < 0 || (duration !== undefined && (!Number.isSafeInteger(duration) || duration < 0))) mismatch();
    return {timestamp: timestamp / 1e9, duration: duration === undefined ? undefined : duration / 1e9, size: packet.size, type: packet.key ? 'key' : 'delta'};
  });
}
