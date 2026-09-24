// SPDX-License-Identifier: Apache-2.0
// Synthetic device-local surfaces exercise the dormant presentation path.
// This does not qualify a codec, media route or performance.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';

const server=spawn(process.execPath,['scripts/serve.mjs'],{stdio:['ignore','pipe','pipe']});
let browser;
try{
  const origin=await new Promise((resolve,reject)=>{
    const timeout=setTimeout(()=>reject(Error('Server startup timed out')),10000);
    server.stdout.on('data',chunk=>{const match=String(chunk).match(/http:\/\/127\.0\.0\.1:\d+/);
      if(match){clearTimeout(timeout);resolve(match[0]);}});
    server.on('exit',code=>{clearTimeout(timeout);reject(Error(`Server exited: ${code}`));});
  });
  browser=await chromium.launch({channel:'chrome',headless:true,
    args:['--enable-unsafe-webgpu','--use-angle=swiftshader','--enable-webgpu-developer-features']});
  const page=await browser.newPage();await page.goto(origin+'/web/index.html');
  const result=await page.evaluate(async()=>{
    if(!navigator.gpu)return {skipped:'WebGPU unavailable in this browser'};
    const [{WebGPUCodecRuntime},{WebGPUPresenter}]=await Promise.all([
      import('/web/webgpu/runtime.js'),import('/web/webgpu/presenter.js')]);
    const runtime=new WebGPUCodecRuntime();let presenter;const errors=[];
    try{
      await runtime.acquireDevice();runtime.device.addEventListener('uncapturederror',event=>errors.push(event.error.message));
      const canvas=new OffscreenCanvas(64,64);presenter=new WebGPUPresenter(canvas,runtime);
      const planes=[64,32,32].map((size,index)=>{
        const texture=runtime.device.createTexture({size:[size,size],format:'r8unorm',usage:6});
        runtime.device.queue.writeTexture({texture},new Uint8Array(size*size).fill(index?128:160),{bytesPerRow:size},[size,size]);
        return texture;
      });
      const subtitle=new OffscreenCanvas(16,16);subtitle.getContext('2d').fillRect(0,0,16,16);
      presenter.draw({pts:0,duration:33333,generation:0,surface:{planes:planes.map(texture=>texture.createView())},
        width:64,height:64,pixelFormat:'I420',color:{matrix:'bt709',fullRange:false}},null,
      {surface:subtitle,x:16,y:16});
      const tenBit=[{width:64,height:64,value:0x3900},{width:32,height:64,value:0x3800},{width:32,height:64,value:0x3800}]
        .map(({width,height,value})=>{
          const texture=runtime.device.createTexture({size:[width,height],format:'r16float',usage:6});
          const samples=new Uint16Array(width*height).fill(value);
          runtime.device.queue.writeTexture({texture},samples,{bytesPerRow:width*2},[width,height]);
          return texture;
        });
      presenter.draw({pts:33333,duration:33333,generation:0,surface:{planes:tenBit.map(texture=>texture.createView())},
        width:64,height:64,pixelFormat:'I422P10',color:{matrix:'bt709',fullRange:false}},null,
      {surface:subtitle,x:16,y:16});
      const twelveBit=[64,32,32].map((size,index)=>{
        const texture=runtime.device.createTexture({size:[size,size],format:'rg8unorm',usage:6});
        const code=index?2048:3000,bytes=new Uint8Array(size*size*2);
        for(let at=0;at<bytes.length;at+=2){bytes[at]=code>>8;bytes[at+1]=code&255;}
        runtime.device.queue.writeTexture({texture},bytes,{bytesPerRow:size*2},[size,size]);
        return texture;
      });
      presenter.draw({pts:50000,duration:33333,generation:0,surface:{planes:twelveBit.map(texture=>texture.createView())},
        width:64,height:64,pixelFormat:'I420P12',color:{matrix:'bt709',fullRange:false}},null,null);
      await runtime.device.queue.onSubmittedWorkDone();
      const twelveBitmap=canvas.transferToImageBitmap(),twelveCanvas=new OffscreenCanvas(64,64);
      const twelveContext=twelveCanvas.getContext('2d');twelveContext.drawImage(twelveBitmap,0,0);
      const twelveCenter=twelveContext.getImageData(32,32,1,1).data[0];twelveBitmap.close();
      presenter.draw({pts:66666,duration:33333,generation:0,surface:{planes:planes.map(texture=>texture.createView())},
        width:64,height:64,pixelFormat:'I420',color:{matrix:'bt709',fullRange:false}},
      {'demux-rotation':45},null);
      await runtime.device.queue.onSubmittedWorkDone();
      await new Promise(resolve=>setTimeout(resolve,50));
      const bitmap=canvas.transferToImageBitmap();
      const readback=new OffscreenCanvas(64,64),context=readback.getContext('2d');context.drawImage(bitmap,0,0);
      const pixels=context.getImageData(0,0,64,64).data;
      const corner=pixels[0],center=pixels[(32*64+32)*4];bitmap.close();
      for(const texture of [...planes,...tenBit,...twelveBit])texture.destroy();
      return {frames:presenter.frames,pipelines:runtime.diagnostics.pipelineCount,errors,corner,center,twelveCenter};
    }finally{presenter?.destroy();await runtime.destroy();}
  });
  if(result.skipped)console.log(result.skipped);
  else{assert.deepEqual(result.errors,[]);assert.equal(result.frames,4);assert.equal(result.pipelines,2);
    assert.ok(result.center>result.corner+40,`rotated frame must leave black corners: ${JSON.stringify(result)}`);
    assert.ok(result.twelveCenter>170&&result.twelveCenter<230,`packed 12-bit luma must be reconstructed: ${JSON.stringify(result)}`);
    console.log('WebGPU presenter synthetic 8/10/12-bit surfaces, rotation and subtitle overlay passed');}
}finally{await browser?.close();server.kill();}
