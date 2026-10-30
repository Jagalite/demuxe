// SPDX-License-Identifier: Apache-2.0
import {createBoundedReader} from './bounded-reader.js';
import {copySelectedPackets} from './packet-copy.js';
import {preparedTracks} from './track-metadata.js';

function canonical(value) {
  if (ArrayBuffer.isView(value)) return Array.from(new Uint8Array(value.buffer, value.byteOffset, value.byteLength));
  if (value instanceof ArrayBuffer) return Array.from(new Uint8Array(value));
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
  return value;
}

async function videoFacts(track) {
  if(track.type==='audio')return JSON.stringify(canonical(await Promise.all([track.getDecoderConfig(),track.getSampleRate(),track.getNumberOfChannels(),track.getName(),track.getLanguageCode()])));
  return JSON.stringify(canonical(await Promise.all([
    track.getDecoderConfig(), track.getCodedWidth(), track.getCodedHeight(),
    track.getSquarePixelWidth(), track.getSquarePixelHeight(),
    track.getTransformationMatrix(), track.getName(), track.getLanguageCode(),
  ])));
}

/** Initial finite preparation profile. Source tracks must come from the existing
 * complete inspection owner, never MediaBunny's partial A/V-only inspection. */
export function createVideoPreparer({load, codec, sourceCodec = codec, formats, outputFormat, inspectProfile, inspectTracks, audio = false, audioOnly = false, profileName}) {
  if (typeof load !== 'function') throw new TypeError('A configured runtime loader is required');
  return async function prepare(file, {signal, sourceTracks} = {}) {
    if (!(file instanceof Blob)&&!(file?.kind==='bytes'&&Number.isSafeInteger(file.size)&&file.size>0&&typeof file.read==='function'))return;
    if (file.size > 32 * 1024 * 1024 || !Array.isArray(sourceTracks)) return;
    const video=sourceTracks.filter(track=>track.type==='video'),sound=sourceTracks.filter(track=>track.type==='audio');
    if(video.length>1||(!video.length&&(!audioOnly||sound.length!==1))||video.some(track=>track.codec!==sourceCodec||track.attachedPicture)||sourceTracks.length!==video.length+sound.length||new Set(sourceTracks.map(track=>JSON.stringify([track.type,track.id]))).size!==sourceTracks.length||sound.length>1||(!audio&&sound.length)||sound.some(track=>track.codec!=='aac'||track.sampleRate!==48000||![1,2].includes(track.channels)))return;
    signal?.throwIfAborted();
    const reader = createBoundedReader({id: codec + '-local', size: file.size, read: (at,n) => file instanceof Blob ? file.slice(at,at+n).arrayBuffer().then(buffer=>new Uint8Array(buffer)) : file.read(at,n)}, {signal, maxBytes: 32 * 1024 * 1024, maxReads: 4096, timeoutMs: 30000});
    let input, verificationInput, verificationReader, inputDisposed=false, verificationDisposed=false;
    let primaryFailed=false, cleanupFailed=false, cleanupError;
    const rememberCleanup=error=>{if(!cleanupFailed){cleanupFailed=true;cleanupError=error;}};
    const dispose = () => {
      if(input&&!inputDisposed){inputDisposed=true;try{input.dispose();}catch(error){rememberCleanup(error);}}
      if(verificationInput&&!verificationDisposed){verificationDisposed=true;try{verificationInput.dispose();}catch(error){rememberCleanup(error);}}
    };
    reader.signal.addEventListener('abort', dispose, {once: true});
    try {
      const runtime = await reader.run(load);
      input = new runtime.Input({formats: formats(runtime), source: new runtime.CustomSource({getSize: () => reader.size, read: (start, end) => reader.read(start, end - start), prefetchProfile: 'none', maxCacheSize: 1024 * 1024})});
      if (!await reader.run(() => input.canRead())) return;
      const format = await reader.run(() => input.getFormat());
      const sourceFormat = format.name.toLowerCase();
      const profile = profileName(sourceFormat, !!sound.length, !!video.length);
      if (!profile) return;
      const tracks = await reader.run(() => input.getTracks());
      if(tracks.length!==sourceTracks.length||tracks.filter(track=>track.type==='video'&&track.codec===codec).length!==video.length||tracks.filter(track=>track.type==='audio'&&track.codec==='aac').length!==sound.length)return;
      const picture=tracks.find(track=>track.type==='video');
      if(picture){
      const first = await reader.run(() => picture.getFirstTimestamp());
      const rotation = await reader.run(() => picture.getRotation());
      const flip = await reader.run(() => picture.getFlip());
      const transparent = await reader.run(() => picture.canBeTransparent());
      if (first !== 0 || rotation !== 0 || flip || transparent) return;
      }
      const authoredTracks=await reader.run(()=>inspectTracks?inspectTracks(reader):inspectProfile(reader).then(packets=>[{id:picture.id,type:'video',packets}]));
      const states=new Map();
      for(const track of tracks){
        const authored=authoredTracks.find(candidate=>String(candidate.id)===String(track.id));
        if(!authored||authored.type!==track.type)return;
        if(track.type==='audio'){
          const config=await reader.run(()=>track.getDecoderConfig());
          if(!config||config.codec!=='mp4a.40.2'||config.sampleRate!==48000||![1,2].includes(config.numberOfChannels)||await reader.run(()=>track.getFirstTimestamp())!==0)return;
          const description=config.description?new Uint8Array(config.description.buffer??config.description,config.description.byteOffset??0,config.description.byteLength):undefined;
          if(!description||description.length!==2||(description[0]>>3)!==2||(((description[0]&7)<<1)|(description[1]>>7))!==3||((description[1]>>3)&15)!==config.numberOfChannels||(description[1]&7))return;
          const declared=sound[0];if(config.sampleRate!==declared.sampleRate||config.numberOfChannels!==declared.channels)return;
        }
        states.set(track.id,{track,authored:authored.packets,facts:await reader.run(()=>videoFacts(track)),last:-Infinity,timeline:[]});
      }
      if(authoredTracks.length!==states.size)return;
      const validatePacket = (packet,track) => {
        const state=states.get(track.id),original=state.authored[state.timeline.length];
        if (!original || original.timestamp !== packet.timestamp || original.type !== packet.type || original.size !== packet.data.byteLength || (original.duration !== undefined && original.duration !== packet.duration)) throw Object.assign(new Error('Parser normalized authored packet timing'), {code: 'PROVIDER_PROFILE_MISMATCH'});
        if (!Number.isFinite(packet.timestamp) || packet.timestamp < 0 || packet.timestamp < state.last || !Number.isFinite(packet.duration) || packet.duration < 0 || packet.sideData.alpha || packet.sideData.alphaByteLength) throw Object.assign(new Error('Unsupported prepared-file timeline or alpha profile'), {code: 'PROVIDER_PROFILE_MISMATCH'});
        state.last = packet.timestamp;
        state.timeline.push([packet.timestamp, packet.duration, packet.type, packet.data.byteLength]);
      };
      const result = await reader.run(() => copySelectedPackets(runtime, input, {trackIds: tracks.map(track=>track.id), format: outputFormat(runtime), signal: reader.signal, validatePacket}));
      if([...states.values()].some(state=>state.timeline.length!==state.authored.length))throw Object.assign(new Error('Parser omitted authored packets'),{code:'PROVIDER_PROFILE_MISMATCH'});
      // Muxer success does not establish timeline preservation. Container output can
      // quantize block timing or infer a different duration; compare the parsed
      // result before handing any complete file to the presentation owner.
      verificationReader = createBoundedReader({id: codec + '-output', size: result.file.size, read: async (at, n) => new Uint8Array(await result.file.slice(at, at + n).arrayBuffer())}, {signal: reader.signal, maxBytes: 32 * 1024 * 1024, maxReads: 4096, timeoutMs: 30000});
      verificationInput = new runtime.Input({formats: formats(runtime, true), source: new runtime.CustomSource({getSize: () => verificationReader.size, read: (start, end) => verificationReader.read(start, end - start), prefetchProfile: 'none', maxCacheSize: 1024 * 1024})});
      await reader.run(async () => {
        const mismatch = () => { throw Object.assign(new Error('Prepared-file track configuration or packet timeline changed'), {code: 'PROVIDER_PROFILE_MISMATCH'}); };
        const outputTracks=await verificationInput.getTracks();
        if(outputTracks.length!==tracks.length)mismatch();
        const outputEnvelopes=await (inspectTracks?inspectTracks(verificationReader):inspectProfile(verificationReader).then(packets=>[{id:outputTracks[0].id,type:'video',packets}]));
        if(outputEnvelopes.length!==tracks.length)mismatch();
        for(const state of states.values()){
          const track=outputTracks.find(track=>track.type===state.track.type);
          if(!track||track.codec!==state.track.codec||state.facts!==await videoFacts(track))mismatch();
          const envelope=outputEnvelopes.find(candidate=>String(candidate.id)===String(track.id));
          if(!envelope||envelope.type!==track.type||envelope.packets.length!==state.timeline.length)mismatch();
          for(let i=0;i<state.timeline.length;i++){
            const packet=envelope.packets[i],expected=state.timeline[i];
            if(packet.timestamp!==expected[0]||(packet.duration!==undefined&&packet.duration!==expected[1])||packet.type!==expected[2]||packet.size!==expected[3])mismatch();
          }
          let index=0;
          for await(const packet of new runtime.EncodedPacketSink(track).packets(undefined,undefined,{metadataOnly:true})){
            reader.check();verificationReader.check();
            const expected=state.timeline[index++];
            if(!expected||expected[0]!==packet.timestamp||expected[1]!==packet.duration||expected[2]!==packet.type||expected[3]!==packet.byteLength)mismatch();
          }
          if(index!==state.timeline.length)mismatch();
        }
        verificationReader.check();
      });
      return {file: result.file, tracks: preparedTracks(sourceTracks), diagnostics: {kind: 'mediabunny-packet-copy', profile, sourceBytes: file.size, outputBytes: result.outputBytes, packetCount: result.packetCount, bytesRead: reader.bytesRead}};
    } catch (error) {
      try {
        if (reader.hasFailure) throw reader.failure;
        reader.check();
        if (error?.code === 'PROVIDER_PROFILE_MISMATCH') return;
        throw error;
      } catch (primary) { primaryFailed=true; throw primary; }
    } finally {
      reader.signal.removeEventListener('abort', dispose);
      dispose();
      try { await verificationReader?.close(); } catch(error) { rememberCleanup(error); }
      try { await reader.close(); } catch(error) { rememberCleanup(error); }
      if(!primaryFailed&&cleanupFailed)throw cleanupError;
    }
  };
}
