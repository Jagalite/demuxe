/* SPDX-License-Identifier: MIT */
const mkCanvas=(w,h)=>{let c=document.createElement('canvas');c.width=w;c.height=h;return c};
window.runWebP=async arg=>{
 let m=webpManifest[arg.profile],o={arg,checks:[],created:0,closed:0};
 // Each target starts from a new canvas and cold decoded-image state.
 const order=[11,0,3,7,8,1,9,4,10,2,6,5];
 for(let target of order){
  let c=mkCanvas(m.width,m.height),x=c.getContext('2d',{willReadFrequently:true});const start=m.frames[target].start_frame;let previous=null,loaded=0;
  for(let i=start;i<=target;i++){
   if(previous?.dispose&&arg.mode!=='ignore-dispose')x.clearRect(previous.x,previous.y,previous.w,previous.h);
   const f=m.frames[i],b=await createImageBitmap(new Blob([await load(arg.framePNG?f.frame_reference:f.file)],{type:arg.framePNG?'image/png':'image/webp'}));o.created++;loaded++;
   if(!f.blend||arg.mode==='ignore-blend')x.clearRect(f.x,f.y,f.w,f.h);
   x.drawImage(b,f.x,f.y);b.close();o.closed++;previous=f;
  }
  const ref=await createImageBitmap(new Blob([await load(m.frames[target].reference)],{type:'image/png'}));let r=mkCanvas(m.width,m.height),rx=r.getContext('2d',{willReadFrequently:true});rx.drawImage(ref,0,0);ref.close();
  let v=x.getImageData(0,0,m.width,m.height).data,rv=rx.getImageData(0,0,m.width,m.height).data;
  let k={target,start,decodedImages:loaded,hash:hash(v),referenceHash:hash(rv),...cmp(v,rv),onBackgrounds:{}};
  for(let bg of ['black','white']){let p=mkCanvas(m.width,m.height),px=p.getContext('2d',{willReadFrequently:true}),q=mkCanvas(m.width,m.height),qx=q.getContext('2d',{willReadFrequently:true});px.fillStyle=qx.fillStyle=bg;px.fillRect(0,0,m.width,m.height);qx.fillRect(0,0,m.width,m.height);px.drawImage(c,0,0);qx.drawImage(r,0,0);k.onBackgrounds[bg]=cmp(px.getImageData(0,0,m.width,m.height).data,qx.getImageData(0,0,m.width,m.height).data)}
  o.checks.push(k);
 }
 // Browser source support is a baseline, not an adapter gain.
 let im=await createImageBitmap(new Blob([await load(m.file)],{type:'image/webp'}));let cv=mkCanvas(m.width,m.height),cx=cv.getContext('2d');cx.drawImage(im,0,0);o.sourceFirstImage={width:im.width,height:im.height,hash:hash(cx.getImageData(0,0,m.width,m.height).data)};im.close();o.cleaned=true;return o
};
