// SPDX-License-Identifier: Apache-2.0
import {inflateSync} from 'node:zlib';

export function markedAudio(snapshot) {
  return [440,880].every((hz,channel)=>(snapshot.audio??[]).some(a=>a.channel===channel && a.rms>0.015 && Math.abs(a.hz-hz)<30));
}

// Playwright's PNG screenshots are 8-bit RGB/RGBA. No canvas readback or analyser
// is installed during performance runs; this parser is correctness-only.
export function decodePNG(buffer) {
  if(buffer.subarray(0,8).toString('hex')!=='89504e470d0a1a0a') throw Error('Not PNG');
  let width,height,channels;const parts=[];
  for(let p=8;p<buffer.length;) {
    const n=buffer.readUInt32BE(p),kind=buffer.toString('ascii',p+4,p+8),data=buffer.subarray(p+8,p+8+n);p+=n+12;
    if(kind==='IHDR') {width=data.readUInt32BE(0);height=data.readUInt32BE(4);channels=data[9]===6?4:data[9]===2?3:0;if(data[8]!==8||!channels||data[12])throw Error('Unsupported PNG encoding');}
    if(kind==='IDAT')parts.push(data);
  }
  const source=inflateSync(Buffer.concat(parts)),stride=width*channels,pixels=Buffer.alloc(stride*height);
  for(let y=0,at=0;y<height;y++) {
    const filter=source[at++];
    for(let x=0;x<stride;x++) {
      const a=x>=channels?pixels[y*stride+x-channels]:0,b=y?pixels[(y-1)*stride+x]:0,c=y&&x>=channels?pixels[(y-1)*stride+x-channels]:0;
      let predict=0;
      if(filter===1)predict=a;
      else if(filter===2)predict=b;
      else if(filter===3)predict=Math.floor((a+b)/2);
      else if(filter===4) {const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);predict=pa<=pb&&pa<=pc?a:pb<=pc?b:c;}
      else if(filter!==0)throw Error('Invalid PNG filter');
      pixels[y*stride+x]=(source[at++]+predict)&255;
    }
  }
  return {width,height,channels,pixels};
}

export function markedImage(buffer, position) {
  const {width,height,channels,pixels}=decodePNG(buffer);
  const sum=[0,0,0];let count=0,magenta=0,textPixels=0;
  for(let y=Math.round(height*.03);y<height*.12;y++) for(let x=Math.round(width*.1);x<width*.9;x+=4) {
    const p=(y*width+x)*channels;for(let c=0;c<3;c++)sum[c]+=pixels[p+c];count++;
  }
  for(let y=Math.round(height*.70);y<height*.95;y+=2)for(let x=Math.round(width*.65);x<width*.95;x+=2) {
    const p=(y*width+x)*channels;
    if(pixels[p]>140&&pixels[p+1]<95&&pixels[p+2]>140)magenta++;
  }
  for(let y=Math.round(height*.72);y<height*.94;y+=2)for(let x=Math.round(width*.2);x<width*.8;x+=2){const p=(y*width+x)*channels;if(pixels[p]>180&&pixels[p+1]>180&&pixels[p+2]>180)textPixels++;}
  const rgb=sum.map(x=>x/count),expected=position<4?0:position<8?2:1;
  return {rgb,expected:['red','green','blue'][expected],markerCorrect:rgb[expected]>85&&rgb.every((x,i)=>i===expected||rgb[expected]>x+60),magentaPixels:magenta,textPixels};
}

export function selectCases(matrix, selector) {
  const selected=selector==='all'?matrix.cases:matrix.cases.filter(c=>selector.split(',').some(s=>c.id===s||c.player===s));
  if(!selected.length)throw Error('No matrix cases selected');
  if(selector!=='all')for(const token of selector.split(','))if(!selected.some(c=>c.id===token||c.player===token))throw Error('Unknown case/player '+token);
  return selected;
}

export function performanceEligible(correctness, identity, id) {
  if(correctness.kind!=='correctness'||correctness.assetsSHA256!==identity.assetsSHA256||correctness.harnessSHA256!==identity.harnessSHA256
    ||correctness.browserIdentity!==identity.browserIdentity) return false;
  return correctness.cases.some(c=>c.id===id&&c.status==='passed');
}
