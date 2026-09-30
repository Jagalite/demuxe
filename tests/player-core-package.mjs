// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFile,writeFile,mkdir,stat} from 'node:fs/promises';
import path from 'node:path';
import {createServer} from 'node:http';
import {build} from 'esbuild';
import {chromium} from 'playwright';
import {closeTestBrowser} from './head-to-head/browser-exit.mjs';
const root=process.cwd(),out=path.join(root,'results/media-components/provider-completion');
const consumer=path.join(root,'build/media-components',`consumer-${Date.now()}`);
await mkdir(consumer,{recursive:true});await mkdir(out,{recursive:true});
const assembly=JSON.parse(await readFile('build/media-components/player-core/assembly.json','utf8'));
await writeFile(path.join(consumer,'package.json'),JSON.stringify({name:'demuxe-core-consumer',version:'1.0.0',private:true,type:'module'}));
const npm=execFileSync('npm',['install','--ignore-scripts','--no-audit','--no-fund','--package-lock=false',assembly.archive],{cwd:consumer,encoding:'utf8'});
const installed=path.join(consumer,'node_modules/demuxe');
execFileSync('python3',['scripts/deploy-providers.py','--core',installed,'--output',path.join(consumer,'deployment')],{cwd:root,stdio:'pipe'});
const deployment=path.join(consumer,'deployment');
const pkg=JSON.parse(await readFile(path.join(installed,'package.json'),'utf8'));
assert.equal(pkg.dependencies,undefined);assert.equal(pkg.optionalDependencies,undefined);assert.equal(pkg.peerDependencies,undefined);
const source=`import {Player,SoftwarePreviewProvider} from 'demuxe'; export {Player,SoftwarePreviewProvider};`;
await writeFile(path.join(consumer,'index.js'),source);
const bundle=await build({entryPoints:[path.join(consumer,'index.js')],bundle:true,format:'esm',platform:'browser',write:false,metafile:true,minify:true});
assert.ok(Object.keys(bundle.metafile.inputs).every(p=>!/(wasm-player|native-mpv|native-private-mpv|private-ffmpeg)/.test(p)));
await writeFile(path.join(consumer,'bundle.js'),bundle.outputFiles[0].contents);
const ssr=execFileSync(process.execPath,['--input-type=module','-e',`globalThis.fetch=()=>{throw Error('eager fetch')};Object.defineProperty(globalThis,'document',{get(){throw Error('eager DOM')}});const m=await import('demuxe');if(typeof m.Player!=='function')throw Error('missing Player');console.log('SSR import passed');`],{cwd:consumer,encoding:'utf8'});
await writeFile(path.join(consumer,'consumer.ts'),`import {Player,SoftwarePreviewProvider,type PlayerOptions} from 'demuxe';\nimport 'demuxe/player';\nimport 'demuxe/contracts';\nimport 'demuxe/integration';\nimport 'demuxe/media-element';\nimport 'demuxe/adapters/videojs';\nconst options:PlayerOptions={mode:'native'};const create=(host:HTMLElement)=>new Player(host,options);void create;void SoftwarePreviewProvider;\n`);
execFileSync(process.execPath,[path.join(root,'node_modules/typescript/bin/tsc'),'--noEmit','--strict','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','consumer.ts'],{cwd:consumer,stdio:'pipe'});
const requests=[];
const server=createServer(async(req,res)=>{
 const url=new URL(req.url,'http://localhost');requests.push(url.pathname);
 res.setHeader('Cross-Origin-Opener-Policy','same-origin');res.setHeader('Cross-Origin-Embedder-Policy','require-corp');
 if(url.pathname==='/'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><div id="host" style="width:320px;height:180px"></div>');return;}
 const file=url.pathname==='/example.mp4'?path.join(root,'fixtures/example.mp4'):url.pathname==='/bundle.js'?path.join(consumer,'bundle.js'):url.pathname.startsWith('/assets/demuxe/')?path.resolve(deployment,url.pathname.slice('/assets/demuxe/'.length)):null;
 if(!file||(url.pathname.startsWith('/assets/demuxe/')&&!file.startsWith(deployment+path.sep))){res.writeHead(404).end();return;}
 try{const info=await stat(file);if(!info.isFile())throw Error();const bytes=await readFile(file);res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.mp4')?'video/mp4':'application/octet-stream');res.end(bytes);}catch{res.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;const result={archive:assembly,consumer,npm,ssr,bundleInputs:Object.keys(bundle.metafile.inputs),cases:[],passed:false};
try{
 browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});result.browser=browser.version();
 for(const bundled of [false,true]){
  const page=await browser.newPage();await page.goto(`http://127.0.0.1:${server.address().port}/`);
  const sample=await page.evaluate(async bundled=>{
   const {Player}=await import(bundled?'/bundle.js':'/assets/demuxe/dist/index.js');
   const p=new Player(document.querySelector('#host'),{mode:'native',automaticSelection:false,nativeRemux:'never',assetBase:'/assets/demuxe/'});
   try{
    await p.open(new File([await(await fetch('/example.mp4')).arrayBuffer()],'example.mp4'));await p.play();
    const end=performance.now()+15000;while((p.state.currentTime??0)<0.5&&performance.now()<end)await new Promise(r=>setTimeout(r,20));
    const video=p.surface,canvas=document.createElement('canvas');canvas.width=160;canvas.height=90;const ctx=canvas.getContext('2d');ctx.drawImage(video,0,0,160,90);
    const pixels=ctx.getImageData(0,0,160,90).data;
    return {bundled,mode:p.mode,currentTime:p.state.currentTime,nonblack:pixels.some((n,i)=>i%4!==3&&n>60),surface:video.tagName};
   }finally{await p.destroy();}
  },bundled);
  assert.equal(sample.surface,'VIDEO');assert.equal(sample.nonblack,true);assert.ok(sample.currentTime>=0.5);result.cases.push(sample);await page.close();
 }
 assert.ok(!requests.some(p=>/(\/web\/engine-|wasm-player|native-mpv|native-private-mpv|source-probe|\.wasm$)/.test(p)),JSON.stringify(requests));
 result.passed=true;
}finally{
 if(browser)result.cleanup=await closeTestBrowser(browser,'chrome');server.closeAllConnections();await new Promise(resolve=>server.close(resolve));
 result.requests=requests;await writeFile(path.join(out,'core-consumer.json'),JSON.stringify(result,null,2)+'\n');
}
console.log(JSON.stringify({passed:result.passed,cases:result.cases,consumer},null,2));
