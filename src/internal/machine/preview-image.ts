// SPDX-License-Identifier: Apache-2.0
/** Read bounded raster headers before asking the browser to allocate decoded pixels.
 * Unknown formats fail closed; preview failure never changes the playback route. */
export function previewImageDimensions(bytes:Uint8Array):{width:number;height:number} {
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  const has=(offset:number,length:number)=>offset>=0&&offset+length<=bytes.length;
  const text=(offset:number,length:number)=>String.fromCharCode(...bytes.subarray(offset,offset+length));
  const invalid=()=>{throw new Error('Invalid preview image header');};
  const dimensions=(width:number,height:number)=>{
    if(!Number.isInteger(width)||!Number.isInteger(height)||width<=0||height<=0)invalid();
    if(width*height>16777216)throw new Error('Preview image pixel budget exceeded');
    return {width,height};
  };
  if(has(0,24)&&bytes[0]===137&&text(1,7)==='PNG\r\n\x1a\n'){
    if(view.getUint32(8)!==13||text(12,4)!=='IHDR'||!has(0,33))return invalid();
    return dimensions(view.getUint32(16),view.getUint32(20));
  }
  if(has(0,2)&&bytes[0]===255&&bytes[1]===216){
    for(let offset=2;offset<bytes.length;){
      if(bytes[offset++]!==255)return invalid();
      while(bytes[offset]===255)offset++;
      const marker=bytes[offset++];
      if(marker===undefined||marker===0||marker===217||marker===218)return invalid();
      if(marker===1||marker>=208&&marker<=215)continue;
      if(!has(offset,2))return invalid();
      const length=view.getUint16(offset);if(length<2||!has(offset,length))return invalid();
      if([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker)){
        if(length<8)return invalid();
        return dimensions(view.getUint16(offset+5),view.getUint16(offset+3));
      }
      offset+=length;
    }
    return invalid();
  }
  if(has(0,12)&&text(0,4)==='RIFF'&&text(8,4)==='WEBP'){
    const end=view.getUint32(4,true)+8;if(end>bytes.length||end<12)return invalid();
    let canvas:{width:number;height:number}|undefined;
    for(let offset=12;offset<end;){
      if(offset+8>end)return invalid();
      const type=text(offset,4),length=view.getUint32(offset+4,true),data=offset+8;
      if(data+length>end)return invalid();
      let frame:{width:number;height:number}|undefined;
      if(type==='VP8X'){
        if(length!==10)return invalid();
        const u24=(at:number)=>bytes[at]+bytes[at+1]*256+bytes[at+2]*65536;
        canvas=dimensions(u24(data+4)+1,u24(data+7)+1);
      }else if(type==='VP8 '){
        if(length<10||bytes[data]&1||text(data+3,3)!=='\x9d\x01\x2a')return invalid();
        frame=dimensions(view.getUint16(data+6,true)&16383,view.getUint16(data+8,true)&16383);
      }else if(type==='VP8L'){
        if(length<5||bytes[data]!==47)return invalid();
        const bits=view.getUint32(data+1,true);
        frame=dimensions((bits&16383)+1,((bits>>>14)&16383)+1);
      }else if(type==='ANIM'||type==='ANMF'){
        // Animated containers can allocate multiple frames; supply a static thumbnail.
        throw new Error('Animated WebP previews require a static thumbnail');
      }
      if(frame){if(canvas&&(frame.width!==canvas.width||frame.height!==canvas.height))return invalid();return frame;}
      offset=data+length+(length%2);
    }
    return invalid();
  }
  throw new Error('Unsupported preview image format; use PNG, JPEG or static WebP');
}
