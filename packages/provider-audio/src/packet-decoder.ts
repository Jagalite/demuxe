// SPDX-License-Identifier: Apache-2.0
import {aacProfileNumber,validateExtendedAacConfiguration,validateHeV2Adts} from './aac-config.js';
import type {AacProfile} from './aac-config.js';
export type {AacProfile} from './aac-config.js';
/** One synchronous codec owner. The asset loader supplies an already verified
 * instance; fine and bundled builds implement the same ABI and ownership rules. */
export interface AudioDecoderModule {
  HEAPU8: Uint8Array;
  HEAPF32: Float32Array;
  HEAP32: Int32Array;
  _malloc(n: number): number;
  _free(p: number): void;
  _mc_create(kind: number): number;
  _mc_create_config?(kind: number, rate: number, channels: number, bits: number, extra: number, size: number): number;
  _mc_create_config_v2?(kind: number, rate: number, channels: number, bits: number, extra: number, size: number, blockAlign: number, bitRate: number): number;
  _mc_configure(owner: number, rate: number): number;
  _mc_decode(owner: number, p: number, n: number, pts: number): number;
  _mc_frame(owner: number): number;
  _mc_info(owner: number, field: number): number;
  _mc_plane(owner: number, channel: number): number;
  _mc_flush(owner: number): number;
  _mc_reset(owner: number, recreate: number): number;
  _mc_destroy(owner: number): void;
}
export type AudioFrame = Readonly<{
  generation: number; pts: number; duration: number; rate: number;
  channels: number; layout: number; samples: number;
  /** Advanced WMA may lack native timestamps. Packet-clock values are anchored
   * to the first submitted real packet PTS and continued by decoded samples;
   * they do not qualify composition or seeking on an original media timeline. */
  timestampOrigin?: 'native' | 'packet-clock' | 'stream-clock';
  /** Owned copy. No view into growable Wasm memory escapes this adapter. */
  planes: readonly Float32Array[];
  /** Original double precision samples, retained for exact output validation. */
  planes64?: readonly Float64Array[];
  /** Lossless integer PCM, interleaved and left justified. Present only for
   * integer decoder families; samples never pass through float quantization. */
  pcm?: Int32Array;
}>;
export type PacketAudioCodec = 'ac3' | 'eac3' | 'dts-core' | 'truehd' | 'mlp' | 'dts-hd' | 'aac' | 'opus' | 'vorbis' | 'flac' | 'alac' | 'mp3' | 'pcm-s16le' | 'pcm-s24le' | 'pcm-s32le' | 'pcm-f32le' | 'pcm-f64le' | 'mp1' | 'mp2' | 'wmav1' | 'wmav2' | 'ape' | 'wavpack' | 'tta' | 'wmapro' | 'wmalossless' | 'wmavoice' | 'tak' | 'shorten' | 'adpcm-ms' | 'adpcm-ima-wav' | 'pcm-alaw' | 'pcm-mulaw' | 'gsm' | 'gsm-ms' | 'speex' | 'amrnb' | 'amrwb' | 'pcm-u8' | 'pcm-s8' | 'adpcm-ima-qt' | 'adpcm-g726' | 'adpcm-g726le';
export interface AudioDecoderConfiguration { sampleRate: number; channels: number; bitsPerSample?: number; extradata?: Uint8Array; blockAlign?: number; bitRate?: number; aacProfile?: AacProfile; }
const integerCodecs = new Set<PacketAudioCodec>(['truehd', 'mlp', 'dts-hd', 'flac', 'alac', 'pcm-s16le', 'pcm-s24le', 'pcm-s32le','ape','wavpack','tta','tak','shorten','wmalossless','adpcm-ms','adpcm-ima-wav','pcm-alaw','pcm-mulaw','gsm','gsm-ms','pcm-u8','pcm-s8','adpcm-ima-qt','adpcm-g726','adpcm-g726le']);

