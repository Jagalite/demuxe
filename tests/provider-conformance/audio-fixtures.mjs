// SPDX-License-Identifier: Apache-2.0
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fixtureMatches} from './registry.mjs';
import {packetTrimMetadata} from './audio-decoder.mjs';
const exec = promisify(execFile);
const integerCodecs = new Set(['truehd', 'mlp', 'dts-hd', 'flac', 'alac', 'pcm-s16le', 'pcm-s24le', 'pcm-s32le','pcm-u8','pcm-s8']);

export function decodeProbeHex(value = '') {
  const hex = value.split('\n').filter(line => line.includes(':')).map(line => line.slice(line.indexOf(':') + 1).split('  ')[0].replaceAll(' ', '')).join('');
  if (hex.length % 2 || /[^0-9a-f]/i.test(hex)) throw Error('Invalid ffprobe packet hex');
  return Uint8Array.from(hex.match(/../g) ?? [], byte => parseInt(byte, 16));
}

async function command(binary, args) {
  try { return await exec(binary, args, {encoding: 'buffer', maxBuffer: 128 * 1024 * 1024}); }
  catch (error) { throw Error(binary + ' failed: ' + (error.stderr?.toString() ?? error.message), {cause: error}); }
}
function typed(buffer, kind) {
  if (buffer.byteLength % kind.BYTES_PER_ELEMENT) throw Error('Misaligned PCM reference');
  return new kind(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));
}

/** Serialize an immutable signed24 source independently of the candidate encoder.
 * Values use the packet contract's left-justified signed32 representation. */
export async function writeSigned24Fixture({pcm, sampleRate, channels}, outputDirectory) {
  if (!Number.isSafeInteger(sampleRate) || sampleRate <= 0 || !Number.isSafeInteger(channels) || channels <= 0) throw Error('Invalid signed24 fixture configuration');
  const bytes = Buffer.from(pcm instanceof Int32Array ? new Uint8Array(pcm.buffer, pcm.byteOffset, pcm.byteLength) : pcm);
  if (!bytes.length || bytes.length % (4 * channels)) throw Error('Invalid signed24 fixture sample count');
  for (let i = 0; i < bytes.length; i += 4) if (bytes.readInt32LE(i) % 256 !== 0) throw Error('Signed24 fixture has excess precision');
  await mkdir(outputDirectory, {recursive: true});
  const raw = path.resolve(outputDirectory, 'source.s32le'), input = path.resolve(outputDirectory, 'source.wav');
  await writeFile(raw, bytes);
  // The packet FLAC encoder's six-channel order is 5.1(side); ffmpeg's raw PCM
  // default is 5.1(back), so an implicit default would mislabel identical samples.
  const layout = ({1: 'mono', 2: 'stereo', 6: '5.1(side)', 8: '7.1'})[channels];
  await command('ffmpeg', ['-v', 'error', '-y', '-f', 's32le', '-ar', String(sampleRate), '-ac', String(channels),
    ...(layout ? ['-channel_layout', layout] : []), '-i', raw, '-c:a', 'pcm_s24le', input]);
  const decoded = (await command('ffmpeg', ['-v', 'error', '-cpuflags', '0', '-i', input, '-f', 's32le', '-'])).stdout;
  if (!decoded.equals(bytes)) throw Error('Signed24 fixture serializer changed immutable PCM');
  return input;
}

/** Independent decoded sample timeline, including native codec priming/trim.
 * Container timestamp ticks bound the accepted timestamp quantization error. */
