// SPDX-License-Identifier: Apache-2.0
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const result={scope:'R24 raw VideoFrame and R215 stride-aware upload at existing YUVPresenter boundary, component only; no CPU or general color/HDR qualification.'};
const server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,PORT:'0'},stdio:['ignore','pipe','inherit']});let browser;
try{
 const origin=await new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(Error('Server timeout')),10000);server.stdout.on('data',b=>{const m=String(b).match(/http:\/\/127\.0\.0\.1:\d+/);if(m){clearTimeout(t);resolve(m[0]);}});});
 browser=await chromium.launch({channel:'chrome',headless:true});result.browser=browser.version();const page=await browser.newPage();await page.goto(origin+'/examples/custom-controls.html');
 result.probe=await page.evaluate(async()=>{
  const {YUVPresenter}=await import('/web/yuv-presenter.js');const source=await (await fetch('/web/yuv-presenter.js')).text();
  const start=source.indexOf('   if(this.staging[i]?.length!==w*h)'),end=source.indexOf('   this.stats.planeCopyBytes+=bytes.length;',start);if(start<0||end<0)throw Error('Candidate patch context changed');
  // Isolated candidate: direct row-strided heap view, preserving current GL owner.
  let candidate=source.slice(0,start)+`   const stride=d.strides[i];if(stride<w)throw Error('Invalid stride');const size=(h-1)*stride+w;if(d.planes[i]<0||d.planes[i]+size>engine.HEAPU8.length)throw Error('Plane bounds');const bytes=engine.HEAPU8.subarray(d.planes[i],d.planes[i]+size);gl.pixelStorei(gl.UNPACK_ROW_LENGTH,stride);\n`+source.slice(end);
  candidate=candidate.replace('this.stats.planeCopyBytes+=bytes.length;','this.stats.planeCopyBytes+=0;').replace('this.stats.videoUploadBytes+=bytes.length;','this.stats.videoUploadBytes+=w*h;gl.pixelStorei(gl.UNPACK_ROW_LENGTH,0);').replace("'./subtitle-overlay.js'",JSON.stringify(location.origin+'/web/subtitle-overlay.js'));
  const url=URL.createObjectURL(new Blob([candidate],{type:'text/javascript'}));const Candidate=(await import(url)).YUVPresenter;URL.revokeObjectURL(url);
  const heap=new Uint8Array(4096),planes=[1024,1280,1408],strides=[13,7,7],w=10,h=8;heap.fill(255,1024);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++)heap[planes[0]+y*strides[0]+x]=((x+y)&1)?235:16;
  for(let i=1;i<3;i++)for(let y=0;y<h/2;y++)heap.fill(128,planes[i]+y*strides[i],planes[i]+y*strides[i]+w/2);
  const engine={HEAPU8:heap,_web_subtitle_ptr:()=>0},d={w,h,planes,strides,src:[2,2,6,4],dst:[0,0,6,4],rotate:0,system:1,full:0,pts:0};
  const render=P=>{const canvas=document.createElement('canvas');canvas.width=6;canvas.height=4;const presenter=new P(canvas);presenter.draw(engine,d);const pixels=new Uint8Array(6*4*4);presenter.gl.readPixels(0,0,6,4,presenter.gl.RGBA,presenter.gl.UNSIGNED_BYTE,pixels);const stats={...presenter.stats};const rowState=presenter.gl.getParameter(presenter.gl.UNPACK_ROW_LENGTH);presenter.destroy();return {pixels:[...pixels],stats,rowState};};
  const reference=render(YUVPresenter),strided=render(Candidate);
  const packed=new Uint8Array(13*8+7*4*2);packed.fill(255);for(let y=0;y<8;y++)packed.set(heap.subarray(1024+y*13,1024+y*13+10),y*13);for(let i=0;i<2;i++)for(let y=0;y<4;y++)packed.set(heap.subarray(planes[i+1]+y*7,planes[i+1]+y*7+5),104+i*28+y*7);
  const frame=new VideoFrame(packed,{format:'I420',codedWidth:10,codedHeight:8,visibleRect:{x:2,y:2,width:6,height:4},displayWidth:6,displayHeight:4,timestamp:0,layout:[{offset:0,stride:13},{offset:104,stride:7},{offset:132,stride:7}],colorSpace:{primaries:'bt709',transfer:'bt709',matrix:'bt709',fullRange:false}});
  const canvas=new OffscreenCanvas(6,4),ctx=canvas.getContext('2d');ctx.drawImage(frame,0,0);frame.close();const raw=[...ctx.getImageData(0,0,6,4).data];const flipped=[];for(let y=3;y>=0;y--)flipped.push(...reference.pixels.slice(y*24,(y+1)*24));
  const maximumError=Math.max(...raw.map((v,i)=>Math.abs(v-flipped[i])));const oracle=raw.every((v,i)=>i%4===3?v===255:Math.abs(v-(((Math.floor(i/4)%6+Math.floor(i/24))&1)?255:0))<=1);
  const badCanvas=new OffscreenCanvas(6,4),bad=new Candidate(badCanvas);let rejected=false;try{bad.draw(engine,{...d,strides:[9,7,7]});}catch{rejected=true;}finally{bad.destroy();}
  return {reference,strided,rawMaximumPixelError:maximumError,checkerboardOracle:oracle,badStrideRejected:rejected,rawVideoFrameClosed:true,limits:['Black/white SDR fixture only; color transfer, chroma phase, rotation, HDR and full playback not qualified.','Direct heap upload driver copies remain opaque; removed JS row copies are not a measured CPU saving.']};
 });
 assert.deepEqual(result.probe.strided.pixels,result.probe.reference.pixels);assert.equal(result.probe.strided.rowState,0);assert.equal(result.probe.strided.stats.planeCopyBytes,0);assert.ok(result.probe.reference.stats.planeCopyBytes>0);assert.ok(result.probe.badStrideRejected);assert.ok(result.probe.checkerboardOracle);assert.ok(result.probe.rawMaximumPixelError<=1);await page.evaluate(()=>player.destroy());result.passed=true;
}catch(e){result.error=String(e.stack);process.exitCode=1;}
finally{await browser?.close();server.kill();await writeFile('results/full-completion/presentation/result.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({passed:result.passed,error:result.error,copyBytes:result.probe&&[result.probe.reference.stats.planeCopyBytes,result.probe.strided.stats.planeCopyBytes],pixelError:result.probe?.rawMaximumPixelError},null,2));}
