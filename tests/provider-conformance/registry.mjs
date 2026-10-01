// SPDX-License-Identifier: Apache-2.0
import {contractKey} from './package.mjs';

// A finite test registry: capability declarations select checks, never routes.
const rows = [];
const register = (capability, profiles, suite, codec) => profiles.forEach(profile => rows.push({capability, version: 1, profile, suite, codec}));
for (const codec of ['ac3', 'eac3']) register('audio.decode.' + codec, ['48khz-fltp'], 'audio-decoder', codec);
register('audio.decode.dts', ['core-48khz-fltp'], 'audio-decoder', 'dts-core');
register('audio.decode.dts', ['ma-48khz-s32p'], 'audio-decoder', 'dts-hd');
for (const codec of ['truehd', 'mlp']) register('audio.decode.' + codec, ['48khz-integer'], 'audio-decoder', codec);
register('audio.decode.aac', ['lc-48khz-stereo'], 'audio-decoder', 'aac');
for (const codec of ['opus', 'vorbis', 'mp3', 'pcm']) register('audio.decode.' + codec, ['48khz-stereo'], 'audio-decoder', codec);
for (const codec of ['flac', 'alac']) register('audio.decode.' + codec, ['48khz-integer'], 'audio-decoder', codec);
register('audio.encode.flac', ['48khz-s24'], 'flac-encoder');
register('audio.encode.opus', ['48khz-mono-stereo'], 'opus-encoder');
register('container.read.matroska', ['finite-clear-av'], 'matroska');
register('container.mux.fmp4', ['explicit-timeline-av'], 'fmp4');
for (const codec of ['adpcm-ima-qt', 'adpcm-g726', 'adpcm-g726le']) register('audio.decode.' + codec, ['configured-integer'], 'audio-decoder', codec);
register('audio.encode.flac',['configured-s24','low-rate-s24'],'flac-encoder');
for(const codec of ['opus','vorbis','mp3','pcm']) register('audio.decode.'+codec,['configured-pcm'],'audio-decoder',codec);
for(const codec of ['flac','alac']) register('audio.decode.'+codec,['configured-integer'],'audio-decoder',codec);
register('audio.decode.pcm',['integer-8bit'],'audio-decoder','pcm');
register('audio.decode.aac',['he-stereo48','he-v2-stereo44100','usac-mono48'],'audio-decoder','aac');
register('audio.decode.aac',['lc-configured'],'audio-decoder','aac');
for(const codec of ['ape','wavpack','tta','tak','shorten','adpcm-wave','telephony','g726'])register('container.read.'+codec,['finite-clear-audio'],'container-specific');
register('container.read.g726',['explicit-raw-audio'],'container-specific');
for(const [capability,profile] of [['container.read.isobmff','finite-clear-av'],['container.read.ogg','finite-clear-audio'],['container.read.wave-aiff','finite-clear-audio'],['container.read.mpegts','finite-pes-av'],['container.read.matroska','finite-clear-webm'],['container.mux.webm','explicit-timeline-av']]) register(capability,[profile],'container-specific');
for(const [codec,profile] of [['truehd','configured-integer'],['mlp','configured-integer'],['dts-hd','ma-configured-integer'],['dts-hd','ma-high-rate-integer'],['mp1','32khz-stereo'],['mp2','lower-rate-pcm'],['wmav1','lower-rate-pcm'],['wmav2','lower-rate-pcm'],['mp2','configured-pcm'],['wmav1','configured-pcm'],['wmav2','configured-pcm'],['ape','configured-integer'],['wavpack','configured-integer'],['tta','configured-integer'],['wmapro','configured-pcm'],['wmalossless','configured-integer'],['wmavoice','speech-configured-pcm'],['tak','canonical-integer'],['shorten','canonical-integer'],['adpcm-ms','configured-integer'],['adpcm-ima-wav','configured-integer'],['pcm-alaw','configured-integer'],['pcm-mulaw','configured-integer'],['gsm','configured-integer'],['gsm-ms','configured-integer'],['speex','flv-wideband-float'],['amrnb','mode0-float'],['amrwb','mode0-float'],['amrnb','ordinary-modes-float'],['amrwb','ordinary-modes-float']]) register('audio.decode.'+(codec==='dts-hd'?'dts':codec),[profile],'retained-packet',codec);
register('audio.decode.aac',['he-configured-float','he-v2-stereo32','usac-stereo-configured','lc-pce8-44100'],'audio-decoder','aac');
register('audio.decode.speex',['ogg-mono-cbr'],'retained-packet','speex');
export const suites = Object.freeze(rows);
const index = new Map(rows.map(row => [contractKey(row), row]));
export const selectSuite = offer => index.get(contractKey(offer));
export function fixtureMatches(offer, fixture) {
  const selected = selectSuite(offer);
  if (!['audio-decoder','retained-packet'].includes(selected?.suite)) return true;
  const codec = selected.codec;
  if (!(codec === 'pcm' ? fixture.codec?.startsWith('pcm-') : fixture.codec === codec)) return false;
  if (!Number.isSafeInteger(fixture.sampleRate) || !Number.isSafeInteger(fixture.channels)) return false;
  if(codec==='speex'){
    if(offer.profile==='ogg-mono-cbr')return fixture.speexProfile==='ogg-mono-cbr'&&fixture.sourceContainer==='ogg'&&[8000,32000].includes(fixture.sampleRate)&&fixture.channels===1&&fixture.bitsPerSample===0&&fixture.frameSamples===(fixture.sampleRate===8000?160:640)&&fixture.packetClockPolicy==='original-ogg-signed-pts'&&Number.isSafeInteger(fixture.originalFirstPTS)&&fixture.originalFirstPTS<0&&fixture.originalFirstPTS>-fixture.frameSamples&&fixture.codedClockOffset===undefined&&fixture.seekContract==='restart-from-start-and-discard';
    if(fixture.speexProfile==='ogg-mono-cbr')return false;
  }
  if(codec==='aac'&&fixture.expectedRejection)return offer.profile==='lc-configured'&&fixture.aacProfile==='lc'&&fixture.sampleRate===44100&&fixture.channels===2&&fixture.bitsPerSample===0&&fixture.negativeContract==='real-lc-stereo-leading-syntax'&&fixture.expectedRejection==='PROVIDER_PROFILE_MISMATCH'&&fixture.expectedMessage==='Unqualified AAC stereo single-channel element or leading syntax'&&['isobmff','adts'].includes(fixture.sourceContainer);
  if(codec==='aac'&&['he-configured-float','he-v2-stereo32','usac-stereo-configured','lc-pce8-44100'].includes(offer.profile)){
    if(fixture.decoderProfile!==offer.profile||fixture.bitsPerSample!==0)return false;
    const asc={32000:'f94a452214c000',44100:'f948442214c000',48000:'f946432214c000',88200:'f942412214c000'};
    if(offer.profile==='he-configured-float')return fixture.aacProfile==='he'&&fixture.sampleRate===48000&&(fixture.channels===6&&fixture.ascHex==='1300058c01000108800056e598'&&fixture.layout===207||fixture.channels===2&&fixture.ascHex==='119056e598'&&fixture.layout===3);
    if(offer.profile==='he-v2-stereo32')return fixture.aacProfile==='he-v2'&&fixture.sampleRate===32000&&fixture.channels===2&&fixture.ascHex==='140006040000000056e5a8'&&fixture.layout===3;
    if(offer.profile==='lc-pce8-44100')return fixture.aacProfile==='lc'&&fixture.sampleRate===44100&&fixture.channels===8&&fixture.ascHex==='1200050c05200109440003ac042f'&&fixture.layout===20543;
    return fixture.aacProfile==='usac'&&fixture.channels===2&&fixture.layout===3&&Object.hasOwn(asc,fixture.sampleRate)&&fixture.ascHex===asc[fixture.sampleRate];
  }
  if(codec==='aac'&&fixture.decoderProfile&&fixture.decoderProfile!==offer.profile)return false;
  if(codec==='aac'&&offer.profile==='lc-48khz-stereo'&&fixture.aacProfile&&fixture.aacProfile!=='lc')return false;
  if(['amrnb','amrwb'].includes(codec)&&((offer.profile==='ordinary-modes-float')!==(fixture.modeProfile==='ordinary-modes-float')))return false;
  if(codec==='wmapro')return fixture.sampleRate===16000&&fixture.channels===1&&fixture.bitsPerSample===16||fixture.sampleRate===22050&&fixture.channels===1&&fixture.bitsPerSample===16||fixture.sampleRate===44100&&(fixture.channels===2&&fixture.bitsPerSample===24||fixture.channels===6&&[16,24].includes(fixture.bitsPerSample))||fixture.sampleRate===48000&&[2,6,8].includes(fixture.channels)&&fixture.bitsPerSample===24||fixture.sampleRate===96000&&[2,6].includes(fixture.channels)&&fixture.bitsPerSample===24;
  if(codec==='mp1'&&(fixture.sampleRate!==32000||fixture.channels!==2))return false;
  if(['mp2','wmav1','wmav2'].includes(codec)&&offer.profile==='lower-rate-pcm')return fixture.legacyProfile==='lower-rate-pcm'&&fixture.seekContract==='restart-from-start-and-discard'&&[1,2].includes(fixture.channels)&&(codec==='mp2'?fixture.sampleRate===32000:[8000,16000,22050,32000].includes(fixture.sampleRate));
  if(['mp2','wmav1','wmav2'].includes(codec)&&offer.profile==='configured-pcm'&&(![44100,48000].includes(fixture.sampleRate)||![1,2].includes(fixture.channels)))return false;
  if(codec==='dts-hd'&&offer.profile==='ma-high-rate-integer')return fixture.sampleRate===96000&&[6,8].includes(fixture.channels)&&fixture.bitsPerSample===24||fixture.sampleRate===192000&&fixture.channels===6&&fixture.bitsPerSample===16;
  if(codec==='dts-hd'&&offer.profile==='ma-configured-integer')return [44100,48000].includes(fixture.sampleRate)&&[1,2,6,8].includes(fixture.channels)||fixture.sampleRate===96000&&fixture.channels===2;
  if (offer.profile.includes('48khz') && fixture.sampleRate !== 48000) return false;
  if (offer.profile.includes('stereo') && fixture.channels !== 2) return false;
  if (['ac3', 'eac3', 'dts-core'].includes(codec) && ![1, 2, 6].includes(fixture.channels)) return false;
  if(codec==='aac'&&['he-stereo48','he-v2-stereo44100','usac-mono48'].includes(offer.profile)){const bounds={'he-stereo48':['he',48000,2],'he-v2-stereo44100':['he-v2',44100,2],'usac-mono48':['usac',48000,1]}[offer.profile];return fixture.aacProfile===bounds[0]&&fixture.sampleRate===bounds[1]&&fixture.channels===bounds[2];}
  if(codec==='pcm'&&offer.profile==='48khz-stereo'&&['pcm-u8','pcm-s8'].includes(fixture.codec))return false;
  if(offer.profile==='integer-8bit')return ['pcm-u8','pcm-s8'].includes(fixture.codec)&&fixture.bitsPerSample===8&&[44100,48000,96000].includes(fixture.sampleRate)&&[1,2].includes(fixture.channels);
  if(codec==='pcm'&&offer.profile==='configured-pcm')return ['pcm-s16le','pcm-s24le','pcm-s32le','pcm-f32le','pcm-f64le'].includes(fixture.codec)&&[44100,48000,96000].includes(fixture.sampleRate)&&[1,2].includes(fixture.channels);
  if(codec==='aac'&&offer.profile==='lc-configured')return [44100,48000].includes(fixture.sampleRate)&&[1,2].includes(fixture.channels)&&(!fixture.aacProfile||fixture.aacProfile==='lc');
  if(['flac','alac'].includes(codec)&&offer.profile==='configured-integer')return [44100,48000,96000].includes(fixture.sampleRate)&&[1,2,6,8].includes(fixture.channels);
  if(['opus','vorbis','mp3'].includes(codec)&&offer.profile==='configured-pcm')return [1,2].includes(fixture.channels)&&(codec==='opus'?fixture.sampleRate===48000:[44100,48000].includes(fixture.sampleRate));
  if (codec === 'adpcm-ima-qt') return [44100,48000].includes(fixture.sampleRate) && [1,2].includes(fixture.channels) && fixture.bitsPerSample === 4 && fixture.packetFraming === 'one-original-complete-MOV-IMA-QT-block' && fixture.samplesPerBlock === 64 && fixture.sourceContainer === 'isobmff' && fixture.framing?.blockAlign === 34*fixture.channels && fixture.seekContract === 'restart-from-start-and-discard';
  if (['adpcm-g726','adpcm-g726le'].includes(codec)) return fixture.sampleRate === 8000 && fixture.channels === 1 && [2,3,4,5].includes(fixture.bitsPerSample) && fixture.bitRate === fixture.bitsPerSample*8000 && fixture.bitOrder === (codec==='adpcm-g726'?'most-significant-first':'least-significant-first') && fixture.originPackingQualified === true && fixture.packetFraming === 'complete-byte-and-code-groups' && fixture.seekContract === 'restart-from-start-and-discard' && fixture.timestampOrigin === 'source-sample-clock';
  return true;
}
