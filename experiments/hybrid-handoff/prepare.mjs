// SPDX-License-Identifier: Apache-2.0
// Diagnostic 2x2: external-video/clear x visible-canvas/persistent-GPU-texture.
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
const source='build/hybrid-external-texture/assets',out='build/hybrid-handoff/assets';
await fs.cp(source,out,{recursive:true});
const web=`${out}/demuxe/web`;
const replace=(s,a,b)=>{if(s.split(a).length!==2)throw Error(`Anchor mismatch: ${a}`);return s.replace(a,b);};
let s=await fs.readFile(`${web}/external-texture-presenter.mjs`,'utf8');
s=replace(s,"  const context=canvas.getContext('webgpu');",`  const mode=new URL(self.location.href).searchParams.get('handoff')??'visible';
  const offscreen=mode.includes('offscreen'),clearOnly=mode.startsWith('clear-');
  const context=offscreen?null:canvas.getContext('webgpu');`);
s=replace(s,"if(!context)throw", "if(!offscreen&&!context)throw");
s=replace(s,"const stats={kind:","const stats={mode,kind:");
s=replace(s,"  context.configure({device,format,alphaMode:'opaque'});",`  context?.configure({device,format,alphaMode:'opaque'});
  const target=offscreen?device.createTexture({size:[canvas.width,canvas.height],format,
    usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_SRC}):null;`);
s=replace(s,"    const imported=device.importExternalTexture({source:frame});stats.imports++;", "    const imported=clearOnly?null:device.importExternalTexture({source:frame});if(imported)stats.imports++;");
s=replace(s,"const bindings=device.createBindGroup", "const bindings=clearOnly?null:device.createBindGroup");
s=replace(s,"view:context.getCurrentTexture().createView()", "view:(target??context.getCurrentTexture()).createView()");
s=replace(s,"clearValue:{r:0,g:0,b:0,a:1}","clearValue:{r:(stats.draws%60)/60,g:0,b:0,a:1}");
s=replace(s,"    pass.setPipeline(pipeline);pass.setBindGroup(0,bindings);pass.draw(3);pass.end();", "    if(!clearOnly){pass.setPipeline(pipeline);pass.setBindGroup(0,bindings);pass.draw(3);}pass.end();");
s=replace(s,"context.unconfigure();device.destroy();", "context?.unconfigure();target?.destroy();device.destroy();");
await fs.writeFile(`${web}/external-texture-presenter.mjs`,s);
let player=await fs.readFile(`${web}/generated/internal/wasm-player.js`,'utf8');
player=replace(player,'&externalTexture=${globalThis.__hybridExternalTexture ? 1 : 0}',
 '&externalTexture=${globalThis.__hybridExternalTexture ? 1 : 0}&handoff=${globalThis.__hybridHandoffMode??"visible"}');
await fs.writeFile(`${web}/generated/internal/wasm-player.js`,player);
const meta=JSON.parse(await fs.readFile(`${out}/attribution-preparation.json`));
meta.handoff={source,presenterSha256:createHash('sha256').update(s).digest('hex'),playerSha256:createHash('sha256').update(player).digest('hex'),modes:['visible','offscreen','clear-visible','clear-offscreen']};
await fs.writeFile(`${out}/attribution-preparation.json`,JSON.stringify(meta,null,2));
console.log(meta.handoff);
