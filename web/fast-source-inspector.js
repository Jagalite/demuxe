// SPDX-License-Identifier: Apache-2.0
// Bounded local-file metadata for Demuxe route admission. Unknown means FFmpeg
// inspection must decide. No packet iteration, sample tables or Cluster payloads.
const MAX_META = 1024 * 1024, MAX_READS = 96, MAX_BYTES = 2 * 1024 * 1024;
const dec = new TextDecoder('latin1');
const str = (b, a, n) => dec.decode(b.subarray(a, a + n));
const hex = n => n.toString(16).padStart(2, '0');
const u16 = (b, a) => new DataView(b.buffer, b.byteOffset, b.byteLength).getUint16(a);
const u32 = (b, a) => new DataView(b.buffer, b.byteOffset, b.byteLength).getUint32(a);
class Unknown extends Error {}
const unknown = reason => {throw new Unknown(reason);};
class Source {
  constructor(file, signal, headerCache = true) {this.file = file; this.signal = signal; this.bytes = 0; this.reads = 0; this.cache = null; this.headerCache = headerCache;}
  async read(at, n, block = 0) {
    if (this.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    if (!Number.isSafeInteger(at) || n < 0 || at < 0 || at + n > this.file.size || n > MAX_META) unknown('Source bounds');
    if (this.cache && at >= this.cache.at && at + n <= this.cache.at + this.cache.data.length)
      return this.cache.data.subarray(at - this.cache.at, at - this.cache.at + n);
    const count = Math.min(this.file.size - at, Math.max(n, block));
    if (++this.reads > MAX_READS || this.bytes + count > MAX_BYTES) unknown('Metadata read budget');
    const data = new Uint8Array(await this.file.slice(at, at + count).arrayBuffer());
    if (this.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    this.bytes += data.length;
    if (data.length < n) unknown('Short metadata read');
    this.cache = block ? {at, data} : null;
    return data.subarray(0, n);
  }
}
function eachBox(b, start, end, fn) {
  let count = 0;
  for (let p = start; p < end;) {
    if (++count > 256 || p + 8 > end) unknown('ISO box table');
    let size = u32(b, p), header = 8;
    const type = str(b, p + 4, 4);
    if (size === 1) {if (p + 16 > end) unknown('ISO large header'); size = Number(new DataView(b.buffer, b.byteOffset, b.byteLength).getBigUint64(p + 8)); header = 16;}
    if (!Number.isSafeInteger(size) || size < header || p + size > end) unknown('ISO box bounds');
    fn(type, p + header, p + size, p);
    p += size;
  }
}
const box = (b, start, end, wanted) => {
  let found;
  eachBox(b, start, end, (type, a, z) => {if (type === wanted) {if (found) unknown('Duplicate ' + wanted); found = [a, z];}});
  if (!found) unknown('Missing ' + wanted);
  return found;
};
function videoString(type, b, a, z) {
  eachBox(b, a, z, child => {
    if (!['avcC', 'hvcC', 'av1C', 'vpcC', 'pasp', 'btrt', 'colr', 'clap', 'fiel', 'mdcv', 'clli'].includes(child))
      unknown('Complex ISO video extension ' + child);
  });
  if (type === 'avc1' || type === 'avc3') {
    const [s, e] = box(b, a, z, 'avcC');
    if (e - s < 7 || b[s] !== 1) unknown('AVC configuration');
    return {codec: 'h264', codecString: 'avc1.' + hex(b[s + 1]) + hex(b[s + 2]) + hex(b[s + 3])};
  }
  if (type === 'hvc1' || type === 'hev1') {
    const [s, e] = box(b, a, z, 'hvcC');
    if (e - s < 23 || b[s] !== 1) unknown('HEVC configuration');
    let compatibility = 0;
    for (let i = 0; i < 32; i++) if (b[s + 2 + (i >> 3)] & (1 << (7 - (i & 7)))) compatibility = (compatibility | (1 << i)) >>> 0;
    const constraints = [...b.subarray(s + 6, s + 12)];
    while (constraints.length && constraints.at(-1) === 0) constraints.pop();
    return {codec: 'hevc', codecString: `hev1.${['', 'A', 'B', 'C'][b[s + 1] >> 6]}${b[s + 1] & 31}.${compatibility.toString(16)}.${b[s + 1] & 32 ? 'H' : 'L'}${b[s + 12]}${constraints.map(x => '.' + hex(x)).join('')}`};
  }
  if (type === 'av01') {
    const [s, e] = box(b, a, z, 'av1C');
    if (e - s < 4 || !(b[s] & 0x80)) unknown('AV1 configuration');
    const profile = b[s + 1] >> 5, level = b[s + 1] & 31, tier = b[s + 2] & 0x80 ? 'H' : 'M';
    const depth = b[s + 2] & 0x40 ? b[s + 2] & 0x20 ? 12 : 10 : 8;
    return {codec: 'av1', codecString: `av01.${profile}.${String(level).padStart(2, '0')}${tier}.${String(depth).padStart(2, '0')}`};
  }
  if (type === 'vp09') {
    const [s, e] = box(b, a, z, 'vpcC');
    if (e - s < 12) unknown('VP9 configuration');
    return {codec: 'vp9', codecString: `vp09.${String(b[s + 4]).padStart(2, '0')}.${String(b[s + 5]).padStart(2, '0')}.${String(b[s + 6]).padStart(2, '0')}`};
  }
  unknown('Unsupported ISO video ' + type);
}
function audioEntry(type, b, a, z) {
  if (a < z) eachBox(b, a, z, child => {
    if (!['esds', 'btrt', 'chan', 'dOps', 'dfLa'].includes(child)) unknown('Complex ISO audio extension ' + child);
  });
  if (type === 'mp4a') {
    const [s, e] = box(b, a, z, 'esds');
    const descriptor = (at, tag) => {
      if (b[at++] !== tag) unknown('Unexpected ES descriptor');
      let n = 0, done = false;
      for (let i = 0; i < 4; i++) {const c = b[at++]; n = n * 128 + (c & 127); if (!(c & 128)) {done = true; break;}}
      if (!done || at + n > e) unknown('ES descriptor bounds');
      return [at, at + n];
    };
    if (u32(b, s) !== 0) unknown('ESDS version');
    const [es] = descriptor(s + 4, 3);
    if (b[es + 2] !== 0) unknown('Complex ES flags');
    const [cfg, cfgEnd] = descriptor(es + 3, 4);
    if (b[cfg] === 0x6b) return {codec: 'mp3', codecString: 'mp3'};
    if (b[cfg] !== 0x40) unknown('Unsupported MP4 audio object');
    if (cfg + 13 >= cfgEnd) unknown('Short AAC decoder config');
    const [asc, ascEnd] = descriptor(cfg + 13, 5);
    if (ascEnd - asc < 2) unknown('AAC configuration absent');
    const object = b[asc] >> 3;
    if (object !== 2) unknown('AAC profile outside cheap LC');
    return {codec: 'aac', codecString: 'mp4a.40.2', aacObject: 2};
  }
  if (type === '.mp3') return {codec: 'mp3', codecString: 'mp3'};
  if (type === 'Opus') return {codec: 'opus', codecString: 'opus'};
  if (type === 'fLaC') return {codec: 'flac', codecString: 'flac'};
  if (type === 'sowt' || type === 'lpcm') return {codec: 'pcm_s16le'};
  unknown('Unsupported ISO audio ' + type);
}
async function iso(src) {
  let moov = null, ftyp = false, mdat = false;
  for (let p = 0, n = 0; p < src.file.size;) {
    if (++n > 64) unknown('Too many ISO top-level boxes');
    const h = await src.read(p, Math.min(16, src.file.size - p), src.headerCache ? 256 : 0);
    if (h.length < 8) unknown('Short ISO header');
    const type = str(h, 4, 4);
    let size = u32(h, 0), header = 8;
    if (size === 1) {size = Number(new DataView(h.buffer, h.byteOffset, h.byteLength).getBigUint64(8)); header = 16;}
    if (!Number.isSafeInteger(size) || size < header || p + size > src.file.size) unknown('ISO top-level bounds');
    if (type === 'moof' || type === 'sidx' || type === 'pssh') unknown('Fragmented/encrypted ISO');
    if (type === 'ftyp') ftyp = true;
    if (type === 'mdat') mdat = true;
    if (type === 'moov') {if (moov || size > MAX_META) unknown('Ambiguous/large moov'); moov = await src.read(p + header, size - header);}
    p += size;
  }
  if (!moov || !mdat || !ftyp) unknown('Incomplete ISO movie');
  const tracks = [];
  let duration = 0;
  eachBox(moov, 0, moov.length, (type, a, z) => {
    if (type === 'mvex' || type === 'pssh') unknown('Fragmented/encrypted ISO movie');
    if (type === 'mvhd') {
      const version = moov[a], scale = u32(moov, a + (version ? 20 : 12));
      const ticks = version ? Number(new DataView(moov.buffer, moov.byteOffset, moov.byteLength).getBigUint64(a + 24)) : u32(moov, a + 16);
      if (scale) duration = ticks / scale;
    }
    if (type !== 'trak') return;
    if (tracks.length >= 8) unknown('Too many ISO tracks');
    eachBox(moov, a, z, child => {
      if (child === 'tref' || child === 'sinf') unknown('ISO track dependency/encryption');
      if (child === 'edts') {
        const [ea, ez] = box(moov, a, z, 'edts');
        const [la, lz] = box(moov, ea, ez, 'elst');
        if (lz - la < 8 || u32(moov, la + 4) !== 1) unknown('Complex ISO edit list');
      }
    });
    const [ta, tz] = box(moov, a, z, 'tkhd');
    if ((u32(moov, ta) & 1) === 0) unknown('Disabled ISO track');
    const version = moov[ta], matrixAt = ta + (version ? 52 : 40);
    const identity = [65536, 0, 0, 0, 65536, 0, 0, 0, 1073741824];
    for (let i = 0; i < 9; i++) if (u32(moov, matrixAt + i * 4) !== identity[i]) unknown('Rotated/transformed ISO track');
    const [ma, mz] = box(moov, a, z, 'mdia');
    const [mda, mdz] = box(moov, ma, mz, 'mdhd');
    const langAt = mda + (moov[mda] === 1 ? 32 : 20);
    if (langAt + 2 > mdz) unknown('Short ISO language');
    const packedLang = u16(moov, langAt);
    // QuickTime writes 0x7fff for unspecified language; ISO files use packed ISO 639.
    const lang = packedLang && packedLang !== 0x7fff ?
      [10, 5, 0].map(shift => String.fromCharCode(96 + ((packedLang >> shift) & 31))).join('') : 'und';
    if (!/^[a-z]{3}$/.test(lang)) unknown('Invalid ISO language');
    const [ha] = box(moov, ma, mz, 'hdlr');
    const handler = str(moov, ha + 8, 4);
    const subtitleHandler = ['sbtl', 'subt', 'text', 'clcp'].includes(handler);
    if (!['vide', 'soun'].includes(handler) && !subtitleHandler) unknown('Unknown ISO track ' + handler);
    const [mina, minz] = box(moov, ma, mz, 'minf');
    const [sta, stz] = box(moov, mina, minz, 'stbl');
    const [sda, sdz] = box(moov, sta, stz, 'stsd');
    if (u32(moov, sda + 4) !== 1) unknown('Multiple ISO sample descriptions');
    const entryStart = sda + 8, entrySize = u32(moov, entryStart), entryType = str(moov, entryStart + 4, 4);
    if (entrySize < 16 || entryStart + entrySize !== sdz) unknown('Complex ISO sample description');
    const data = entryStart + 8, end = entryStart + entrySize;
    if (u16(moov, data + 6) !== 1) unknown('External ISO data reference');
    const index = tracks.length, kind = handler === 'vide' ? 'video' : handler === 'soun' ? 'audio' : 'sub';
    const id = String(1 + tracks.filter(t => t.type === kind).length);
    let record;
    if (kind === 'video') {
      const width = u16(moov, data + 24), height = u16(moov, data + 26);
      if (!width || !height) unknown('Video dimensions absent');
      record = {id, index, type: kind, default: true, forced: false, lang, title: '', width, height,
        ...videoString(entryType, moov, data + 78, end)};
    } else if (kind === 'audio') {
      const channels = u16(moov, data + 16), sampleRate = u32(moov, data + 24) >>> 16;
      if (!channels || !sampleRate) unknown('Audio layout absent');
      record = {id, index, type: kind, default: true, forced: false, lang, title: '', channels, sampleRate,
        ...audioEntry(entryType, moov, data + 28, end)};
    } else {
      // Sample descriptions identify the track; subtitle samples are never read.
      if (!['tx3g', 'text'].includes(entryType)) unknown('Unknown ISO subtitle sample ' + entryType);
      if (entryType === 'tx3g' && end - data < 46) unknown('Short timed-text description');
      if (entryType === 'text' && end - data < 8) unknown('Short QuickTime text description');
      record = {id, index, type: 'sub', codec: 'mov_text', default: true, forced: false, lang, title: ''};
    }
    tracks.push(record);
  });
  if (!tracks.length || tracks.filter(t => t.type === 'video').length > 1 || tracks.filter(t => t.type === 'audio').length > 1)
    unknown('ISO alternate tracks need FFmpeg selection');
  return {tracks, duration, format: 'mov,mp4,m4a,3gp,3g2,mj2'};
}
const vint = (b, at, id = false) => {
  const first = b[at]; if (first === undefined) unknown('Short EBML header');
  let width = 1, mask = 0x80;
  while (!(first & mask) && width <= 8) {width++; mask >>= 1;}
  if (width > (id ? 4 : 8) || at + width > b.length) unknown('EBML VINT');
  let value = id ? first : first & (mask - 1);
  for (let i = 1; i < width; i++) value = value * 256 + b[at + i];
  if (!id && value === 2 ** (7 * width) - 1) value = null;
  return [value, width];
};
function ebmlElements(b, start, end, fn) {
  for (let p = start, count = 0; p < end;) {
    if (++count > 256) unknown('EBML child count');
    const [id, iw] = vint(b, p, true), [size, sw] = vint(b, p + iw);
    const a = p + iw + sw;
    if (size === null || a + size > end) unknown('Unknown/invalid EBML child size');
    fn(id, a, a + size);
    p = a + size;
  }
}
const uint = (b, a, z) => {if (z - a > 6) unknown('Large EBML integer'); let n = 0; for (let p = a; p < z; p++) n = n * 256 + b[p]; return n;};
const float = (b, a, z) => {const d = new DataView(b.buffer, b.byteOffset, b.byteLength); return z - a === 4 ? d.getFloat32(a) : z - a === 8 ? d.getFloat64(a) : NaN;};
const mkCodec = new Map([
  ['V_MPEG4/ISO/AVC', 'h264'], ['V_MPEGH/ISO/HEVC', 'hevc'], ['V_AV1', 'av1'],
  ['V_VP8', 'vp8'], ['V_VP9', 'vp9'], ['A_AAC', 'aac'], ['A_OPUS', 'opus'],
  ['A_VORBIS', 'vorbis'], ['A_FLAC', 'flac'], ['A_AC3', 'ac3'], ['A_EAC3', 'eac3'],
  ['A_DTS', 'dts'], ['A_PCM/INT/LIT', 'pcm_s16le'],
  ['S_TEXT/ASS', 'ass'], ['S_TEXT/SSA', 'ssa'], ['S_TEXT/UTF8', 'subrip'],
  ['S_HDMV/PGS', 'hdmv_pgs_subtitle'], ['S_VOBSUB', 'dvd_subtitle'],
]);
function ebmlTrack(b, start, end, index, ids) {
  // Matroska's FlagDefault and FlagForced default to 1 and 0 respectively.
  const t = {index, default: true, forced: false, lang: '', title: ''};
  let privateData = null, declared = null, hasEncoding = false, enabled = true;
  ebmlElements(b, start, end, (id, a, z) => {
    if (id === 0x83) t.type = ({1: 'video', 2: 'audio', 17: 'sub'})[uint(b, a, z)] ?? 'unknown';
    else if (id === 0x86) declared = str(b, a, z - a);
    else if (id === 0x63a2) privateData = b.subarray(a, z);
    else if (id === 0x88) t.default = !!uint(b, a, z);
    else if (id === 0x55aa) t.forced = !!uint(b, a, z);
    else if (id === 0xb9) enabled = !!uint(b, a, z);
    else if (id === 0x6d80) hasEncoding = true;
    else if (id === 0x22b59c || id === 0x22b59d) {const language = str(b, a, z - a); if (language !== 'und') t.lang = language;}
    else if (id === 0x536e) t.title = str(b, a, z - a);
    else if (id === 0xe0) ebmlElements(b, a, z, (key, x, y) => {
      if (key === 0xb0) t.width = uint(b, x, y);
      if (key === 0xba) t.height = uint(b, x, y);
    });
    else if (id === 0xe1) ebmlElements(b, a, z, (key, x, y) => {
      if (key === 0xb5) t.sampleRate = float(b, x, y);
      if (key === 0x9f) t.channels = uint(b, x, y);
      if (key === 0x6264) t.bits = uint(b, x, y);
    });
  });
  if (!enabled || hasEncoding || !declared || !t.type || t.type === 'unknown') unknown('Disabled/encoded/unknown Matroska track');
  t.codec = mkCodec.get(declared);
  if (!t.codec) unknown('Unsupported Matroska codec ' + declared);
  if (t.type === 'sub') {
    if (!declared.startsWith('S_')) unknown('Matroska subtitle type mismatch');
    if (['ass', 'ssa', 'dvd_subtitle'].includes(t.codec) && !privateData?.length)
      unknown('Subtitle codec private data absent');
    t.id = String(++ids.sub);
    return t;
  }
  if (t.codec === 'h264' || t.codec === 'hevc') {
    if (!privateData) unknown('Matroska video configuration absent');
    if (t.codec === 'h264') {
      if (privateData.length < 7 || privateData[0] !== 1) unknown('Matroska AVC configuration');
      t.codecString = 'avc1.' + hex(privateData[1]) + hex(privateData[2]) + hex(privateData[3]);
    } else {
      if (privateData.length < 23 || privateData[0] !== 1) unknown('Matroska HEVC configuration');
      // Reuse the same HEVC profile-string routine as ISO by wrapping a tiny hvcC box.
      const child = new Uint8Array(privateData.length + 8);
      new DataView(child.buffer).setUint32(0, child.length); child.set([104, 118, 99, 67], 4); child.set(privateData, 8);
      t.codecString = videoString('hvc1', child, 0, child.length).codecString;
    }
  } else if (t.codec === 'aac') {t.aacObject = privateData?.[0] >> 3 || 2; t.codecString = `mp4a.40.${t.aacObject}`;}
  else t.codecString = ({vp8: 'vp8', opus: 'opus', vorbis: 'vorbis', flac: 'flac', ac3: 'ac-3', eac3: 'ec-3'})[t.codec];
  if (t.type === 'video' && (!t.width || !t.height)) unknown('Matroska video dimensions absent');
  if (t.type === 'audio' && (!t.channels || !t.sampleRate)) unknown('Matroska audio layout absent');
  t.id = String(++ids[t.type]);
  return t;
}
async function ebmlFileElements(src, start, end, fn) {
  for (let p = start, count = 0; p < end;) {
    if (++count > 64) unknown('Matroska attachment metadata budget');
    const h = await src.read(p, Math.min(16, end - p), 256);
    const [id, iw] = vint(h, 0, true), [size, sw] = vint(h, iw);
    const a = p + iw + sw;
    if (size === null || a + size > end) unknown('Matroska attachment bounds');
    await fn(id, a, a + size);
    p = a + size;
  }
}
async function ebmlAttachments(src, start, end) {
  const fonts = [];
  await ebmlFileElements(src, start, end, async (id, a, z) => {
    if (id === 0xec || id === 0xbf) return; // Void or CRC-32.
    if (id !== 0x61a7) unknown('Unknown Matroska attachment element ' + id.toString(16));
    let name, mime, data = false;
    await ebmlFileElements(src, a, z, async (key, x, y) => {
      if (key === 0x465c) {data = true; return;} // Skip font bytes, not packets or metadata.
      if (key === 0x466e || key === 0x4660) {
        if (y - x > 256) unknown('Long Matroska attachment label');
        const value = str(await src.read(x, y - x), 0, y - x);
        if (key === 0x466e) name = value; else mime = value;
      } else if (key !== 0x46ae && key !== 0x467e && key !== 0xec && key !== 0xbf)
        unknown('Unknown Matroska attachment property ' + key.toString(16));
    });
    if (!name || !mime || !data || !/\.(ttf|otf|ttc|woff2?)$/i.test(name) ||
        !/^(font\/|application\/(?:x-)?(?:font|truetype|opentype|x-truetype-font|vnd\.ms-opentype))/i.test(mime))
      unknown('Non-font or ambiguous Matroska attachment');
    fonts.push({name, mime});
    if (fonts.length > 16) unknown('Too many Matroska font attachments');
  });
  return {present: true, fonts};
}
async function ebml(src) {
  const head = await src.read(0, 64, 4096);
  const [id, iw] = vint(head, 0, true), [size, sw] = vint(head, iw);
  if (id !== 0x1a45dfa3 || size === null || size > 4096) unknown('EBML header');
  const header = await src.read(iw + sw, size, 4096);
  let docType;
  ebmlElements(header, 0, header.length, (key, a, z) => {if (key === 0x4282) docType = str(header, a, z - a);});
  if (!['matroska', 'webm'].includes(docType)) unknown('Unsupported EBML DocType');
  let p = iw + sw + size, segment;
  for (let n = 0; p < src.file.size && n < 8; n++) {
    const h = await src.read(p, 16, 256), [key, k] = vint(h, 0, true), [length, w] = vint(h, k);
    if (key === 0x18538067) {segment = {start: p + k + w, end: length === null ? src.file.size : p + k + w + length}; break;}
    if (length === null) unknown('Unknown pre-segment size');
    p += k + w + length;
  }
  if (!segment) unknown('Matroska Segment absent');
  let tracks = null, timeScale = 1000000, ticks = 0, attachments = {present: false, fonts: []}, linked = false, children = 0;
  for (p = segment.start; p < segment.end;) {
    if (++children > 2048) unknown('Matroska top-level budget');
    const h = await src.read(p, 16, 256), [key, k] = vint(h, 0, true), [length, w] = vint(h, k);
    const a = p + k + w;
    if (length === null || a + length > segment.end) unknown('Unknown Matroska child size');
    if (key === 0x1941a469) {
      if (attachments.present) unknown('Duplicate Matroska attachments');
      attachments = await ebmlAttachments(src, a, a + length);
    }
    if (key === 0x1654ae6b) {
      if (tracks || length > MAX_META) unknown('Ambiguous/large Matroska Tracks');
      const data = await src.read(a, length);
      tracks = []; const ids = {video: 0, audio: 0, sub: 0};
      ebmlElements(data, 0, data.length, (child, x, y) => {
        if (child === 0xae) tracks.push(ebmlTrack(data, x, y, tracks.length, ids));
      });
    }
    if (key === 0x1549a966 && length < 65536) {
      const data = await src.read(a, length);
      ebmlElements(data, 0, data.length, (child, x, y) => {
        if (child === 0x2ad7b1) timeScale = uint(data, x, y);
        else if (child === 0x4489) ticks = float(data, x, y);
        else if ([0x3cb923, 0x3eb923].includes(child)) linked = true;
      });
    }
    p = a + length;
  }
  if (!tracks?.length || linked) unknown(linked ? 'Linked Matroska segment' : 'Matroska tracks absent');
  if (tracks.filter(t => t.type === 'video').length > 1 || tracks.filter(t => t.type === 'audio').length > 1)
    unknown('Matroska alternate tracks need FFmpeg selection');
  return {tracks, duration: Number.isFinite(ticks) ? ticks * timeScale / 1e9 : 0, format: docType, attachments};
}
async function simple(src, first) {
  const b = first;
  if (str(b, 0, 4) === 'RIFF' && str(b, 8, 4) === 'WAVE') {
    let at = 12, fmt = null;
    for (let n = 0; at + 8 <= src.file.size && n < 32; n++) {
      const h = await src.read(at, 8), size = new DataView(h.buffer, h.byteOffset, h.byteLength).getUint32(4, true);
      const type = str(h, 0, 4); at += 8;
      if (type === 'fmt ') fmt = await src.read(at, Math.min(size, 64));
      if (type === 'data') break;
      at += size + (size & 1);
    }
    if (!fmt || fmt.length < 16) unknown('WAV fmt absent');
    const view = new DataView(fmt.buffer, fmt.byteOffset, fmt.byteLength), tag = view.getUint16(0, true), channels = view.getUint16(2, true), sampleRate = view.getUint32(4, true), bits = view.getUint16(14, true);
    if (tag === 0xfffe) {
      const pcmGuid = [1,0,0,0,0,0,16,0,128,0,0,170,0,56,155,113];
      if (fmt.length < 40 || view.getUint16(16, true) < 22 || view.getUint16(18, true) !== bits || pcmGuid.some((v, i) => fmt[24 + i] !== v))
        unknown('WAV extensible subtype outside cheap PCM');
    } else if (tag !== 1) unknown('WAV format outside cheap PCM');
    if (![16, 24].includes(bits) || !channels || !sampleRate) unknown('WAV format outside cheap PCM');
    return {tracks: [{id: '1', index: 0, type: 'audio', codec: `pcm_s${bits}le`, channels, sampleRate, bits, default: true}], duration: 0, format: 'wav'};
  }
  if (str(b, 0, 4) === 'fLaC') {
    const h = await src.read(4, 38);
    if ((h[0] & 0x7f) !== 0 || u32(h, 0) % 0x1000000 !== 34) unknown('FLAC STREAMINFO absent');
    const sampleRate = (h[14] << 12) | (h[15] << 4) | (h[16] >> 4), channels = ((h[16] >> 1) & 7) + 1;
    const total = ((h[17] & 15) * 2 ** 32) + u32(h, 18);
    return {tracks: [{id: '1', index: 0, type: 'audio', codec: 'flac', channels, sampleRate, default: true}], duration: total / sampleRate, format: 'flac'};
  }
  if (str(b, 0, 4) === 'OggS') unknown('Ogg page/serial census needs more than a tiny header');
  if (b[0] === 0x47) unknown('MPEG-TS PAT/PMT and timestamp duration need separate qualification');
  if (str(b, 0, 7) === '#EXTM3U') unknown('HLS is routed by existing browser/Shaka policy');
  if (b[0] === 0xff && (b[1] & 0xf6) === 0xf0) {
    const object = ((b[2] >> 6) & 3) + 1, rates = [96000, 88200, 64000, 48000, 44100, 32000, 24000, 22050, 16000, 12000, 11025, 8000, 7350];
    const sampleRate = rates[(b[2] >> 2) & 15], channels = ((b[2] & 1) << 2) | (b[3] >> 6);
    if (!sampleRate || !channels || object !== 2) unknown('ADTS configuration');
    return {tracks: [{id: '1', index: 0, type: 'audio', codec: 'aac', codecString: 'mp4a.40.2', aacObject: 2, channels, sampleRate, default: true}], duration: 0, format: 'aac'};
  }
  if (str(b, 0, 3) === 'ID3' || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0)) {
    let at = 0;
    if (str(b, 0, 3) === 'ID3') {
      if (b[3] < 3 || b[3] > 4 || [6, 7, 8, 9].some(i => b[i] & 0x80)) unknown('ID3 header');
      const size = (b[6] << 21) | (b[7] << 14) | (b[8] << 7) | b[9];
      if (size > 65536) unknown('Large ID3 tag');
      const tag = await src.read(10, size);
      for (let p = 0; p + 4 < tag.length; p++) if (str(tag, p, 4) === 'APIC' || str(tag, p, 3) === 'PIC') unknown('MP3 attached picture');
      at = 10 + size + (b[5] & 16 ? 10 : 0);
    }
    const parse = h => {
      if (h.length < 4 || h[0] !== 0xff || (h[1] & 0xe0) !== 0xe0) unknown('MP3 frame sync');
      const version = (h[1] >> 3) & 3, layer = (h[1] >> 1) & 3;
      const bitIndex = h[2] >> 4, rateIndex = (h[2] >> 2) & 3;
      if (version === 1 || layer !== 1 || bitIndex === 0 || bitIndex === 15 || rateIndex === 3) unknown('Unsupported MP3 frame');
      const rates = [44100, 48000, 32000], bitrates = version === 3 ? [0,32,40,48,56,64,80,96,112,128,160,192,224,256,320] : [0,8,16,24,32,40,48,56,64,80,96,112,128,144,160];
      const sampleRate = rates[rateIndex] / (version === 3 ? 1 : version === 2 ? 2 : 4);
      const length = Math.floor((version === 3 ? 144000 : 72000) * bitrates[bitIndex] / sampleRate) + ((h[2] >> 1) & 1);
      return {sampleRate, channels: (h[3] >> 6) === 3 ? 1 : 2, length, version};
    };
    const head = parse(await src.read(at, 4));
    const next = parse(await src.read(at + head.length, 4));
    if (head.sampleRate !== next.sampleRate || head.channels !== next.channels || head.version !== next.version) unknown('Changing MP3 configuration');
    return {tracks: [{id: '1', index: 0, type: 'audio', codec: 'mp3', codecString: 'mp3', channels: head.channels, sampleRate: head.sampleRate, default: true}], duration: 0, format: 'mp3'};
  }
  unknown('Unrecognized or deliberately unsupported format');
}
export async function inspectFastSource(file, {signal, headerCache = true} = {}) {
  const src = new Source(file, signal, headerCache), started = performance.now();
  try {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    const first = await src.read(0, Math.min(64, file.size));
    let probe;
    if (str(first, 4, 4) === 'ftyp') {
      if (headerCache) src.cache = {at: 0, data: first};
      probe = await iso(src);
    }
    else if (first[0] === 0x1a && first[1] === 0x45 && first[2] === 0xdf && first[3] === 0xa3) probe = await ebml(src);
    else probe = await simple(src, first);
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    const embeddedSubtitles = probe.tracks.some(t => t.type === 'sub');
    if (embeddedSubtitles && !(Number.isFinite(probe.duration) && probe.duration > 0))
      unknown('Subtitle route requires a finite container duration');
    return {status: 'qualified', evidence: probe,
      sufficientFor: embeddedSubtitles ? ['native-direct-rejection', 'native-direct-mpv-admission'] : ['native-direct'],
      missingFor: embeddedSubtitles ? ['subtitle-playback', 'native-remux', 'selective-audio'] : ['native-remux', 'hybrid', 'selective-audio'],
      reads: src.reads, bytesRead: src.bytes, wallMs: performance.now() - started};
  } catch (error) {
    if (signal?.aborted || error?.name === 'AbortError') throw error;
    return {status: 'unknown', reason: String(error?.message ?? error), reads: src.reads, bytesRead: src.bytes, wallMs: performance.now() - started};
  }
}