export async function prepareAudioTimingReference(descriptor) {
  if (!path.isAbsolute(descriptor.input ?? '')) throw Error('Timing reference needs an absolute input path');
  const probe = JSON.parse((await command('ffprobe', ['-v', 'error', '-cpuflags', '0', '-select_streams', 'a:0', '-show_streams', '-show_frames', '-show_entries', 'stream=sample_rate,time_base:frame=pts,nb_samples', '-of', 'json', descriptor.input])).stdout.toString());
  const stream = probe.streams?.[0], sampleRate = Number(stream?.sample_rate);
  if (!Number.isSafeInteger(sampleRate) || sampleRate <= 0 || descriptor.sampleRate !== undefined && descriptor.sampleRate !== sampleRate) throw Error('Invalid native timing sample rate');
  const [numerator, denominator] = String(stream.time_base).split('/').map(Number);
  if (!Number.isSafeInteger(numerator) || numerator <= 0 || !Number.isSafeInteger(denominator) || denominator <= 0) throw Error('Invalid native timing time base');
  const tick = sampleRate * numerator / denominator;
  const segments = (probe.frames ?? []).map(frame => {
    if (frame.pts === undefined) throw Error('Native decoded frame lacks PTS');
    const pts = Math.round(Number(frame.pts) * tick), samples = Number(frame.nb_samples);
    if (!Number.isSafeInteger(pts) || !Number.isSafeInteger(samples) || samples <= 0) throw Error('Invalid native decoded frame timing');
    return {pts, samples};
  });
  if (!segments.length) throw Error('No native decoded frame timing');
  return {segments, toleranceSamples: tick > 1 ? Math.ceil(tick) : 0};
}

/** Creates native reference PCM and packet data from an existing media input. */
export async function prepareAudioFixture(descriptor, outputDirectory) {
  if (!descriptor || !/^[a-zA-Z0-9._-]+$/.test(descriptor.id) || !path.isAbsolute(descriptor.input ?? '')) throw Error('Fixture needs a safe id and absolute input path');
  if ((['adpcm-ima-qt','adpcm-g726','adpcm-g726le'].includes(descriptor.codec)||(['he','he-v2','usac'].includes(descriptor.aacProfile)||descriptor.decoderProfile==='lc-pce8-44100'))&&!descriptor.packetFile)throw Error('Codec requires retained packet descriptor');
  if (descriptor.packetFile&&(['adpcm-ima-qt','adpcm-g726','adpcm-g726le'].includes(descriptor.codec)||(['he','he-v2','usac'].includes(descriptor.aacProfile)||descriptor.decoderProfile==='lc-pce8-44100'))) return prepareRetainedAudioFixture(descriptor, outputDirectory);
  await mkdir(outputDirectory, {recursive: true});
  let packetBytes;if(descriptor.packetFile){packetBytes=await readFile(descriptor.packetFile);if(createHash('sha256').update(packetBytes).digest('hex')!==descriptor.packetSHA256)throw Error('Original packet JSON changed');}
  const probe = JSON.parse(packetBytes??(await command('ffprobe', ['-v', 'error', '-select_streams', 'a:0', '-show_streams', '-show_packets', '-show_data', '-of', 'json', descriptor.input])).stdout.toString());
  const stream = probe.streams?.[0];
  if (!stream || !probe.packets?.length) throw Error('Fixture has no audio packets');
  const sampleRate = Number(descriptor.sampleRate ?? stream.sample_rate), channels = Number(descriptor.channels ?? stream.channels);
  if (sampleRate !== Number(stream.sample_rate) || channels !== Number(stream.channels)) throw Error('Fixture configuration differs from input stream');
  const fixture = {id: descriptor.id, codec: descriptor.codec, sampleRate, channels, bitsPerSample: Number(descriptor.bitsPerSample ?? stream.bits_per_raw_sample ?? stream.bits_per_sample ?? 0), extradata: decodeProbeHex(stream.extradata)};
  const layout = descriptor.layout ?? ({mono: 4, stereo: 3, '5.1': 63, '5.1(side)': 1551, '7.1': 1599})[stream.channel_layout];
  if (layout !== undefined) fixture.layout = layout;
  const [numerator, denominator] = String(stream.time_base).split('/').map(Number);
  const packets = probe.packets.map(packet => {
    const seconds = packet.pts_time === undefined ? Number(packet.pts) * numerator / denominator : Number(packet.pts_time);
    const pts = Math.round(seconds * sampleRate);
    if (!Number.isSafeInteger(pts)) throw Error('Fixture has missing or invalid packet PTS');
    return {data: decodeProbeHex(packet.data), pts};
  });
  const nativeReference = async (format, kind, explicit) => {
    const file = path.join(outputDirectory, descriptor.id + '.' + format.replace('le', ''));
    const bytes = explicit ? await readFile(explicit) : (await command('ffmpeg', ['-v', 'error', '-cpuflags', '0', '-i', descriptor.input, '-map', '0:a:0', '-f', format, '-'])).stdout;
    await writeFile(file, bytes);
    return typed(bytes, kind);
  };
  const reference = await nativeReference('f32le', Float32Array, descriptor.reference);
  const integerReference = integerCodecs.has(fixture.codec) ? await nativeReference('s32le', Int32Array, descriptor.integerReference) : undefined;
  const doubleReference = fixture.codec === 'pcm-f64le' ? await nativeReference('f64le', Float64Array, descriptor.doubleReference) : undefined;
  const timingReference = await prepareAudioTimingReference({...descriptor, sampleRate});
  await writeFile(path.join(outputDirectory, descriptor.id + '.timing.json'), JSON.stringify(timingReference, null, 2) + '\n');
  await writeFile(path.join(outputDirectory, descriptor.id + '.json'), JSON.stringify(probe, null, 2) + '\n');
  return {input: descriptor.input, fixture, packets, reference, timingReference, ...(integerReference ? {integerReference} : {}), ...(doubleReference ? {doubleReference} : {}), ...packetTrimMetadata(fixture.codec, fixture.extradata, probe.packets)};
}