// Emscripten uses errno 6 for EAGAIN; this is the Wasm ABI, not host errno.
const AGAIN = -6, EOF = -541478725, MAX_PACKET = 1048576;
export interface AudioPacketDecoder {
 decode(packet: Uint8Array, pts: number): readonly AudioFrame[];
 flush(): readonly AudioFrame[];
 reset(): void;
 dispose(): void;
}
export class PacketAudioDecoder implements AudioPacketDecoder {
  private readonly configuration?: Pick<AudioDecoderConfiguration, 'sampleRate' | 'channels' | 'bitsPerSample' | 'aacProfile'>;
  private readonly aacAdts:boolean=false;
  private readonly adpcm?:Readonly<{align:number;samples:number}>;
  private owner = 0;
  private packet = 0;
  private ended = false;
  private generation = 0;
  private busy = false;
  constructor(private readonly module: AudioDecoderModule, private readonly codec: PacketAudioCodec,
    private readonly signal: AbortSignal, configuration?: AudioDecoderConfiguration) {
    signal.throwIfAborted();
    const kind = {ac3: 0, eac3: 1, 'dts-core': 2, truehd: 3, mlp: 4, 'dts-hd': 5, aac: 6, opus: 7, vorbis: 8, flac: 9, alac: 10, mp3: 11, 'pcm-s16le': 12, 'pcm-s24le': 13, 'pcm-s32le': 14, 'pcm-f32le': 15, 'pcm-f64le': 16,mp1:17,mp2:18,wmav1:19,wmav2:20,ape:21,wavpack:22,tta:23,wmapro:24,wmalossless:25,wmavoice:26,tak:27,shorten:28,'adpcm-ms':29,'adpcm-ima-wav':30,'pcm-alaw':31,'pcm-mulaw':32,gsm:33,'gsm-ms':34,speex:35,amrnb:36,amrwb:37,'pcm-u8':38,'pcm-s8':39,'adpcm-ima-qt':40,'adpcm-g726':41,'adpcm-g726le':42}[codec];
    if (kind === undefined) throw Error('Unsupported decoder capability');
    if (configuration) {
      const {sampleRate, channels, bitsPerSample = 0, extradata = new Uint8Array(),blockAlign=0,bitRate=0} = configuration;
      if(configuration.aacProfile!==undefined&&codec!=='aac')throw Object.assign(Error('AAC profile requires AAC codec'),{code:'PROVIDER_PROFILE_MISMATCH'});
      if(codec==='aac'){
        const profile=configuration.aacProfile??'lc';aacProfileNumber(profile);
        if(profile!=='lc'){
          if(bitsPerSample||blockAlign||bitRate)throw Object.assign(Error('Unqualified explicit AAC framing configuration'),{code:'PROVIDER_PROFILE_MISMATCH'});
          validateExtendedAacConfiguration(profile,sampleRate,channels,extradata,true);
          this.aacAdts=!extradata.length;
        }
      }
      if((codec==='pcm-u8'||codec==='pcm-s8')&&(![44100,48000,96000].includes(sampleRate)||![1,2].includes(channels)||bitsPerSample!==8||extradata.length||blockAlign||bitRate))throw Object.assign(Error('Unqualified PCM8 source precision/rate/layout'),{code:'PROVIDER_PROFILE_MISMATCH'});
      if(['speex','amrnb','amrwb'].includes(codec)&&(sampleRate!==(codec==='amrnb'?8000:16000)||channels!==1||bitsPerSample!==0||extradata.length||blockAlign||bitRate))throw Object.assign(Error('Unqualified initial speech metadata/profile'),{code:'PROVIDER_PROFILE_MISMATCH'});
      if(['pcm-alaw','pcm-mulaw','gsm','gsm-ms'].includes(codec)){
        const reject=():never=>{throw Object.assign(Error('Unqualified telephony source framing/metadata'),{code:'PROVIDER_PROFILE_MISMATCH'});};
        if(codec==='pcm-alaw'||codec==='pcm-mulaw'){
          if(![8000,16000].includes(sampleRate)||![1,2].includes(channels)||bitsPerSample!==8||extradata.length||blockAlign!==channels||bitRate!==sampleRate*channels*8)reject();
        }else{
          if(sampleRate!==8000||channels!==1||bitsPerSample!==0||blockAlign!==(codec==='gsm'?33:65)||bitRate!==(codec==='gsm'?13200:13000))reject();
          if(codec==='gsm'?extradata.length!==0:(extradata.length!==2||extradata[0]!==64||extradata[1]!==1))reject();
        }
        if(!module._mc_create_config_v2)throw Error('Telephony packet framing ABI unavailable');
      }
      if(codec==='adpcm-g726'||codec==='adpcm-g726le'){if(sampleRate!==8000||channels!==1||![2,3,4,5].includes(bitsPerSample)||extradata.length||blockAlign||bitRate!==8000*bitsPerSample)throw Object.assign(Error('Unqualified G726 source width/rate/layout/framing'),{code:'PROVIDER_PROFILE_MISMATCH'});if(!module._mc_create_config_v2)throw Error('G726 explicit framing ABI unavailable');}
      if(codec==='adpcm-ima-qt'&&(![44100,48000].includes(sampleRate)||![1,2].includes(channels)||bitsPerSample!==4||extradata.length||blockAlign!==34*channels||bitRate))throw Object.assign(Error('Unqualified MOV IMA-QT configuration'),{code:'PROVIDER_PROFILE_MISMATCH'});
      if(codec==='adpcm-ms'||codec==='adpcm-ima-wav'){
        const reject=():never=>{throw Object.assign(Error('Unqualified WAV ADPCM configuration'),{code:'PROVIDER_PROFILE_MISMATCH'});};
        if(![8000,16000,22050,32000,44100,48000].includes(sampleRate)||![1,2].includes(channels)||bitsPerSample!==4||!Number.isInteger(blockAlign)||blockAlign<8*channels||blockAlign>65536||!Number.isInteger(bitRate)||bitRate<1||bitRate>10000000)reject();
        if(extradata.length!==(codec==='adpcm-ms'?32:2))reject();const h=new DataView(extradata.buffer,extradata.byteOffset,extradata.length),samples=h.getUint16(0,true);
        if(codec==='adpcm-ms'){
          const coefficients=[256,0,512,-256,0,0,192,64,240,0,460,-208,392,-232];
          if(samples!==2+(blockAlign-7*channels)*2/channels||h.getUint16(2,true)!==7)reject();
          for(let i=0;i<14;i++)if(h.getInt16(4+2*i,true)!==coefficients[i])reject();
        }else if((blockAlign-4*channels)%(4*channels)!==0||samples!==1+(blockAlign-4*channels)*2/channels)reject();
        if(!module._mc_create_config_v2)throw Error('WAV ADPCM packet framing ABI unavailable');
        this.adpcm={align:blockAlign,samples};
      }
      if(codec==='ape'&&(![44100,48000,96000].includes(sampleRate)||![1,2].includes(channels)||![16,24].includes(bitsPerSample)||extradata.length!==6||(extradata[0]|(extradata[1]<<8))<3930||(extradata[0]|(extradata[1]<<8))>3990))throw Error('Unqualified APE configuration');
      if(codec==='wavpack'&&(![44100,48000,96000].includes(sampleRate)||![1,2,6,8].includes(channels)||![16,24,32].includes(bitsPerSample)))throw Error('Unqualified integer WavPack configuration');
      if(codec==='shorten'&&(sampleRate!==44100||channels!==2||bitsPerSample!==16||extradata.length||blockAlign||bitRate))throw Object.assign(Error('Unqualified Shorten version2 RIFF44100stereo16 profile'),{code:'PROVIDER_PROFILE_MISMATCH'});
      if(codec==='tak'){
        const reject=():never=>{throw Object.assign(Error('Unqualified TAK codec2/profile2 44100mono16 header'),{code:'PROVIDER_PROFILE_MISMATCH'});};
        if(sampleRate!==44100||channels!==1||bitsPerSample!==16||extradata.length!==10||blockAlign||bitRate)reject();
        let position=0;const get=(count:number):number=>{let value=0;for(let bit=0;bit<count;bit++){const offset=position++;value+=((extradata[offset>>>3]>>>(offset&7))&1)*2**bit;}return value;};
        if(get(6)!==2||get(4)!==2||get(4)!==1||!get(35)||get(3)!==0||get(18)+6000!==sampleRate||get(5)+8!==bitsPerSample||get(4)+1!==channels||get(1)!==0)reject();
      }
      if(codec==='tta'){
        const reject=():never=>{throw Object.assign(Error('Unqualified integer TTA1 header/configuration'),{code:'PROVIDER_PROFILE_MISMATCH'});};
        if(extradata.length!==22||![44100,48000].includes(sampleRate)||![1,2,6].includes(channels)||![16,24].includes(bitsPerSample))reject();
        const h=new DataView(extradata.buffer,extradata.byteOffset,extradata.length);let crc=0xffffffff;
        for(const byte of extradata.subarray(0,18)){crc^=byte;for(let bit=0;bit<8;bit++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}
        if(h.getUint32(0,false)!==0x54544131||h.getUint16(4,true)!==1||h.getUint16(6,true)!==channels||h.getUint16(8,true)!==bitsPerSample||h.getUint32(10,true)!==sampleRate||!h.getUint32(14,true)||((crc^0xffffffff)>>>0)!==h.getUint32(18,true))reject();
      }
      const legacyWma=codec==='wmav1'||codec==='wmav2';
      const advancedWma=codec==='wmapro'||codec==='wmalossless'||codec==='wmavoice';
      const wma=legacyWma||advancedWma;
      if(!Number.isInteger(blockAlign)||blockAlign<0||blockAlign>65536||!Number.isInteger(bitRate)||bitRate<0||bitRate>10000000)throw Error('Invalid packet framing configuration');
      if(legacyWma&&(![44100,48000].includes(sampleRate)||![1,2].includes(channels)||!blockAlign||!bitRate||extradata.length!==(codec==='wmav1'?4:10)))throw Error('Unqualified WMA configuration');
      if(advancedWma){
        const reject=():never=>{throw Object.assign(Error('Unqualified advanced WMA configuration'),{code:'PROVIDER_PROFILE_MISMATCH'});};
        if(!blockAlign||!bitRate)reject();
        if(codec==='wmavoice'){if(![8000,16000].includes(sampleRate)||channels!==1||bitsPerSample!==16||extradata.length!==46)reject();}
        else {
          if(extradata.length!==18)reject();
          const admitted=codec==='wmalossless'?sampleRate===44100&&channels===2&&bitsPerSample===16:(sampleRate===44100&&channels===6&&bitsPerSample===16)||(sampleRate===48000&&[2,6,8].includes(channels)&&bitsPerSample===24)||(sampleRate===96000&&channels===2&&bitsPerSample===24);
          if(!admitted)reject();
          const h=new DataView(extradata.buffer,extradata.byteOffset,extradata.length),masks:Record<number,number>={1:4,2:3,6:63,8:1599};
          if(h.getUint16(0,true)!==bitsPerSample||h.getUint32(2,true)!==masks[channels])reject();
        }
      }
      if(wma&&!module._mc_create_config_v2)throw Error('WMA packet framing ABI unavailable');
      if (!Number.isInteger(sampleRate) || sampleRate < 8000 || sampleRate > 192000 || !Number.isInteger(channels) || channels < 1 || channels > 8 || !Number.isInteger(bitsPerSample) || bitsPerSample < 0 || bitsPerSample > 64 || extradata.length > 65536) throw Error('Invalid decoder configuration');
      this.configuration = {sampleRate, channels,bitsPerSample,...(codec==='aac'?{aacProfile:configuration.aacProfile??'lc'}:{})};
      const headerOwned=codec==='truehd'||codec==='mlp'||codec==='dts-hd';
      const oldHeaderABI=!module._mc_create_config&&headerOwned&&typeof module._mc_configure==='function';
      if(oldHeaderABI&&(![44100,48000,96000].includes(sampleRate)||![1,2,6,8].includes(channels)||(codec==='mlp'&&channels===8)||![16,24].includes(bitsPerSample)||extradata.length||blockAlign||bitRate))throw Object.assign(Error('Unqualified legacy header-owned configuration'),{code:'PROVIDER_PROFILE_MISMATCH'});
      if(!module._mc_create_config&&!oldHeaderABI)throw Error('Decoder configuration ABI unavailable');
      const p = extradata.length ? module._malloc(extradata.length) : 0;
      if (extradata.length && !p) throw Error('Extradata allocation failed');
      try { if (p) module.HEAPU8.set(extradata, p); this.owner = oldHeaderABI?module._mc_create(kind):module._mc_create_config_v2?.(kind,sampleRate,channels,bitsPerSample,p,extradata.length,blockAlign,bitRate)??module._mc_create_config!(kind, sampleRate, channels, bitsPerSample, p, extradata.length); }
      finally { if (p) module._free(p); }
    } else {
      if (kind >= 6) throw Error('Decoder configuration required');
      this.owner = module._mc_create(kind);
    }
    if (!this.owner) throw Error('Decoder initialization failed');
    try {
      this.check(module._mc_configure(this.owner, configuration?.sampleRate ?? 48000));
      this.packet = module._malloc(MAX_PACKET);
      if (!this.packet) throw Error('Packet allocation failed');
      signal.addEventListener('abort', this.abort, {once: true});
    } catch (error) { this.dispose(); throw error; }
  }
  private readonly abort = () => this.dispose();
  private check(code: number): void { if (code < 0) throw Error(`Audio codec failed (${code})`); }
  private enter(): void {
    this.signal.throwIfAborted();
    if (!this.owner || this.busy) throw Error('Decoder is disposed or reentered');
    this.busy = true;
  }
  private receive(): AudioFrame[] {
    const out: AudioFrame[] = [], m = this.module;
    const advancedWma=['wmapro','wmalossless','wmavoice'].includes(this.codec),shorten=this.codec==='shorten';let scalarSamples=0;
    for (let count = 0; count < (advancedWma?256:64); count++) {
      const code = m._mc_frame(this.owner);
      if (code === AGAIN || code === EOF) return out;
      this.check(code);
      const [samples, rate, channels, format, pts, duration, layout] = Array.from({length: 7}, (_, i) => m._mc_info(this.owner, i));
      const integer = integerCodecs.has(this.codec);
      const headerOwned=this.codec==='truehd'||this.codec==='mlp'||this.codec==='dts-hd';
      if((headerOwned||this.codec==='tak'||shorten)&&this.configuration?.bitsPerSample&&m._mc_info(this.owner,9)!==this.configuration.bitsPerSample)throw Object.assign(Error('Lossless source precision differs from configuration'),{code:'PROVIDER_PROFILE_MISMATCH'});
      if(headerOwned){const masks:Record<number,readonly number[]>={1:[4],2:[3],6:[63,1551],8:[1599]};if(!masks[channels]?.includes(layout)||(this.codec==='mlp'&&channels===8))throw Object.assign(Error('Unqualified lossless channel layout'),{code:'PROVIDER_PROFILE_MISMATCH'});}

      if(['speex','amrnb','amrwb'].includes(this.codec)&&(layout!==4||format!==(this.codec==='speex'?3:8)||(this.codec==='speex'?![320,640].includes(samples):samples!==(this.codec==='amrnb'?160:320))||!Number.isSafeInteger(pts+samples)))throw Object.assign(Error('Unqualified initial speech decoded profile/clock'),{code:'PROVIDER_PROFILE_MISMATCH'});
      if(shorten&&(samples>256||format!==6||layout!==3||m._mc_info(this.owner,11)!==2))throw Object.assign(Error('Unqualified Shorten decoded block/clock'),{code:'PROVIDER_PROFILE_MISMATCH'});
      if(['pcm-alaw','pcm-mulaw','gsm','gsm-ms'].includes(this.codec)&&!Number.isSafeInteger(pts+samples))throw Object.assign(Error('Unqualified telephony decoded end clock'),{code:'PROVIDER_PROFILE_MISMATCH'});
      if((this.codec==='adpcm-g726'||this.codec==='adpcm-g726le')&&(format!==1||layout!==4||pts<0||!Number.isSafeInteger(pts+samples)))throw Object.assign(Error('Unqualified G726 decoded precision/layout/clock'),{code:'PROVIDER_PROFILE_MISMATCH'});
      if(this.codec==='adpcm-ima-qt'&&(samples!==64||format!==6||layout!==(channels===1?4:3)||pts<0||!Number.isSafeInteger(pts+samples)))throw Object.assign(Error('Unqualified MOV IMA-QT decoded block/clock'),{code:'PROVIDER_PROFILE_MISMATCH'});
      if(this.adpcm&&(pts<0||!Number.isSafeInteger(pts+samples)))throw Object.assign(Error('Unqualified WAV ADPCM decoded sample clock'),{code:'PROVIDER_PROFILE_MISMATCH'});
      if(['pcm-alaw','pcm-mulaw','gsm','gsm-ms'].includes(this.codec)&&(format!==1||layout!==(channels===1?4:3)||(this.codec==='gsm'?samples!==160:this.codec==='gsm-ms'?samples!==320:samples*channels>4096)))throw Object.assign(Error('Unqualified telephony decoded precision/layout/block'),{code:'PROVIDER_PROFILE_MISMATCH'});
      if(this.adpcm&&(samples!==this.adpcm.samples||![1,6].includes(format)||layout!==(channels===1?4:3)))throw Object.assign(Error('Unqualified WAV ADPCM decoded block/precision/layout'),{code:'PROVIDER_PROFILE_MISMATCH'});
      if(this.codec==='tak'&&(format!==6||layout!==4))throw Object.assign(Error('Unqualified TAK decoded precision/layout'),{code:'PROVIDER_PROFILE_MISMATCH'});
      if(this.codec==='wmapro'||this.codec==='wmalossless'||this.codec==='wmavoice'){
        const masks:Record<number,number>={1:4,2:3,6:63,8:1599};
        if(layout!==masks[channels]||(this.codec==='wmalossless'&&!(this.configuration?.bitsPerSample===16?format===6:this.configuration?.bitsPerSample===24&&format===7&&m._mc_info(this.owner,9)===24)))throw Object.assign(Error('Unqualified advanced WMA decoded layout/precision'),{code:'PROVIDER_PROFILE_MISMATCH'});
      }
      if (this.codec === 'aac' && m._mc_info(this.owner, 10) !== aacProfileNumber(this.configuration?.aacProfile??'lc')) throw Object.assign(Error('Decoded AAC profile differs from admitted profile'), {code: 'PROVIDER_PROFILE_MISMATCH'});
      const pcm8=this.codec==='pcm-u8'||this.codec==='pcm-s8';
      if(pcm8&&(format!==0||layout!==(channels===1?4:3)))throw Object.assign(Error('Unqualified PCM8 decoded precision/layout'),{code:'PROVIDER_PROFILE_MISMATCH'});
      if ((!integer && ![3, 4, 8, 9].includes(format)) || (integer && !(pcm8?[0]:[1, 2, 6, 7]).includes(format))
        || (this.codec === 'dts-hd' && ![6, 7].includes(format))
        || rate !== (this.configuration?.sampleRate ?? 48000) || !(this.configuration ? [this.configuration.channels] : integer ? [1, 2, 6, 8] : [1, 2, 6]).includes(channels)
        || !Number.isSafeInteger(samples) || samples < 1 || samples > 65536
        || !Number.isSafeInteger(pts) || !Number.isSafeInteger(duration) || duration < 0
        || !Number.isSafeInteger(layout) || layout <= 0) throw Object.assign(Error('Unqualified decoded frame'),{code:'PROVIDER_PROFILE_MISMATCH'});
      scalarSamples+=samples*channels;if(advancedWma&&scalarSamples>1048576)throw Error('Decoder exceeded bounded WMA output budget');if(shorten&&scalarSamples>1048576)throw Error('Decoder exceeded bounded Shorten output budget');
      let pcm: Int32Array | undefined;
      if (integer) {
        pcm = new Int32Array(samples * channels);
        const packed = format === 0 || format === 1 || format === 2, width = format === 0 ? 1 : format === 1 || format === 6 ? 2 : 4;
        for (let c = 0; c < channels; c++) {
          const p = m._mc_plane(this.owner, packed ? 0 : c);
          const length = samples * width * (packed ? channels : 1);
          if (!Number.isSafeInteger(p) || p <= 0 || p % width || p + length > m.HEAPU8.byteLength) throw Error('Invalid integer PCM bounds');
          const view = new DataView(m.HEAPU8.buffer, m.HEAPU8.byteOffset + p, length);
          for (let i = 0; i < samples; i++) {
            const offset = (packed ? i * channels + c : i) * width;
            pcm[i * channels + c] = width === 1 ? (view.getUint8(offset)-128)*16777216 : width === 2 ? view.getInt16(offset, true) * 65536 : view.getInt32(offset, true);
          }
        }
      }
      const planes = integer ? [] : Array.from({length: channels}, (_, c) => {
        const packed = format === 3 || format === 4, width = format === 4 || format === 9 ? 8 : 4;
        const p = m._mc_plane(this.owner, packed ? 0 : c), length = samples * width * (packed ? channels : 1);
        if (!Number.isSafeInteger(p) || p <= 0 || p % width || p + length > m.HEAPU8.byteLength) throw Error('Invalid PCM plane');
        const view = new DataView(m.HEAPU8.buffer, m.HEAPU8.byteOffset + p, length), plane = new Float32Array(samples);
        for (let i = 0; i < samples; i++) { const offset = (packed ? i * channels + c : i) * width; plane[i] = width === 8 ? view.getFloat64(offset, true) : view.getFloat32(offset, true); }
        return plane;
      });
      if(['speex','amrnb','amrwb'].includes(this.codec)&&planes.some(plane=>plane.some(value=>!Number.isFinite(value))))throw Object.assign(Error('Nonfinite decoded speech PCM'),{code:'PROVIDER_PROFILE_MISMATCH'});
      const planes64 = format === 4 || format === 9 ? Array.from({length: channels}, (_, c) => {
        const packed = format === 4, p = m._mc_plane(this.owner, packed ? 0 : c), length = samples * 8 * (packed ? channels : 1);
        if (!Number.isSafeInteger(p) || p <= 0 || p % 8 || p + length > m.HEAPU8.byteLength) throw Error('Invalid double PCM plane');
        const view = new DataView(m.HEAPU8.buffer, m.HEAPU8.byteOffset + p, length);
        return Float64Array.from({length: samples}, (_, i) => view.getFloat64((packed ? i * channels + c : i) * 8, true));
      }) : undefined;
      out.push({generation: this.generation, pts, duration, rate, channels, layout, samples, planes, ...(shorten?{timestampOrigin:'stream-clock' as const}:{}), ...(['wmapro','wmalossless','wmavoice'].includes(this.codec)?{timestampOrigin:(m._mc_info(this.owner,11)===1?'packet-clock':'native') as 'packet-clock'|'native'}:{}), ...(planes64 ? {planes64} : {}), ...(pcm ? {pcm} : {})});
    }
    throw Error('Decoder exceeded bounded drain budget');
  }
  private validateWavPack(packet: Uint8Array): void {
    const reject=():never=>{throw Object.assign(Error('Unqualified integer-lossless WavPack block'),{code:'PROVIDER_PROFILE_MISMATCH'});};
    const view=new DataView(packet.buffer,packet.byteOffset,packet.byteLength);let offset=0,index:number|undefined,samples:number|undefined;
    while(offset<packet.length){
      if(packet.length-offset<32||view.getUint32(offset,false)!==0x7776706b)reject();
      const size=view.getUint32(offset+4,true)+8,version=view.getUint16(offset+8,true),blocks=view.getUint32(offset+20,true),flags=view.getUint32(offset+24,true),blockIndex=view.getUint32(offset+16,true);
      if(size<32||size>packet.length-offset||![0x403,0x410].includes(version)||!blocks||blocks>65536||(flags&0x80000088)!==0)reject();
      if(Boolean(flags&0x800)!==(offset===0)||Boolean(flags&0x1000)!==(offset+size===packet.length))reject();
      if(index!==undefined&&(index!==blockIndex||samples!==blocks))reject();index=blockIndex;samples=blocks;offset+=size;
    }
  }
  decode(packet: Uint8Array, pts: number): readonly AudioFrame[] {
    this.enter();
    try {
      if (this.ended) throw Error('Decoder already drained');
      if (!packet.byteLength || packet.byteLength > MAX_PACKET || !Number.isSafeInteger(pts)) throw Error('Invalid audio packet');
      if(['speex','amrnb','amrwb'].includes(this.codec)){
        const sid=this.codec==='amrnb'?68:76;
        if(this.codec!=='speex'&&packet[0]===sid)throw Object.assign(Error('Unsupported AMR SID/DTX profile'),{code:'PROVIDER_PROFILE_MISMATCH'});
        if(pts<0||(this.codec==='speex'?packet.length>2048:(packet[0]!==4||packet.length!==(this.codec==='amrnb'?13:18))))throw Object.assign(Error('Unqualified initial speech packet/header/clock'),{code:'PROVIDER_PROFILE_MISMATCH'});
      }
      if((this.codec==='pcm-u8'||this.codec==='pcm-s8')&&(packet.length>65536||packet.length%this.configuration!.channels!==0||pts<0||!Number.isSafeInteger(pts+packet.length/this.configuration!.channels)))throw Object.assign(Error('Unqualified PCM8 packet geometry/clock'),{code:'PROVIDER_PROFILE_MISMATCH'});
      if(['pcm-alaw','pcm-mulaw','gsm','gsm-ms'].includes(this.codec)){
        if(pts<0||((this.codec==='pcm-alaw'||this.codec==='pcm-mulaw')?(packet.length>4096||packet.length%this.configuration!.channels!==0):(packet.length!==(this.codec==='gsm'?33:65)||(this.codec==='gsm'&&packet[0]>>>4!==13))))throw Object.assign(Error('Unqualified telephony packet framing/clock'),{code:'PROVIDER_PROFILE_MISMATCH'});
      }
      if(this.codec==='adpcm-g726'||this.codec==='adpcm-g726le'){const bits=this.configuration!.bitsPerSample!,samples=packet.length*8/bits;if(packet.length*8%bits||samples>65536||pts<0||!Number.isSafeInteger(pts+samples))throw Object.assign(Error('Unqualified G726 complete bit-group/clock'),{code:'PROVIDER_PROFILE_MISMATCH'});}
      if(this.codec==='adpcm-ima-qt'){const channels=this.configuration!.channels;const reject=():never=>{throw Object.assign(Error('Unqualified MOV IMA-QT packet/header/clock'),{code:'PROVIDER_PROFILE_MISMATCH'});};if(packet.length!==34*channels||pts<0||!Number.isSafeInteger(pts+64))reject();const h=new DataView(packet.buffer,packet.byteOffset,packet.length);for(let c=0;c<channels;c++)if((h.getUint16(34*c,false)&127)>88)reject();}
      if(this.adpcm){
        const reject=():never=>{throw Object.assign(Error('Unqualified WAV ADPCM block'),{code:'PROVIDER_PROFILE_MISMATCH'});};
        if(packet.length!==this.adpcm.align)reject();const channels=this.configuration!.channels,h=new DataView(packet.buffer,packet.byteOffset,packet.length);
        for(let c=0;c<channels;c++)if(this.codec==='adpcm-ms'?(packet[c]>6||h.getInt16(channels+2*c,true)<=0):(packet[4*c+2]>88||packet[4*c+3]!==0))reject();
      }
      if(this.aacAdts)validateHeV2Adts(packet);
      if(this.codec==='shorten'&&(packet.length>1024||pts!==0))throw Object.assign(Error('Shorten requires bounded untimestamped chunks and a zero stream anchor'),{code:'PROVIDER_PROFILE_MISMATCH'});
      if(this.codec==='wavpack')this.validateWavPack(packet);
      this.module.HEAPU8.set(packet, this.packet);
      this.check(this.module._mc_decode(this.owner, this.packet, packet.byteLength, pts));
      return this.receive();
    } catch (error) { this.dispose(); throw error; }
    finally { this.busy = false; }
  }
  flush(): readonly AudioFrame[] {
    this.enter();
    try {
      if (this.ended) return [];
      this.check(this.module._mc_flush(this.owner));
      this.ended = true;
      return this.receive();
    } catch (error) { this.dispose(); throw error; }
    finally { this.busy = false; }
  }
  reset(): void {
    this.enter();
    try { this.check(this.module._mc_reset(this.owner, 1)); this.generation++; this.ended = false; }
    catch (error) { this.dispose(); throw error; }
    finally { this.busy = false; }
  }
  dispose(): void {
    this.signal.removeEventListener('abort', this.abort);
    const owner = this.owner, packet = this.packet;
    this.owner = this.packet = 0;
    if (packet) this.module._free(packet);
    if (owner) this.module._mc_destroy(owner);
  }
}
