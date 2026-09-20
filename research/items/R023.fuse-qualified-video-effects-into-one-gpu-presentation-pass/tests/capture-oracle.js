// SPDX-License-Identifier: Apache-2.0
// Correctness-only independent integer geometry/inversion/composition oracle.
export function oracleFrame(frame,overlay){
 const sw=frame.displayWidth,sh=frame.displayHeight,w=sh,h=sw;
 const src=new OffscreenCanvas(sw,sh),sc=src.getContext('2d');sc.drawImage(frame,0,0);const pixels=sc.getImageData(0,0,sw,sh).data;
 const sub=new OffscreenCanvas(w,h),ctx=sub.getContext('2d');for(const p of overlay.parts)ctx.drawImage(p.tile,p.x,p.y,p.dw,p.dh);const subs=ctx.getImageData(0,0,w,h).data;
 const output=new Uint8Array(w*h*4);let wrongAlphaReferenceDiffers=false;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const d=(y*w+x)*4,s=((sh-1-x)*sw+y)*4,a=subs[d+3];for(let c=0;c<3;c++)output[d+c]=Math.round(((255-pixels[s+c])*(255-a)+subs[d+c]*a)/255);output[d+3]=255;for(let c=0;c<3;c++)if(output[d+c]!==255-pixels[s+c])wrongAlphaReferenceDiffers=true;}
 const wrongIdentity=new Uint8Array(output.length);for(let i=0;i<output.length;i++)wrongIdentity[i]=pixels[i];
 return{pts:frame.timestamp,width:w,height:h,output:[...output],subtitleNonzeroAlpha:subs.filter((_,i)=>i%4===3).filter(x=>x>0).length,subtitlePartialAlpha:subs.filter((_,i)=>i%4===3).filter(x=>x>0&&x<255).length,wrongAlphaReferenceDiffers,wrongIdentityDiffers:output.some((x,i)=>x!==wrongIdentity[i]),scope:'Actual same decoded VideoFrame RGB via browser2D, independentinteger rotation/inversion/straightalpha arithmetic using actual mpv/libass subtitlebitmap raster. DecoderRGB oracle shared with baseline; not independent decoder qualification.'};
}