/** A short deterministic tone; native encoders unavailable on the host reject
 * explicitly, so an unsupported generation never becomes a passing test. */
export async function generateAudioFixture({codec, sampleRate = 48000, channels = 2, id = 'generated-' + codec}, outputDirectory) {
  const encoders = {'dts-core': 'dca', 'dts-hd': undefined, ac3: 'ac3', eac3: 'eac3', truehd: 'truehd', mlp: 'mlp', aac: 'aac', opus: 'libopus', vorbis: 'libvorbis', flac: 'flac', alac: 'alac', mp3: 'libmp3lame', 'pcm-s16le': 'pcm_s16le', 'pcm-s24le': 'pcm_s24le', 'pcm-s32le': 'pcm_s32le', 'pcm-f32le': 'pcm_f32le', 'pcm-f64le': 'pcm_f64le'};
  let encoder = encoders[codec];
  if (!encoder || !/^[a-zA-Z0-9._-]+$/.test(id)) throw Error('Native generated fixture unavailable for ' + codec);
  const pcm = codec.startsWith('pcm-');
  const container = codec === 'alac' || pcm ? 'mov' : 'mkv';
  const input = path.resolve(outputDirectory, id + '.' + container);
  await mkdir(outputDirectory, {recursive: true});
  // Two frequencies and distinct channel gains expose silence and channel swaps.
  const source = 'aevalsrc=' + Array.from({length: channels}, (_, channel) => `${0.22 / (channel + 1)}*sin(2*PI*${421 + channel * 173}*t)+${0.03 / (channel + 1)}*sin(2*PI*${977 + channel * 107}*t)`).join('|') + ':s=' + sampleRate + ':d=0.24';
  if (codec === 'vorbis' && !(await command('ffmpeg', ['-hide_banner', '-encoders'])).stdout.toString().includes('libvorbis')) encoder = 'vorbis';
  const args = ['-v', 'error', '-y', '-f', 'lavfi', '-i', source, '-ar', String(sampleRate), '-ac', String(channels), '-c:a', encoder];
  if (['truehd', 'mlp', 'dts-core'].includes(codec) || encoder === 'vorbis') args.push('-strict', 'experimental');
  if (codec === 'aac') args.push('-profile:a', 'aac_low');
  if (codec === 'mp3') args.push('-b:a', '192k');
  if (codec === 'dts-core') args.push('-b:a', '768k');
  args.push(input);
  await command('ffmpeg', args);
  return {id, codec, sampleRate, channels, input};
}

/** Retained packet references preserve codec packing and full decoded clocks;
 * they never infer raw metadata or replace packet PCM with presentation PCM. */
