// SPDX-License-Identifier: Apache-2.0
export interface FlacModule {
 HEAPU8: Uint8Array; HEAP32: Int32Array;
 _ae_create(channels: number, level: number): number;
 _ae_destroy(owner: number): void;
 _ae_size(owner: number): number;
 _ae_input(owner: number): number;
 _ae_send(owner: number, samples: number): number;
 _ae_receive(owner: number): number;
 _ae_data(owner: number): number;
 _ae_bytes(owner: number): number;
 _ae_pts(owner: number): number;
 _ae_duration(owner: number): number;
 _ae_header(owner: number): number;
 _ae_header_size(owner: number): number;
}
export type FlacPacket = Readonly<{data: Uint8Array; pts: number; duration: number}>;
/** 48 kHz signed 24-bit PCM, represented left justified in interleaved Int32.
 * Callers own float quantization, channel mapping and timeline alignment. */
export interface AudioPacketEncoder {
 readonly blockSize: number;
 readonly header: Uint8Array;
 encode(pcm: Int32Array): readonly FlacPacket[];
 flush(): readonly FlacPacket[];
 dispose(): void;
}
export class PacketFlacEncoder implements AudioPacketEncoder {
 private owner = 0;
 private ended = false;
 private partial = false;
 readonly blockSize: number;
 readonly header: Uint8Array;
 constructor(private readonly module: FlacModule, readonly channels: number,
   private readonly signal: AbortSignal, level = 0) {
  signal.throwIfAborted();
  if (![1, 2, 6].includes(channels) || !Number.isInteger(level) || level < 0 || level > 12) throw Error('Unqualified FLAC configuration');
  this.owner = module._ae_create(channels, level);
  if (!this.owner) throw Error('FLAC initialization failed');
  try {
   this.blockSize = module._ae_size(this.owner);
   if (!Number.isInteger(this.blockSize) || this.blockSize < 1 || this.blockSize > 65535) throw Error('Invalid FLAC block size');
   this.header = this.copy(module._ae_header(this.owner), module._ae_header_size(this.owner));
   if (this.header.length !== 34) throw Error('Invalid FLAC stream info');
   signal.addEventListener('abort', this.abort, {once: true});
  } catch (error) { this.dispose(); throw error; }
 }
 private readonly abort = () => this.dispose();
 private copy(p: number, n: number): Uint8Array {
  if (!Number.isInteger(p) || !Number.isInteger(n) || p <= 0 || n <= 0 || n > 1048576 || p + n > this.module.HEAPU8.byteLength) throw Error('Invalid FLAC output bounds');
  return this.module.HEAPU8.slice(p, p + n);
 }
 private check(): void { this.signal.throwIfAborted(); if (!this.owner) throw Error('Encoder disposed'); }
 private drain(): FlacPacket[] {
  const result: FlacPacket[] = [], m = this.module;
  for (let i = 0; i < 64; i++) {
   const r = m._ae_receive(this.owner);
   if (r === -6 || r === -541478725) return result;
   if (r < 0) throw Error('FLAC receive failed: ' + r);
   const n = m._ae_bytes(this.owner);
   // FFmpeg can emit an empty final packet carrying stream-info side data.
   if (n === 0) continue;
   const pts = m._ae_pts(this.owner), duration = m._ae_duration(this.owner);
   if (!Number.isSafeInteger(pts) || !Number.isSafeInteger(duration) || duration <= 0) throw Error('Invalid FLAC timeline');
   result.push({data: this.copy(m._ae_data(this.owner), n), pts, duration});
  }
  throw Error('FLAC drain budget exceeded');
 }
 encode(pcm: Int32Array): readonly FlacPacket[] {
  this.check();
  try {
   const n = pcm.length / this.channels;
   if (this.ended || this.partial || !Number.isInteger(n) || n < 1 || n > this.blockSize) throw Error('Invalid FLAC input block');
   if (pcm.some(v => (v & 255) !== 0)) throw Error('FLAC input must be left-justified signed 24-bit PCM');
   const p = this.module._ae_input(this.owner);
   if (!Number.isSafeInteger(p) || p <= 0 || p % 4 || p + pcm.byteLength > this.module.HEAPU8.byteLength) throw Error('Invalid FLAC input buffer');
   this.module.HEAP32.set(pcm, p / 4);
   const code = this.module._ae_send(this.owner, n);
   if (code < 0) throw Error('FLAC send failed: ' + code);
   this.partial = n < this.blockSize;
   return this.drain();
  } catch (error) { this.dispose(); throw error; }
 }
 flush(): readonly FlacPacket[] {
  this.check();
  try {
   if (this.ended) return [];
   const code = this.module._ae_send(this.owner, 0);
   if (code < 0) throw Error('FLAC flush failed: ' + code);
   this.ended = true;
   return this.drain();
  } catch (error) { this.dispose(); throw error; }
 }
 dispose(): void {
  this.signal.removeEventListener('abort', this.abort);
  const owner = this.owner; this.owner = 0;
  if (owner) this.module._ae_destroy(owner);
 }
}
