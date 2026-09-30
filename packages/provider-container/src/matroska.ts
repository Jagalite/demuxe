// SPDX-License-Identifier: Apache-2.0
/** Bounded local Matroska packet reader. Unsupported structural features reject
 * this implementation; they do not classify the media as generally unsupported. */
export class ContainerProfileError extends Error {
 readonly code = 'PROVIDER_PROFILE_MISMATCH';
}
export type ContainerColour = Readonly<{primaries:number;transfer:number;matrix:number;fullRange:boolean}>;
export type MatroskaTrack = Readonly<{
 number: number; kind: 'video' | 'audio'; codec: string; privateData: Uint8Array;
 codecDelayNs?: number; seekPreRollNs?: number; colour?: ContainerColour; defaultDurationNs?: number; channels?: number; rate?: number; bitDepth?: number; width?: number; height?: number;
}>;
export type MatroskaPacket = Readonly<{
 track: number; timestampNs: number; key: boolean; data: Uint8Array; discardPaddingNs?: number; durationNs?: number;
}>;
type Element = {id: number; start: number; end: number};
function fail(s: string): never { throw new ContainerProfileError(s); }
function vint(bytes: Uint8Array, offset: number, id = false): {value: number; length: number} {
 const first = bytes[offset]; if (!first) return fail('Invalid EBML integer');
 let length = 1; while (length <= 8 && !(first & (1 << (8 - length)))) length++;
 if (length > (id ? 4 : 8) || offset + length > bytes.length) return fail('Truncated EBML integer');
 let value = id ? first : first & ((1 << (8 - length)) - 1);
 let unknown = !id && value === (1 << (8 - length)) - 1;
 for (let i = 1; i < length; i++) { value = value * 256 + bytes[offset + i]; unknown &&= bytes[offset + i] === 255; }
 if (unknown || !Number.isSafeInteger(value)) return fail('Unknown or excessive EBML size');
 return {value, length};
}
function uint(bytes: Uint8Array): number {
 if (!bytes.length || bytes.length > 8) return fail('Invalid EBML unsigned integer');
 let n = 0; for (const b of bytes) n = n * 256 + b;
 if (!Number.isSafeInteger(n)) return fail('EBML integer overflow'); return n;
}
function float(bytes: Uint8Array): number {
 const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
 const n = bytes.length === 4 ? view.getFloat32(0) : bytes.length === 8 ? view.getFloat64(0) : NaN;
 if (!Number.isFinite(n)) return fail('Invalid EBML float'); return n;
}
export class MatroskaReader {
 private reads = 0;
 private cacheOffset=-1;
 private cache=new Uint8Array(0);
 private constructor(private readonly file: Blob, private readonly signal: AbortSignal,
   readonly tracks: readonly MatroskaTrack[], private readonly segment: Element,
   readonly timecodeScale: number) {}
 private async read(offset: number, size: number): Promise<Uint8Array> {
  this.signal.throwIfAborted();
  if (!Number.isSafeInteger(offset) || !Number.isSafeInteger(size) || offset < 0 || size < 0 || size > 16 * 1024 * 1024 || offset + size > this.file.size) fail('Read bounds');
  // Tiny EBML headers and lossless packets otherwise require thousands of
  // Blob promises per second. Retain one bounded block and return owned copies.
  if(size<=65536){
   if(offset<this.cacheOffset||offset+size>this.cacheOffset+this.cache.length){
    this.cacheOffset=offset;
    const count=Math.min(65536,this.file.size-offset);
    this.cache=new Uint8Array(await this.file.slice(offset,offset+count).arrayBuffer());
    this.signal.throwIfAborted();if(this.cache.length!==count)fail('Short container read');this.reads+=count;
   }
   return this.cache.slice(offset-this.cacheOffset,offset-this.cacheOffset+size);
  }
  const bytes = new Uint8Array(await this.file.slice(offset, offset + size).arrayBuffer());
  this.signal.throwIfAborted(); if (bytes.length !== size) fail('Short container read');
  this.reads += size; return bytes;
 }
 get bytesRead(): number { return this.reads; }
 private async *elements(start: number, end: number): AsyncGenerator<Element> {
  for (let pos = start, count = 0; pos < end;) {
   if (++count > 1000000) fail('Element budget');
   const b = await this.read(pos, Math.min(12, end - pos));
   const id = vint(b, 0, true), size = vint(b, id.length);
   const data = pos + id.length + size.length, next = data + size.value;
   if (!Number.isSafeInteger(next) || next > end || next <= pos) fail('Element bounds');
   yield {id: id.value, start: data, end: next}; pos = next;
  }
 }
 private async bytes(e: Element): Promise<Uint8Array> { return this.read(e.start, e.end - e.start); }
 static async open(file: Blob, signal: AbortSignal): Promise<MatroskaReader> {
  if (!(file instanceof Blob) || file.size < 16) fail('Local Blob required');
  const reader = new MatroskaReader(file, signal, [], {id: 0, start: 0, end: 0}, 1000000);
  let header = false, segment: Element | undefined;
  for await (const e of reader.elements(0, file.size)) {
   if (e.id === 0x1a45dfa3 && !header && !segment) {
    if (e.end - e.start > 4096) fail('EBML header budget');
    let doc = '';
    for await (const h of reader.elements(e.start, e.end)) {
     if (h.id === 0x4282) doc = new TextDecoder().decode(await reader.bytes(h));
     if (h.id === 0x42f7 && uint(await reader.bytes(h)) > 1) fail('EBML read version');
     if (h.id === 0x4285 && uint(await reader.bytes(h)) > 4) fail('Matroska read version');
    }
    if (!['matroska', 'webm'].includes(doc)) fail('Container document type'); header = true;
   } else if (e.id === 0x18538067 && header && !segment) segment = e;
   else if (![0xec, 0xbf].includes(e.id)) fail('Unqualified top-level structure');
  }
  if (!header || !segment) fail('Missing Matroska header or segment');
  const tracks: MatroskaTrack[] = []; let scale = 1000000, infoSeen = false, tracksSeen = false;
  for await (const e of reader.elements(segment.start, segment.end)) {
   if (e.id === 0x1549a966) {
    if (infoSeen || e.end - e.start > 65536) fail('Info budget'); infoSeen = true;
    for await (const i of reader.elements(e.start, e.end)) {
     if (i.id === 0x2ad7b1) scale = uint(await reader.bytes(i));
     if ([0x3cb923, 0x3eb923, 0x4444].includes(i.id)) fail('Linked segments unsupported');
    }
   } else if (e.id === 0x1654ae6b) {
    if (tracksSeen || e.end - e.start > 262144) fail('Track metadata budget'); tracksSeen = true;
    for await (const t of reader.elements(e.start, e.end)) {
     if (t.id !== 0xae) { if (![0xec,0xbf].includes(t.id)) fail('Unknown tracks element'); continue; }
     if (tracks.length >= 16) fail('Track count budget');
     const fields = new Map<number, Element>();
     for await (const f of reader.elements(t.start, t.end)) {
      if (fields.has(f.id) && ![0xec,0xbf].includes(f.id)) fail('Duplicate track field'); fields.set(f.id, f);
     }
     if (fields.has(0x6d80) || fields.has(0x23314f) || fields.has(0x537f)) fail('Encoded or delayed tracks require another provider');
     const number = fields.has(0xd7) ? uint(await reader.bytes(fields.get(0xd7)!)) : 0;
     const type = fields.has(0x83) ? uint(await reader.bytes(fields.get(0x83)!)) : 0;
     if (number < 1 || tracks.some(t => t.number === number) || ![1,2].includes(type)) fail('Unqualified track identity or type');
     const codec = fields.has(0x86) ? new TextDecoder('utf-8',{fatal:true}).decode(await reader.bytes(fields.get(0x86)!)) : '';
     if ((type===1&&!codec.startsWith('V_'))||(type===2&&!codec.startsWith('A_')))fail('Codec and track type disagree');
     if (!['V_MPEG4/ISO/AVC','V_MPEGH/ISO/HEVC','A_AC3','A_EAC3','A_DTS','A_TRUEHD','A_MLP','A_AAC','A_FLAC','A_ALAC','A_OPUS','A_VORBIS','A_MPEG/L3','A_PCM/INT/LIT','A_PCM/FLOAT/IEEE'].includes(codec)) fail('Unqualified track codec');
     const track: {number:number;kind:'video'|'audio';codec:string;privateData:Uint8Array;codecDelayNs?:number;seekPreRollNs?:number;colour?:ContainerColour;defaultDurationNs?:number;channels?:number;rate?:number;bitDepth?:number;width?:number;height?:number} = {
      number, kind: type === 1 ? 'video' : 'audio', codec,
      privateData: fields.has(0x63a2) ? await reader.bytes(fields.get(0x63a2)!) : new Uint8Array(),
     };
     if (fields.has(0x56bb)) {track.seekPreRollNs=uint(await reader.bytes(fields.get(0x56bb)!));if(codec!=='A_OPUS'||track.seekPreRollNs!==80000000)fail('Unqualified codec seek preroll');}
     if (fields.has(0x56aa)) {if(type!==2)fail('Video codec delay');track.codecDelayNs = uint(await reader.bytes(fields.get(0x56aa)!));}
     if (fields.has(0x23e383)) track.defaultDurationNs = uint(await reader.bytes(fields.get(0x23e383)!));
     for (const group of [0xe0,0xe1]) if (fields.has(group)) {
      const g = fields.get(group)!;
      for await (const v of reader.elements(g.start,g.end)) {
       // Display dimensions can override pixel aspect even when DisplayUnit
       // is omitted (its default is pixels). This mux profile does not carry
       // display dimensions, so reject them rather than change presentation.
       if ([0x7670,0x53b8,0x54b0,0x54ba,0x54b2,0x54b3,0x54aa,0x54bb,0x54cc,0x54dd].includes(v.id))fail('Container presentation metadata requires another provider');
       if(v.id===0x9a&&uint(await reader.bytes(v))!==2)fail('Interlaced video requires another provider');
       if(v.id===0x55b0){
        const colour={primaries:2,transfer:2,matrix:2,fullRange:false};
        for await(const c of reader.elements(v.start,v.end)){
         const n=uint(await reader.bytes(c));
         if(c.id===0x55b1)colour.matrix=n;
         else if(c.id===0x55ba)colour.transfer=n;
         else if(c.id===0x55bb)colour.primaries=n;
         else if(c.id===0x55b9){if(![0,1,2].includes(n))fail('Unqualified colour range');colour.fullRange=n===2;}
         else if(c.id===0x55b7){if(n!==1)fail('Unqualified horizontal chroma siting');}
         else if(c.id===0x55b8){if(n!==2)fail('Unqualified vertical chroma siting');}
         else fail('HDR or extended colour metadata requires another provider');
        }
        track.colour=colour;
       }
       if (v.id === 0x9f) track.channels = uint(await reader.bytes(v));
       if (v.id === 0xb5) track.rate = float(await reader.bytes(v));
       if (v.id === 0x6264) track.bitDepth = uint(await reader.bytes(v));
       if (v.id === 0xb0) track.width = uint(await reader.bytes(v));
       if (v.id === 0xba) track.height = uint(await reader.bytes(v));
      }
     }
     tracks.push(track);
    }
   }
  }
  if (!tracksSeen || !infoSeen || !tracks.length || !Number.isSafeInteger(scale) || scale <= 0 || scale > 1000000000) fail('Incomplete container metadata');
  const ready = new MatroskaReader(file,signal,tracks,segment,scale); ready.reads = reader.reads; return ready;
 }
 async *packets(): AsyncGenerator<MatroskaPacket> {
  for await (const e of this.elements(this.segment.start,this.segment.end)) {
   if (e.id !== 0x1f43b675) continue;
   let time: number | undefined;
   for await (const block of this.elements(e.start,e.end)) {
    if (block.id === 0xe7) { if (time !== undefined) fail('Duplicate cluster timestamp'); time = uint(await this.bytes(block)); }
    else if (block.id === 0xa3 || block.id === 0xa0) {
     if (time === undefined) fail('Block before cluster timestamp');
     let payload=block, groupKey=true, discardPaddingNs=0, durationNs:number|undefined;
     if(block.id===0xa0){
      let found=false;
      for await(const child of this.elements(block.start,block.end)){
       if(child.id===0xa1){if(found)fail('Duplicate block');payload=child;found=true;}
       else if(child.id===0xfb)groupKey=false;
       else if(child.id===0x9b){durationNs=uint(await this.bytes(child))*this.timecodeScale;if(!Number.isSafeInteger(durationNs)||durationNs<=0)fail('Block duration overflow');}
       else if(child.id===0x75a2){
        const b=await this.bytes(child);if(!b.length||b.length>8||b[0]&128)fail('Negative or malformed discard padding');
        discardPaddingNs=uint(b);
       } else if(![0x9b,0xec,0xbf].includes(child.id))fail('Unsupported block group extension');
      }
      if(!found)fail('Missing block group payload');
     }
     const bytes = await this.bytes(payload), number = vint(bytes,0);
     if (bytes.length < number.length + 4 || !this.tracks.some(t => t.number === number.value)) fail('Invalid block track');
     const view = new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength), flags = bytes[number.length+2];
     if (flags & 0x0e) fail('Laced or invisible block requires another provider');
     const timestampNs = (time + view.getInt16(number.length)) * this.timecodeScale;
     if (!Number.isSafeInteger(timestampNs)) fail('Timestamp overflow');
     yield {track:number.value,timestampNs,key:block.id===0xa3?!!(flags&0x80):groupKey,data:bytes.subarray(number.length+3),...(discardPaddingNs?{discardPaddingNs}:{}),...(durationNs?{durationNs}:{})};
    } else if (![0xec,0xbf,0xa7,0xab].includes(block.id)) fail('Cluster extension requires another provider');
   }
  }
 }
}
