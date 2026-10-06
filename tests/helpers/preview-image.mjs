// SPDX-License-Identifier: Apache-2.0
import {deflateSync} from 'node:zlib';
/** Actual PNG bytes, including dimensions and CRCs, for image-boundary tests. */
export function previewPNG(width=1,height=1){
 const chunk=(type,data)=>{
  const body=Buffer.concat([Buffer.from(type),data]);let crc=0xffffffff;
  for(const byte of body){crc^=byte;for(let bit=0;bit<8;bit++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}
  const output=Buffer.alloc(data.length+12);output.writeUInt32BE(data.length);body.copy(output,4);output.writeUInt32BE((crc^0xffffffff)>>>0,output.length-4);return output;
 };
 const header=Buffer.alloc(13);header.writeUInt32BE(width);header.writeUInt32BE(height,4);header[8]=8;header[9]=6;
 return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(Buffer.alloc(height*(1+width*4)))),chunk('IEND',Buffer.alloc(0))]);
}
