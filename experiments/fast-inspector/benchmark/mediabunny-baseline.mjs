// SPDX-License-Identifier: Apache-2.0
// Experiment only. No production import or playback use.
import {Input, BlobSource, ALL_FORMATS} from './vendor/mediabunny-1.60.0.min.mjs';

const formatName = new Map([
  ['MP4', 'mov,mp4,m4a,3gp,3g2,mj2'],
  ['QuickTime File Format', 'mov,mp4,m4a,3gp,3g2,mj2'],
  ['Matroska', 'matroska'], ['WebM', 'webm'],
  ['MPEG Transport Stream', 'mpegts'],
]);
const codecName = new Map([
  ['avc', 'h264'], ['hevc', 'hevc'], ['vp8', 'vp8'], ['vp9', 'vp9'], ['av1', 'av1'],
  ['aac', 'aac'], ['opus', 'opus'], ['ac3', 'ac3'], ['eac3', 'eac3'],
  ['pcm-s16', 'pcm_s16le'], ['pcm-s24', 'pcm_s24le'], ['pcm-f32', 'pcm_f32le'],
]);
function normalizeCodec(value) {
  if (!value) return null;
  return codecName.get(value) ?? value.replaceAll('-', '_');
}
function serializableString(value) {
  return typeof value === 'string' && value.length < 128 ? value : undefined;
}
async function isoTrackCensus(file) {
  const decoder = new TextDecoder('latin1');
  const read = async (at, count) => new Uint8Array(await file.slice(at, at + count).arrayBuffer());
  const uint = (b, at) => new DataView(b.buffer, b.byteOffset, b.byteLength).getUint32(at);
  let moov, headerBytes = 0;
  for (let at = 0, boxes = 0; at < file.size && boxes++ < 64;) {
    const h = await read(at, 16); headerBytes += h.length; if (h.length < 8) throw Error('Short ISO box');
    const type = decoder.decode(h.subarray(4, 8));
    let size = uint(h, 0), header = 8;
    if (size === 1) {size = Number(new DataView(h.buffer).getBigUint64(8)); header = 16;}
    if (!Number.isSafeInteger(size) || size < header || at + size > file.size) throw Error('Invalid ISO box');
    if (type === 'moof') throw Error('Fragmented ISO file');
    if (type === 'moov') {
      if (moov || size > 2 * 1024 * 1024) throw Error('Ambiguous or large movie metadata');
      moov = await read(at + header, size - header);
    }
    at += size;
  }
  if (!moov) throw Error('Movie metadata absent');
  let count = 0;
  for (let at = 0; at < moov.length;) {
    if (at + 8 > moov.length) throw Error('Short movie child');
    const size = uint(moov, at), type = decoder.decode(moov.subarray(at + 4, at + 8));
    if (size < 8 || at + size > moov.length) throw Error('Invalid movie child');
    if (type === 'trak') count++;
    at += size;
  }
  return {count, bytesRead: moov.length + headerBytes};
}
async function matroskaCensus(file) {
  let bytesRead = 0;
  const read = async (at, count = 16) => {
    const b = new Uint8Array(await file.slice(at, at + count).arrayBuffer());
    bytesRead += b.length; return b;
  };
  const vint = (b, at, id = false) => {
    const first = b[at]; if (first === undefined) throw Error('Short EBML header');
    let width = 1, mask = 0x80;
    while (!(first & mask) && width <= 8) {width++; mask >>= 1;}
    if (width > (id ? 4 : 8) || at + width > b.length) throw Error('Invalid EBML VINT');
    let value = id ? first : first & (mask - 1);
    for (let i = 1; i < width; i++) value = value * 256 + b[at + i];
    if (!id && value === 2 ** (7 * width) - 1) return {value: null, width};
    return {value, width};
  };
  const header = async at => {
    const b = await read(at);
    const id = vint(b, 0, true), size = vint(b, id.width);
    return {id: id.value, size: size.value, start: at + id.width + size.width};
  };
  const ebml = await header(0);
  if (ebml.id !== 0x1a45dfa3 || ebml.size === null) throw Error('Invalid EBML document');
  let at = ebml.start + ebml.size, segment;
  for (let n = 0; at < file.size && n < 16; n++) {
    const item = await header(at);
    if (item.id === 0x18538067) {segment = item; break;}
    if (item.size === null) throw Error('Unknown EBML presegment size');
    at = item.start + item.size;
  }
  if (!segment) throw Error('Segment absent');
  let entries = null, attachments = false, children = 0;
  const end = segment.size === null ? file.size : Math.min(file.size, segment.start + segment.size);
  for (at = segment.start; at < end;) {
    if (++children > 4096 || bytesRead > 2 * 1024 * 1024) throw Error('EBML census budget exceeded');
    const item = await header(at);
    if (item.size === null || item.start + item.size > end) throw Error('Unknown or invalid EBML child size');
    if (item.id === 0x1941a469) attachments = true;
    if (item.id === 0x1654ae6b) {
      if (entries !== null || item.size > 1024 * 1024) throw Error('Ambiguous or large Tracks element');
      entries = 0;
      for (let pos = item.start; pos < item.start + item.size;) {
        const child = await header(pos);
        if (child.size === null || child.start + child.size > item.start + item.size) throw Error('Invalid track child');
        if (child.id === 0xae) entries++;
        pos = child.start + child.size;
      }
    }
    at = item.start + item.size;
  }
  if (at !== end || entries === null) throw Error('Incomplete EBML census');
  return {count: entries, attachments, bytesRead};
}
export async function inspectFile(file) {
  const source = new BlobSource(file);
  let bytesRead = 0, readEvents = 0;
  source.on('read', ({start, end}) => { bytesRead += end - start; readEvents++; });
  const input = new Input({source, formats: ALL_FORMATS});
  const t0 = performance.now();
  const result = {probe: null, complete: false, reasons: [], bytesRead: 0, stages: {}, raw: {}};
  try {
    const format = await input.getFormat();
    result.stages.formatMs = performance.now() - t0;
    const mbTracks = await input.getTracks();
    result.stages.tracksMs = performance.now() - t0;
    const tracks = [], ids = {video: 0, audio: 0, sub: 0};
    for (const [index, track] of mbTracks.entries()) {
      const type = track.isVideoTrack() ? 'video' : track.isAudioTrack() ? 'audio' : 'sub';
      const [rawCodec, codecString, disposition, lang, title, bitrate] = await Promise.all([
        track.getCodec(), track.getCodecParameterString(), track.getDisposition(),
        track.getLanguageCode(), track.getName(), track.getBitrate(),
      ]);
      const codec = normalizeCodec(rawCodec);
      const mapped = {id: String(++ids[type]), index, type, codec: codec ?? 'unknown',
        codecString: serializableString(codecString), default: !!disposition.default,
        forced: !!disposition.forced, lang: lang === 'und' ? undefined : lang,
        title: title ?? undefined, bitrate: bitrate ?? undefined};
      if (type === 'video') {
        const [width, height] = await Promise.all([track.getCodedWidth(), track.getCodedHeight()]);
        mapped.width = width ?? undefined; mapped.height = height ?? undefined;
      } else if (type === 'audio') {
        const [sampleRate, channels] = await Promise.all([track.getSampleRate(), track.getNumberOfChannels()]);
        mapped.sampleRate = sampleRate ?? undefined; mapped.channels = channels ?? undefined;
        if (codec === 'aac' && codecString?.startsWith('mp4a.40.')) mapped.aacObject = Number(codecString.split('.').at(-1));
      }
      tracks.push(mapped);
      result.raw[`track${index}`] = {id: track.id, type, mediaBunnyCodec: rawCodec,
        internalCodecId: await track.getInternalCodecId(), codecString,
        disposition, lang, title};
    }
    result.stages.configMs = performance.now() - t0;
    const duration = await input.getDurationFromMetadata();
    result.stages.durationMs = performance.now() - t0;
    let tags;
    try { tags = await input.getMetadataTags(); }
    catch (error) { result.reasons.push(`Metadata tags unavailable: ${String(error)}`); }
    const attachments = Object.values(tags?.raw ?? {}).filter(value => value && typeof value === 'object' && 'data' in value);
    result.raw.attachments = attachments.map(x => ({name: x.name ?? null, mimeType: x.mimeType ?? null, bytes: x.data?.byteLength ?? null}));
    result.stages.tagsMs = performance.now() - t0;
    const demuxeFormat = formatName.get(format.name);
    result.raw.format = format.name;
    result.probe = {tracks, duration: duration ?? 0, format: demuxeFormat};
    if (!demuxeFormat) result.reasons.push('Demuxe container mapping is unknown');
    if (!tracks.length || tracks.some(x => x.codec === 'unknown')) result.reasons.push('A track codec is unknown');
    if (tracks.some(x => x.type === 'sub')) result.reasons.push('Embedded subtitles require FFmpeg track classification');
    if (attachments.length) result.reasons.push('Attachments require FFmpeg census');
    if (['matroska', 'webm'].includes(demuxeFormat)) {
      try {
        const census = await matroskaCensus(file);
        result.raw.ebml = {trackCount: census.count, attachments: census.attachments};
        result.bytesRead += census.bytesRead;
        if (census.count !== tracks.length) result.reasons.push('EBML TrackEntry count differs from MediaBunny tracks');
        if (census.attachments) result.reasons.push('EBML attachments require FFmpeg inspection');
      } catch (error) {result.reasons.push(`EBML census failed: ${String(error)}`);}
    }
    if (demuxeFormat === 'mpegts') result.reasons.push('MPEG-TS program and stream census is unproved');
    if (demuxeFormat?.includes('mp4')) {
      try {
        const census = await isoTrackCensus(file);
        result.raw.isoTrackCount = census.count;
        result.bytesRead += census.bytesRead;
        if (census.count !== tracks.length) result.reasons.push('ISO track count differs from MediaBunny tracks');
      } catch (error) {result.reasons.push(`ISO track census failed: ${String(error)}`);}
    }
    if (tracks.length > 2 || tracks.filter(x => x.type === 'video').length > 1 || tracks.filter(x => x.type === 'audio').length > 1)
      result.reasons.push('Multiple tracks need exact FFmpeg stream identity/default semantics');
    if (tracks.some(x => !x.codecString && ['video', 'audio'].includes(x.type))) result.reasons.push('Codec parameter string missing');
    if (tracks.some(x => x.codec?.startsWith('pcm_'))) result.reasons.push('PCM route and adaptation metadata need FFmpeg parity');
    if (!Number.isFinite(duration) || duration <= 0) result.reasons.push('Finite duration unavailable');
    result.complete = result.reasons.length === 0;
  } catch (error) { result.reasons.push(String(error?.stack || error)); }
  finally { result.bytesRead += bytesRead; result.readEvents = readEvents; result.stages.totalMs = performance.now() - t0; input.dispose(); }
  return result;
}
