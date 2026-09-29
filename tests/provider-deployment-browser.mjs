// SPDX-License-Identifier: Apache-2.0
// Actual installed tarballs and disjoint deployments; no checkout fallback files.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFile,writeFile,mkdir,stat,copyFile} from 'node:fs/promises';
import path from 'node:path';
import {createServer} from 'node:http';
import {chromium,firefox} from 'playwright';
import {closeTestBrowser} from './head-to-head/browser-exit.mjs';
const root=process.cwd(),family=process.env.BROWSER??'chrome',run=path.join(root,'build/media-components',`deployment-${family}-${Date.now()}`);
const evidence=path.join(root,'results/media-components/provider-completion');await mkdir(run,{recursive:true});await mkdir(evidence,{recursive:true});
const archives=await Promise.all(['player-core','provider-ffmpeg-v2','provider-mpv-v2'].map(async name=>JSON.parse(await readFile(`build/media-components/${name}/assembly.json`,'utf8'))));
await writeFile(path.join(run,'package.json'),JSON.stringify({name:'provider-clean-consumer',private:true,type:'module',version:'1.0.0'}));
execFileSync('npm',['install','--ignore-scripts','--no-audit','--no-fund','--package-lock=false',...archives.map(a=>a.archive)],{cwd:run,stdio:'pipe'});
const installed=path.join(run,'node_modules');
for(const [name,providers]of Object.entries({core:[],ffmpeg:['ffmpeg'],mpv:['mpv'],combined:['ffmpeg','mpv']})){
 execFileSync('python3',['scripts/deploy-providers.py','--core',path.join(installed,'demuxe'),...providers.flatMap(p=>['--provider',path.join(installed,'@demuxe/provider-'+p)]),'--output',path.join(run,name)],{cwd:root,stdio:'pipe'});
}
const fixture=path.join(run,'copy.mkv');execFileSync('ffmpeg',['-v','error','-i',path.join(root,'fixtures/example.mp4'),'-map','0:v:0','-map','0:a:0','-c','copy',fixture],{stdio:'pipe'});
execFileSync('ffmpeg',['-v','error','-i',path.join(root,'fixtures/example.mp4'),'-map','0:v:0','-map','0:a:0','-c:v','copy','-c:a','ac3',path.join(run,'ac3.mkv')],{stdio:'pipe'});
const requests=[];let currentCase='',fault='';
const server=createServer(async(req,res)=>{
 const url=new URL(req.url,'http://localhost'),name=decodeURIComponent(url.pathname.slice(1));requests.push({case:currentCase,path:url.pathname});
 res.setHeader('Cross-Origin-Opener-Policy','same-origin');res.setHeader('Cross-Origin-Embedder-Policy','require-corp');
 if(!name){res.setHeader('Content-Type','text/html');res.end('<div id="host" style="width:320px;height:180px"></div>');return;}
 let file=name==='example.mp4'?path.join(root,'fixtures/example.mp4'):path.resolve(run,name);
 if(name!=='example.mp4'&&!file.startsWith(run+path.sep)){res.writeHead(400).end();return;}
 if(fault==='missing-manifest'&&name.endsWith('demuxe-providers.json')){res.writeHead(404).end();return;}
 if(fault==='module-404'&&name.endsWith('web/generated/internal/wasm-player.js')){res.writeHead(404).end();return;}
 if(fault==='declared-404'&&name.endsWith('.wasm')){res.writeHead(404).end();return;}
 try{
  if(!(await stat(file)).isFile())throw Error();let data=await readFile(file);
  if(fault==='no-webgl'&&name.endsWith('webgl-yuv-presenter.js'))data=Buffer.concat([Buffer.from("const originalGetContext=OffscreenCanvas.prototype.getContext;OffscreenCanvas.prototype.getContext=function(type,...args){return type==='webgl2'?null:originalGetContext.call(this,type,...args);};\n"),data]);
  if(fault==='bad-hash'&&name.endsWith('.wasm')){data=Buffer.from(data);data[data.length-1]^=1;}
  if(fault==='wrong-build'&&name.endsWith('demuxe-providers.json')){const m=JSON.parse(data);for(const p of m.providers)if(p.id.startsWith('mpv'))p.implementationIdentity='wrong-build';data=Buffer.from(JSON.stringify(m));}
  res.setHeader('Content-Type',/\.(?:mjs|js)$/.test(file)?'text/javascript':file.endsWith('.wasm')?'application/wasm':file.endsWith('.json')?'application/json':'application/octet-stream');res.end(data);
 }catch{res.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
const result={family,archives,run,cases:[],passed:false};
const cases=[
 {id:'core-native',deployment:'core',fixture:'example.mp4',options:{mode:'native',nativeRemux:'never'},plan:'native-direct'},
 {id:'core-missing-mpv',deployment:'core',fixture:'example.mp4',options:{mode:'software'},code:'DEPLOYMENT_UNAVAILABLE'},
 {id:'ffmpeg-remux',deployment:'ffmpeg',fixture:'copy.mkv',options:{mode:'native',nativeRemux:'always'},plan:'native-remux'},
 {id:'mpv-hybrid',deployment:'mpv',fixture:'example.mp4',options:{mode:'hybrid'},plan:'hybrid'},
 {id:'mpv-software',deployment:'mpv',fixture:'example.mp4',options:{mode:'software'},plan:'software'},
 {id:'mpv-software-rgb',deployment:'mpv',fixture:'example.mp4',options:{mode:'software',softwarePresenter:'rgb'},plan:'software'},
 {id:'mpv-software-auto-rgb-fallback',deployment:'mpv',fixture:'example.mp4',options:{mode:'software'},plan:'software',fault:'no-webgl'},
 {id:'mpv-auto-fallback',deployment:'mpv',fixture:'copy.mkv',options:{nativeRemux:'always'},plan:'hybrid'},
 {id:'combined-auto',deployment:'combined',fixture:'copy.mkv',options:{nativeRemux:'always'},plan:'native-remux'},
 {id:'combined-selected-audio',deployment:'combined',fixture:'ac3.mkv',options:{audioPlayback:'worklet'},plan:'native-video-mpv-audio'},
 {id:'mpv-prepare-preview',deployment:'mpv',fixture:'example.mp4',options:{mode:'software'},plan:'software',prepare:true,preview:true},
 {id:'missing-manifest',deployment:'core',fixture:'example.mp4',options:{mode:'native'},code:'DEPLOYMENT_UNAVAILABLE',fault:'missing-manifest'},
 {id:'wrong-build',deployment:'mpv',fixture:'example.mp4',options:{mode:'software'},code:'DEPLOYMENT_UNAVAILABLE',fault:'wrong-build'},
 {id:'module-404',deployment:'mpv',fixture:'example.mp4',options:{mode:'software'},code:'ASSET_LOAD_FAILED',fault:'module-404'},
 {id:'declared-404',deployment:'mpv',fixture:'example.mp4',options:{mode:'software'},code:'ASSET_LOAD_FAILED',fault:'declared-404'},
 {id:'bad-hash',deployment:'mpv',fixture:'example.mp4',options:{mode:'software'},code:'ASSET_LOAD_FAILED',fault:'bad-hash'},
];
try{
 browser=await (family==='firefox'?firefox:chromium).launch({headless:true,...(family==='firefox'?{}:{channel:'chrome',args:['--autoplay-policy=no-user-gesture-required']})});result.browser=browser.version();
 for(const c of cases){currentCase=c.id;fault=c.fault??'';const page=await browser.newPage();await page.goto(`http://127.0.0.1:${server.address().port}/`);
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  const sample=await page.evaluate(async c=>{
   const {Player,SoftwarePreviewProvider}=await import('/'+c.deployment+'/dist/index.js');
   const player=new Player(document.querySelector('#host'),{...c.options,assetBase:'/'+c.deployment+'/'});
   try{
    const prepared=c.prepare?await player.prepare('all'):undefined;
    const file=new File([await(await fetch('/'+c.fixture)).arrayBuffer()],c.fixture);
    await player.open(file);let preview;
    if(c.preview){
      const provider=new SoftwarePreviewProvider(()=>({file}),document,new URL('/'+c.deployment+'/',location.href));
      const frame=await provider.getFrame({time:2,width:160,signal:new AbortController().signal});
      if(!frame)throw Error('Missing software preview');const bitmap=await createImageBitmap(frame.image.blob),cv=document.createElement('canvas');cv.width=bitmap.width;cv.height=bitmap.height;const cx=cv.getContext('2d');cx.drawImage(bitmap,0,0);bitmap.close();preview={path:frame.path,nonblack:cx.getImageData(0,0,cv.width,cv.height).data.some((n,i)=>i%4!==3&&n>60)};
    }
    await player.play();
    const end=performance.now()+15000;while((player.state.currentTime??0)<0.5&&performance.now()<end)await new Promise(r=>setTimeout(r,25));
    const canvas=document.createElement('canvas');canvas.width=320;canvas.height=180;const ctx=canvas.getContext('2d');ctx.drawImage(player.surface,0,0,320,180);
    const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data;const nonblack=pixels.some((n,i)=>i%4!==3&&n>60);
    return {prepared,preview,plan:player.diagnostics.plan?.id,mode:player.mode,time:player.state.currentTime,nonblack,diagnostics:player.diagnostics};
   }catch(error){return {code:error.code,message:String(error),diagnostics:player.diagnostics};}
   finally{await player.destroy();}
  },c);
  result.cases.push({id:c.id,...sample,errors});console.log(c.id,JSON.stringify({plan:sample.plan,code:sample.code,message:sample.message,nonblack:sample.nonblack}));
  if(c.code)assert.equal(sample.code,c.code,JSON.stringify(sample));else{assert.equal(sample.plan,c.plan,JSON.stringify(sample));assert.equal(sample.nonblack,true);assert.ok(sample.time>=0.5);}
  if(c.prepare)assert.deepEqual(sample.prepared.assets.map(a=>[a.name,a.status]),[['inspector','failed'],['hybrid','ready'],['software','ready'],['font','ready']]);
  if(c.preview){assert.equal(sample.preview.path,'software');assert.equal(sample.preview.nonblack,true);}
  const paths=requests.filter(r=>r.case===c.id).map(r=>r.path);
  if(c.deployment==='core'||c.fault==='wrong-build')assert.ok(!paths.some(p=>p.endsWith('.wasm')),JSON.stringify(paths));
  if(c.deployment==='ffmpeg')assert.ok(!paths.some(p=>/engine-(hybrid|software|selective)|wasm-player/.test(p)),JSON.stringify(paths));
  if(c.id==='mpv-software-auto-rgb-fallback'){assert.ok(paths.some(p=>p.endsWith('engine-software-full/player.wasm')));assert.ok(!paths.some(p=>p.endsWith('engine-software-yuv/player.wasm')));}
  if(c.id==='combined-auto')assert.ok(!paths.some(p=>/engine-(hybrid|software|selective)/.test(p)),JSON.stringify(paths));
  await page.close();
 }
 result.passed=true;
}finally{
 if(browser)result.cleanup=await closeTestBrowser(browser,family);server.closeAllConnections();await new Promise(resolve=>server.close(resolve));result.requests=requests;await writeFile(path.join(evidence,`browser-${family}.json`),JSON.stringify(result,null,2)+'\n');
}
