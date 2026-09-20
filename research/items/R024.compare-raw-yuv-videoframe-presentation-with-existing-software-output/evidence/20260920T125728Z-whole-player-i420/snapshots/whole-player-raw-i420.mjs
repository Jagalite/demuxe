// SPDX-License-Identifier: Apache-2.0
// Research-only candidate. Unqualified until actual-player execution and oracle checks.
// Compatible with the existing synchronous engine.drawYUV callback contract.
export class YUVPresenter {
  constructor(canvas) {
    if (typeof VideoFrame !== 'function') throw Error('R024 requires VideoFrame');
    this.canvas = canvas;
    this.context = canvas.getContext('2d', {alpha: false});
    if (!this.context) throw Error('R024 Canvas2D unavailable');
    this.closed = false;
    this.lost = false;
    this.stats = {candidate: 'R024-raw-i420-v1', frames: 0, framesCreated: 0,
      framesClosed: 0, liveFrames: 0, planeCopyBytes: 0, peakStagingBytes: 0,
      drawMs: 0, lastPts: null, fallbackFrames: 0, rejected: 0, liveTextures: 0};
  }
  reject(reason) { this.stats.rejected++; throw Error(`R024 unsupported: ${reason}`); }
  draw(engine, d) {
    const start = performance.now();
    if (this.closed) this.reject('closed owner');
    const {w, h} = d;
    if (![w,h].every(v => Number.isSafeInteger(v) && v > 0 && v <= 8192 && v % 2 === 0)) this.reject('dimensions');
    if (d.rotate !== 0 || d.system !== 1 || d.full !== 0) this.reject('requires unrotated limited-range BT709');
    if (!Number.isFinite(d.pts)) this.reject('invalid PTS');
    if (this.canvas.width !== w || this.canvas.height !== h ||
        ![d.src,d.dst].every(r => Array.isArray(r) && r.length === 4 && r.every((v,i) => v === [0,0,w,h][i]))) this.reject('crop, resize, or aspect transform');
    const heap = engine.HEAPU8;
    const subtitle = engine._web_subtitle_ptr();
    if (!Number.isSafeInteger(subtitle) || subtitle < 0 || subtitle + 32 > heap.length || subtitle % 4) this.reject('subtitle header');
    const header = new Int32Array(heap.buffer, heap.byteOffset + subtitle, 8);
    if (header[1] !== 0 || header[2] !== 0 || header[3] !== 0) this.reject('subtitles or OSD present');
    if (!Array.isArray(d.planes) || !Array.isArray(d.strides) || d.planes.length !== 3 || d.strides.length !== 3) this.reject('plane descriptor');
    const widths = [w,w/2,w/2], heights = [h,h/2,h/2];
    for (let i=0;i<3;i++) {
      const p=d.planes[i], stride=d.strides[i];
      if (!Number.isSafeInteger(p) || !Number.isSafeInteger(stride) || p < 0 || stride < widths[i] || p+(heights[i]-1)*stride+widths[i] > heap.length) this.reject('plane bounds or stride');
    }
    const size=w*h*3/2, offsets=[0,w*h,w*h*5/4];
    if (this.bytes?.length !== size) this.bytes = new Uint8Array(size);
    // Actual strided shared-Wasm reads and owned-buffer packing are inside timing.
    for (let i=0;i<3;i++) for (let row=0;row<heights[i];row++) {
      const at=d.planes[i]+row*d.strides[i];
      this.bytes.set(heap.subarray(at,at+widths[i]),offsets[i]+row*widths[i]);
    }
    this.stats.planeCopyBytes += size;
    this.stats.peakStagingBytes = Math.max(this.stats.peakStagingBytes,size);
    let frame;
    try {
      frame = new VideoFrame(this.bytes, {format:'I420',codedWidth:w,codedHeight:h,
        timestamp:Math.round(d.pts*1e6),layout:offsets.map((offset,i)=>({offset,stride:widths[i]})),
        colorSpace:{primaries:'bt709',transfer:'bt709',matrix:'bt709',fullRange:false}});
      this.stats.framesCreated++; this.stats.liveFrames++;
      this.context.drawImage(frame,0,0);
      this.stats.frames++; this.stats.lastPts=d.pts;
    } finally {
      if (frame) {frame.close(); this.stats.framesClosed++; this.stats.liveFrames--;}
      this.stats.drawMs += performance.now()-start;
    }
  }
  drawRGB() { this.reject('native backend requested RGB fallback'); }
  destroy() { this.closed=true; this.bytes=null; this.context=null; }
}
