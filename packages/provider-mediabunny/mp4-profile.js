// SPDX-License-Identifier: Apache-2.0
// Finite classic avc1/AAC sample-table envelope. Timing tables and identity edits:
// https://developer.apple.com/documentation/quicktime-file-format
const mismatch = () => { throw Object.assign(new Error('Unsupported authored MP4/MOV packet profile'), {code: 'PROVIDER_PROFILE_MISMATCH'}); };
const containers = new Set(['moov', 'trak', 'mdia', 'minf', 'stbl', 'edts', 'dinf']);
const fourcc = bytes => String.fromCharCode(...bytes);

export async function inspectMp4TrackProfiles(reader) {
  const movieTables = new Map(), trackTables = []; let boxes = 0;
  let tables = movieTables;
  const walk = async (at, end, depth = 0) => {
    if (depth > 8) mismatch();
    while (at < end) {
      if (++boxes > 10000 || end - at < 8) mismatch();
      const bytes = await reader.read(at, Math.min(16, end - at));
      const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      let size = view.getUint32(0), header = 8;
      const type = fourcc(bytes.subarray(4, 8));
      if (size === 1) { if (bytes.length < 16) mismatch(); size = Number(view.getBigUint64(8)); header = 16; }
      if (size === 0) size = end - at;
      if (!Number.isSafeInteger(size) || size < header || size > end - at) mismatch();
      const data = at + header, next = at + size;
      if (['moof', 'mvex', 'cslg', 'stps', 'stz2'].includes(type)) mismatch();
      if (type === 'trak') {
        if (trackTables.length >= 2) mismatch();
        const track = new Map(); trackTables.push(track);
        const previous = tables; tables = track;
        await walk(data, next, depth + 1); tables = previous;
        at = next; continue;
      }
      if (['mvhd', 'tkhd', 'mdhd', 'stts', 'ctts', 'stsz', 'stss', 'stsd', 'elst', 'dref', 'sgpd', 'sbgp'].includes(type)) {
        if (tables.has(type) || size - header > 1024 * 1024) mismatch();
        tables.set(type, await reader.read(data, size - header));
      } else if (containers.has(type)) await walk(data, next, depth + 1);
      at = next;
    }
  };
  await walk(0, reader.size);
  const parseTrack = tables => {
  const table = (name, minimum) => {
    const bytes = tables.get(name);
    if (!bytes || bytes.length < minimum) mismatch();
    return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  };
  const header = name => {
    const view = table(name, 20), version = view.getUint8(0);
    if (version > 1) mismatch();
    const at = version ? 20 : 12;
    if (view.byteLength < at + (version ? 12 : 8)) mismatch();
    const scale = view.getUint32(at), duration = version ? Number(view.getBigUint64(at + 4)) : view.getUint32(at + 4);
    if (!scale || !Number.isSafeInteger(duration)) mismatch();
    return {scale, duration};
  };
  const media = header('mdhd');
  const trackHeader = table('tkhd', 24), trackId = trackHeader.getUint32(trackHeader.getUint8(0) ? 20 : 12);
  if (!trackId || trackHeader.getUint8(0)>1) mismatch();
  const sampleDescription = table('stsd', 44), sampleType=fourcc(tables.get('stsd').subarray(12,16));
  if (!['avc1','mp4a'].includes(sampleType)) mismatch();
  const audio=sampleType==='mp4a', audioVersion=audio?sampleDescription.getUint16(24):0, childStart=audio?(audioVersion===1?60:44):94;
  if(audio&&media.scale!==48000)mismatch();
  if(sampleDescription.byteLength<childStart) mismatch();
  if(audio&&(audioVersion>1||![1,2].includes(sampleDescription.getUint16(32))||sampleDescription.getUint32(40)!==48000*65536))mismatch();
  if (sampleDescription.getUint32(0) !== 0 || sampleDescription.getUint32(4) !== 1 || sampleDescription.getUint32(8) !== sampleDescription.byteLength - 8 || sampleDescription.getUint16(22) !== 1) mismatch();
  if(audioVersion===1&&(sampleDescription.getInt16(36)!==-2||sampleDescription.getUint32(44)!==0||sampleDescription.getUint32(48)!==0||sampleDescription.getUint32(52)!==0||sampleDescription.getUint32(56)!==2))mismatch();
  let configurations = 0;
  for (let at = childStart; at < sampleDescription.byteLength;) {
    if (sampleDescription.byteLength - at < 8) mismatch();
    const size = sampleDescription.getUint32(at), type = fourcc(tables.get('stsd').subarray(at + 4, at + 8));
    if (size < 8 || size > sampleDescription.byteLength - at || !(audio?['esds','btrt','free']:['avcC', 'colr', 'pasp', 'btrt', 'free']).includes(type)) mismatch();
    if (type === (audio?'esds':'avcC')) configurations++;
    at += size;
  }
  if (configurations !== 1) mismatch();
  // Require one local, self-contained data reference; never follow another URL.
  const reference = table('dref', 20);
  if (reference.getUint32(0) !== 0 || reference.getUint32(4) !== 1 || reference.getUint32(8) !== 12 || fourcc(tables.get('dref').subarray(12, 16)) !== 'url ' || reference.getUint32(16) !== 1 || reference.byteLength !== 20) mismatch();
  const sizes = table('stsz', 12), count = sizes.getUint32(8), fixed = sizes.getUint32(4);
  if (!count || count > 100000 || sizes.getUint32(0) !== 0 || sizes.byteLength !== 12 + (fixed ? 0 : 4 * count)) mismatch();
  if(audio&&count>1){
    const descriptions=table('sgpd',16),groups=table('sbgp',12),entries=descriptions.getUint32(12),runs=groups.getUint32(8);
    if(descriptions.getUint32(0)!==0x01000000||fourcc(tables.get('sgpd').subarray(4,8))!=='roll'||descriptions.getUint32(8)!==2||!entries||entries>count||descriptions.byteLength!==16+entries*2||groups.getUint32(0)!==0||fourcc(tables.get('sbgp').subarray(4,8))!=='roll'||groups.byteLength!==12+runs*8||runs>count)mismatch();
    for(let i=0;i<entries;i++)if(descriptions.getInt16(16+i*2)!==-1)mismatch();
    let index=0;
    for(let i=0;i<runs;i++){
      const length=groups.getUint32(12+i*8),group=groups.getUint32(16+i*8);
      if(!length||length>count-index||group>entries)mismatch();
      for(let j=0;j<length;j++,index++)if((index===0&&group!==0)||(index>0&&group===0))mismatch();
    }
    if(index!==count)mismatch();
  }else if(tables.has('sgpd')||tables.has('sbgp'))mismatch();
  const timing = table('stts', 8), entries = timing.getUint32(4);
  if (timing.getUint32(0) !== 0 || timing.byteLength !== 8 + 8 * entries || entries > count) mismatch();
  const packets = []; let time = 0;
  for (let i = 0; i < entries; i++) {
    const n = timing.getUint32(8 + i * 8), duration = timing.getUint32(12 + i * 8);
    if (!n || !duration || n > count - packets.length) mismatch();
    if(audio&&duration!==1024)mismatch();
    for (let j = 0; j < n; j++) {
      const size = fixed || sizes.getUint32(12 + packets.length * 4);
      if (!size) mismatch();
      packets.push({timestamp: time / media.scale, duration: duration / media.scale, size, type: 'key'});
      time += duration;
      if (!Number.isSafeInteger(time)) mismatch();
    }
  }
  if (packets.length !== count || time !== media.duration) mismatch();
  if (tables.has('ctts')) {
    const offsets = table('ctts', 8), entries = offsets.getUint32(4); let n = 0;
    if (offsets.getUint8(0) > 1 || offsets.byteLength !== 8 + 8 * entries || entries > count) mismatch();
    for (let i = 0; i < entries; i++) { const length = offsets.getUint32(8 + i * 8); if (!length || offsets.getUint32(12 + i * 8)) mismatch(); n += length; }
    if (n !== count) mismatch();
  }
  if (tables.has('stss')) {
    const sync = table('stss', 8), entries = sync.getUint32(4); let previous = 0;
    if (sync.getUint32(0) !== 0 || !entries || entries > count || sync.byteLength !== 8 + 4 * entries) mismatch();
    for (const packet of packets) packet.type = 'delta';
    for (let i = 0; i < entries; i++) { const index = sync.getUint32(8 + i * 4); if (index <= previous || index > count) mismatch(); packets[index - 1].type = 'key'; previous = index; }
    if (packets[0].type !== 'key') mismatch();
  }
  if (tables.has('elst')) {
    const edits = table('elst', 8), version = edits.getUint8(0), width = version ? 20 : 12;
    if (version > 1 || edits.getUint32(4) !== 1 || edits.byteLength !== 8 + width) mismatch();
    const duration = version ? Number(edits.getBigUint64(8)) : edits.getUint32(8);
    const start = version ? edits.getBigInt64(16) : BigInt(edits.getInt32(12));
    if (duration !== Math.round(time / media.scale * movie.scale) || start !== 0n || edits.getUint32(8 + width - 4) !== 65536) mismatch();
  }
  return {id:trackId,type:audio?'audio':'video',packets,duration:time/media.scale};
  };
  const movieBytes=movieTables.get('mvhd');
  if(!movieBytes||movieBytes.length<20||movieBytes[0]>1)mismatch();
  const mv=new DataView(movieBytes.buffer,movieBytes.byteOffset,movieBytes.byteLength),at=movieBytes[0]?20:12;
  if(mv.byteLength<at+(movieBytes[0]?12:8))mismatch();
  const movie={scale:mv.getUint32(at),duration:movieBytes[0]?Number(mv.getBigUint64(at+4)):mv.getUint32(at+4)};
  if(!movie.scale||!Number.isSafeInteger(movie.duration)||!trackTables.length)mismatch();
  const tracks=trackTables.map(parseTrack);
  if(new Set(tracks.map(track=>track.id)).size!==tracks.length||tracks.filter(track=>track.type==='video').length>1||tracks.filter(track=>track.type==='audio').length>1||Math.round(Math.max(...tracks.map(track=>track.duration))*movie.scale)!==movie.duration)mismatch();
  return tracks;
}

export async function inspectMp4PacketProfile(reader){
  const tracks=await inspectMp4TrackProfiles(reader);
  if(tracks.length!==1||tracks[0].type!=='video')mismatch();
  return tracks[0].packets;
}
