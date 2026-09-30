// SPDX-License-Identifier: Apache-2.0
/** One synchronous codec owner. The asset loader supplies an already verified
 * instance; fine and bundled builds implement the same ABI and ownership rules. */
export interface AudioDecoderModule {
  HEAPU8: Uint8Array;
  HEAPF32: Float32Array;
  HEAP32: Int32Array;
  _malloc(n: number): number;
  _free(p: number): void;
  _mc_create(kind: number): number;
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
  /** Owned copy. No view into growable Wasm memory escapes this adapter. */
  planes: readonly Float32Array[];
  /** Lossless integer PCM, interleaved and left justified. Present only for
   * TrueHD/MLP/DTS-HD; these samples never pass through float quantization. */
  pcm?: Int32Array;
}>;
export type PacketAudioCodec = 'ac3' | 'eac3' | 'dts-core' | 'truehd' | 'mlp' | 'dts-hd';
const integerCodecs = new Set<PacketAudioCodec>(['truehd', 'mlp', 'dts-hd']);

// Emscripten uses errno 6 for EAGAIN; this is the Wasm ABI, not host errno.
const AGAIN = -6, EOF = -541478725, MAX_PACKET = 1048576;
export interface AudioPacketDecoder {
 decode(packet: Uint8Array, pts: number): readonly AudioFrame[];
 flush(): readonly AudioFrame[];
 reset(): void;
 dispose(): void;
}
export class PacketAudioDecoder implements AudioPacketDecoder {
  private owner = 0;
  private packet = 0;
  private ended = false;
  private generation = 0;
  private busy = false;
  constructor(private readonly module: AudioDecoderModule, private readonly codec: PacketAudioCodec,
    private readonly signal: AbortSignal) {
    signal.throwIfAborted();
    const kind = {ac3: 0, eac3: 1, 'dts-core': 2, truehd: 3, mlp: 4, 'dts-hd': 5}[codec];
    if (kind === undefined) throw Error('Unsupported decoder capability');
    this.owner = module._mc_create(kind);
    if (!this.owner) throw Error('Decoder initialization failed');
    try {
      this.check(module._mc_configure(this.owner, 48000));
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
    for (let count = 0; count < 64; count++) {
      const code = m._mc_frame(this.owner);
      if (code === AGAIN || code === EOF) return out;
      this.check(code);
      const [samples, rate, channels, format, pts, duration, layout] = Array.from({length: 7}, (_, i) => m._mc_info(this.owner, i));
      const integer = integerCodecs.has(this.codec);
      if ((!integer && format !== 8) || (integer && ![1, 2, 6, 7].includes(format))
        || (this.codec === 'dts-hd' && format !== 7)
        || rate !== 48000 || !(integer ? [1, 2, 6, 8] : [1, 2, 6]).includes(channels)
        || !Number.isSafeInteger(samples) || samples < 1 || samples > 6144
        || !Number.isSafeInteger(pts) || !Number.isSafeInteger(duration) || duration < 0
        || !Number.isSafeInteger(layout) || layout <= 0) throw Object.assign(Error('Unqualified decoded frame'),{code:'PROVIDER_PROFILE_MISMATCH'});
      let pcm: Int32Array | undefined;
      if (integer) {
        pcm = new Int32Array(samples * channels);
        const packed = format === 1 || format === 2, width = format === 1 || format === 6 ? 2 : 4;
        for (let c = 0; c < channels; c++) {
          const p = m._mc_plane(this.owner, packed ? 0 : c);
          const length = samples * width * (packed ? channels : 1);
          if (!Number.isSafeInteger(p) || p <= 0 || p % width || p + length > m.HEAPU8.byteLength) throw Error('Invalid integer PCM bounds');
          const view = new DataView(m.HEAPU8.buffer, m.HEAPU8.byteOffset + p, length);
          for (let i = 0; i < samples; i++) {
            const offset = (packed ? i * channels + c : i) * width;
            pcm[i * channels + c] = width === 2 ? view.getInt16(offset, true) * 65536 : view.getInt32(offset, true);
          }
        }
      }
      const planes = integer ? [] : Array.from({length: channels}, (_, c) => {
        const p = m._mc_plane(this.owner, c);
        if (!Number.isSafeInteger(p) || p <= 0 || p % 4 || p + samples * 4 > m.HEAPU8.byteLength) throw Error('Invalid PCM plane');
        return m.HEAPF32.slice(p / 4, p / 4 + samples);
      });
      out.push({generation: this.generation, pts, duration, rate, channels, layout, samples, planes, ...(pcm ? {pcm} : {})});
    }
    throw Error('Decoder exceeded bounded drain budget');
  }
  decode(packet: Uint8Array, pts: number): readonly AudioFrame[] {
    this.enter();
    try {
      if (this.ended) throw Error('Decoder already drained');
      if (!packet.byteLength || packet.byteLength > MAX_PACKET || !Number.isSafeInteger(pts)) throw Error('Invalid audio packet');
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
