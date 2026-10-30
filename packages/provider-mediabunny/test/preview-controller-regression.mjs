// SPDX-License-Identifier: Apache-2.0
import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,dirname} from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
const source=process.env.DEMUXE_CORE_SOURCE_ROOT??resolve(dirname(fileURLToPath(import.meta.url)),'../../../src');
const temporary=await mkdtemp(join(tmpdir(),'demuxe-preview-job-'));
after(()=>rm(temporary,{recursive:true,force:true}));
const outfile=join(temporary,'controller.mjs');
await build({entryPoints:[join(source,'preview/controller.ts')],bundle:true,platform:'node',format:'esm',outfile});
const {PreviewController}=await import(pathToFileURL(outfile).href);
test('same-key request after foreground deferral starts a new generation',async()=>{
  let decoded=0;
  const controller=new PreviewController([{id:'decoder',priority:1,requiresDecoder:true,canHandle:()=>true,getFrame:async context=>{decoded++;return {time:context.time,actualTime:context.time,width:32,height:24,image:{blob:new Blob(['frame'])},path:'test'};}}],{bucketSeconds:0,debounceMs:0,timeoutMs:100});
  try{
    controller.setSourceIdentity('fixture');controller.setPlaybackActive(true);
    assert.equal(await controller.getFrame({time:0.25,width:32,height:24}),null);assert.equal(decoded,0);
    controller.setPlaybackActive(false);
    const frame=await controller.getFrame({time:0.25,width:32,height:24});
    assert.equal(frame?.actualTime,0.25);assert.equal(decoded,1);
  }finally{await controller.destroy();}
});
