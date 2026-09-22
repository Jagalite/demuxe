// SPDX-License-Identifier: GPL-3.0-or-later
// Display one mpv-composited BGRA overlay. No subtitle layout or layer blending.
export class SubtitleOverlay {
 constructor(){this.serial=-1;this.snapshot={surface:null};this.stats={updates:0,bytes:0,peakBytes:0,parts:0,renders:0};}
 read(engine){
  if(engine._web_subtitle_overlay_version?.()!==2)throw Error('Subtitle engine requires rebuild: composed overlay ABI 2');
  const ptr=engine._web_subtitle_ptr(),h=new Int32Array(engine.HEAPU8.buffer,ptr,12);
  this.stats.renders=h[6];this.stats.composites=engine._web_subtitle_composite_count();
  if(h[3]===-2)throw Error('Invalid subtitle packet');
  if(h[3]===-3)throw Error('Subtitle composition failed');
  if(h[3])throw Error('Subtitle bitmap budget exceeded');
  if(this.serial===h[0])return this.snapshot;
  const [serial,count,bytes,,width,height,,,x,y,w,heightPixels]=h;
  if(![0,1].includes(count)||width<1||height<1||width>1920||height>1080||bytes<0||bytes>1920*1080*4)throw Error('Invalid subtitle packet');
  let snapshot={surface:null};
  if(count){
   if(x<0||y<0||w<=0||heightPixels<=0||x+w>width||y+heightPixels>height||bytes!==w*heightPixels*4)throw Error('Invalid subtitle packet');
   const input=new Uint8Array(engine.HEAPU8.buffer,ptr+48,bytes),image=new ImageData(w,heightPixels),rgba=image.data;
   // Canvas ImageData needs straight RGBA; mpv returns premultiplied BGRA.
   for(let i=0;i<bytes;i+=4){
    const a=input[i+3];
    rgba[i]=a?Math.min(255,Math.round(input[i+2]*255/a)):0;
    rgba[i+1]=a?Math.min(255,Math.round(input[i+1]*255/a)):0;
    rgba[i+2]=a?Math.min(255,Math.round(input[i]*255/a)):0;
    rgba[i+3]=a;
   }
   // Snapshots can belong to pending video frames, so changed images own a surface.
   const surface=new OffscreenCanvas(w,heightPixels);
   surface.getContext('2d').putImageData(image,0,0);
   snapshot={surface,x,y};
  }else if(bytes!==0)throw Error('Invalid subtitle packet');
  this.serial=serial;this.stats.updates++;this.stats.bytes+=bytes;this.stats.peakBytes=Math.max(this.stats.peakBytes,bytes);this.stats.parts=count;
  return this.snapshot=snapshot;
 }
 draw(context,snapshot){if(snapshot.surface)context.drawImage(snapshot.surface,snapshot.x,snapshot.y);}
 clear(){this.serial=-1;this.snapshot={surface:null};this.stats.parts=0;}
}