async function prepareRetainedAudioFixture(d, outputDirectory) {
  if(d.codec==='aac')return prepareRetainedAacFixture(d,outputDirectory);
  if(!fixtureMatches({capability:'audio.decode.'+d.codec,version:1,profile:'configured-integer'},d)||!['adpcm-ima-qt','adpcm-g726','adpcm-g726le'].includes(d.codec))throw Error('Invalid retained finite codec descriptor');
  const hash=b=>createHash('sha256').update(b).digest('hex');
  const pinned=async(file,digest)=>{if(!path.isAbsolute(file??'')||!/^[a-f0-9]{64}$/.test(digest??''))throw Error('Retained fixture needs absolute paths and SHA256');const b=await readFile(file);if(hash(b)!==digest)throw Error('Retained fixture SHA256 mismatch');return b;};
  await pinned(d.input,d.inputSHA256);
  const probe=JSON.parse(await pinned(d.packetFile,d.packetSHA256));
  const reference=typed(await pinned(d.reference,d.referenceF32SHA256),Float32Array),integerReference=typed(await pinned(d.integerReference,d.referenceSHA256),Int32Array);
  if(!Number.isSafeInteger(d.referenceSamples)||d.referenceSamples<=0||reference.length!==d.referenceSamples*d.channels||integerReference.length!==reference.length)throw Error('Retained reference extent mismatch');
  const fixture={...d,extradata:decodeProbeHex(probe.streams?.[0]?.extradata)};
  const packets=probe.packets.map(p=>({data:decodeProbeHex(p.data),pts:Math.round(Number(p.pts_time)*d.sampleRate)}));
  let clock=0;const segments=[];
  for(const p of packets){const samples=d.codec==='adpcm-ima-qt'?64:p.data.length*8/d.bitsPerSample;if(!Number.isSafeInteger(samples)||samples<=0||p.pts!==clock||d.codec==='adpcm-ima-qt'&&p.data.length!==34*d.channels)throw Error('Retained original packet framing/clock mismatch');segments.push({pts:clock,samples});clock+=samples;}
  if(clock!==d.referenceSamples)throw Error('Retained full packet extent mismatch');
  await mkdir(outputDirectory,{recursive:true});
  return {input:d.input,fixture,packets,reference,integerReference,timingReference:{segments,toleranceSamples:0},skipSamples:0,discardSamples:0};
}

async function prepareRetainedAacFixture(d,outputDirectory){
  const profile=d.decoderProfile??{he:'he-stereo48','he-v2':'he-v2-stereo44100',usac:'usac-mono48'}[d.aacProfile];
  if(!['he-stereo48','he-v2-stereo44100','usac-mono48','he-configured-float','he-v2-stereo32','usac-stereo-configured','lc-pce8-44100'].includes(profile)||!fixtureMatches({capability:'audio.decode.aac',version:1,profile},d))throw Error('Invalid retained AAC extension');
  const pinned=async(file,digest)=>{if(!path.isAbsolute(file??'')||!/^[a-f0-9]{64}$/.test(digest??''))throw Error('AAC extension requires pinned native timing/packet/reference paths');const b=await readFile(file);if(createHash('sha256').update(b).digest('hex')!==digest)throw Error('AAC retained SHA256 mismatch');return b;};
  await pinned(d.input,d.inputSHA256);const probe=JSON.parse(await pinned(d.packetFile,d.packetSHA256)),reference=typed(await pinned(d.reference,d.referenceF32SHA256),Float32Array),timingReference=JSON.parse(await pinned(d.timingFile,d.timingSHA256));
  if(!Number.isSafeInteger(d.referenceSamples)||reference.length!==d.referenceSamples*d.channels)throw Error('AAC original presentation extent mismatch');
  if(![d.initialSkipSamples,d.finalDiscardSamples].every(n=>Number.isSafeInteger(n)&&n>=0)||d.aacProfile==='usac'&&d.initialSkipSamples!==(d.sampleRate===88200?2323:2220))throw Error('AAC explicit priming/final trim missing');
  const stream=probe.streams?.find(s=>s.codec_type==='audio')??probe.streams?.[0],extradata=decodeProbeHex(stream?.extradata),packets=probe.packets.filter(p=>stream.index===undefined||p.stream_index===stream.index).map(p=>({data:decodeProbeHex(p.data),pts:Math.round(Number(p.pts_time)*d.sampleRate)}));
  if(d.ascHex&&Buffer.from(extradata).toString('hex')!==d.ascHex)throw Error('AAC retained ASC differs from original packet stream');
  if(timingReference.toleranceSamples!==0)throw Error('AAC retained timing must use exact sample clock');
  await mkdir(outputDirectory,{recursive:true});return {input:d.input,fixture:{...d,extradata},packets,reference,timingReference,skipSamples:d.initialSkipSamples,discardSamples:d.finalDiscardSamples};
}
