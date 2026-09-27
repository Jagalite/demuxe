// SPDX-License-Identifier: Apache-2.0
import type {PreviewContext,PreviewImage} from './controller.js';
/** Bounded encoded images; callers supply authorized bytes, never playback surfaces. */
export async function rasterizePreview(blob:Blob,request:Pick<PreviewContext,'width'|'height'|'signal'>,crop?:{x:number;y:number;width:number;height:number}):Promise<{blob:Blob;width:number;height:number}>{
  request.signal.throwIfAborted();if(blob.size>4*1024*1024)throw Error('Preview image byte budget exceeded');
  const bitmap=await createImageBitmap(blob);
  try{
    request.signal.throwIfAborted();
    if(bitmap.width*bitmap.height>16777216)throw Error('Preview image pixel budget exceeded');
    const box=crop??{x:0,y:0,width:bitmap.width,height:bitmap.height};
    if(!Object.values(box).every(Number.isFinite)||box.x<0||box.y<0||box.width<=0||box.height<=0||box.x+box.width>bitmap.width||box.y+box.height>bitmap.height)throw Error('Invalid preview crop');
    const scale=Math.min(request.width/box.width,(request.height??2048)/box.height,1),width=Math.max(1,Math.round(box.width*scale)),height=Math.max(1,Math.round(box.height*scale));
    const canvas=new OffscreenCanvas(width,height),context=canvas.getContext('2d');if(!context)throw Error('Preview canvas unavailable');
    context.drawImage(bitmap,box.x,box.y,box.width,box.height,0,0,width,height);
    const output=await canvas.convertToBlob({type:'image/jpeg',quality:.85});request.signal.throwIfAborted();return {blob:output,width,height};
  }finally{bitmap.close();}
}
/** Public references are explicitly authored by the host; no playback credentials
 * are inherited. Authenticated sources should supply Blob results instead. */
export async function previewImageBlob(image:PreviewImage,signal:AbortSignal):Promise<Blob>{
  if('blob' in image)return image.blob;
  let last:unknown=new Error('No authored image URI');
  for(const uri of image.uris){
    try{
      const url=new URL(uri,globalThis.location?.href);if(!['http:','https:','blob:'].includes(url.protocol)||url.username||url.password)throw Error('Unsupported preview URI');
      const headers=new Headers();if(image.startByte!==undefined||image.endByte!==undefined)headers.set('Range',`bytes=${image.startByte??0}-${image.endByte??''}`);
      const response=await fetch(url,{signal,headers,credentials:'omit',redirect:'error',priority:'low'});
      if(!response.ok){await response.body?.cancel();throw Error('Preview image request failed');}
      if(Number(response.headers.get('Content-Length'))>4*1024*1024){await response.body?.cancel();throw Error('Preview image byte budget exceeded');}
      let expected:number|undefined;
      if(headers.has('Range')){const match=/^bytes (\d+)-(\d+)\/(\d+)$/.exec(response.headers.get('Content-Range')??'');if(response.status!==206||!match||Number(match[1])!==(image.startByte??0)||(image.endByte!==undefined&&Number(match[2])!==image.endByte)){await response.body?.cancel();throw Error('Preview image range mismatch');}expected=Number(match[2])-Number(match[1])+1;}
      const reader=response.body?.getReader();if(!reader)throw Error('Empty preview image');
      const chunks:Uint8Array<ArrayBuffer>[]=[];let size=0;
      try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>4*1024*1024)throw Error('Preview image byte budget exceeded');chunks.push(value);}}finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
      if(expected!==undefined&&size!==expected)throw Error('Preview image range body mismatch');
      const result=await rasterizePreview(new Blob(chunks,{type:response.headers.get('Content-Type')??''}),{width:Math.min(2048,image.crop.width),height:Math.min(2048,image.crop.height),signal},image.crop);return result.blob;
    }catch(error){signal.throwIfAborted();last=error;}
  }
  throw last;
}
