// SPDX-License-Identifier: Apache-2.0
/** Fresh exact-archive consumer smoke; no performance or general format claim. */
import {chromium, firefox} from 'playwright';
import assert from 'node:assert/strict';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import {mkdtemp, mkdir, readFile, writeFile, readdir, realpath} from 'node:fs/promises';
import {writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';

const archive=path.resolve(process.env.BETA_ARCHIVE||'build/beta/demuxe-0.3.0-beta.4.tgz');
const family=process.env.BROWSER||'chrome';
const root=await realpath(await mkdtemp(path.join(os.tmpdir(),'demuxe-shaka-consumer-')));
const stamp=new Date().toISOString().replaceAll(':','-');
const output=path.resolve(process.env.SHAKA_PACKAGE_OUTPUT||`results/shaka-package/${family}-${stamp}`);
await mkdir(output,{recursive:true});
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const result={scope:'Exact-archive synthetic streaming consumer smoke; not performance or release qualification',
  family,archiveSHA256:hash(await readFile(archive)),testHarnessSHA256:hash(await readFile(import.meta.filename)),
  fixtures:{},commands:[],cases:[],passed:false};
const save=()=>writeFile(path.join(output,'result.json'),JSON.stringify(result,null,2)+'\n');
process.on('uncaughtExceptionMonitor',error=>{result.error=String(error.stack);writeFileSync(path.join(output,'result.json'),JSON.stringify(result,null,2)+'\n');});
const run=(command,args,options={})=>{result.commands.push({command,args});return execFileSync(command,args,{cwd:root,stdio:'pipe',...options});};
await writeFile(path.join(root,'package.json'),'{"private":true,"type":"module"}\n');
run('npm',['install','--offline','--ignore-scripts','--no-audit','--no-fund',archive],{env:{...process.env,npm_config_cache:path.join(root,'npm-cache')}});
await writeFile(path.join(root,'consumer.ts'),"import {Player} from 'demuxe'; const player=new Player(document.createElement('div')); void player.destroy();\n");
run(process.execPath,[path.resolve('node_modules/typescript/lib/tsc.js'),'--noEmit','--strict','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','consumer.ts']);
result.typecheck=true;
const assets=path.join(root,'node_modules/demuxe');
const manifest=JSON.parse(await readFile(path.join(assets,'release-manifest.json')));
result.sourceCommit=manifest.sourceCommit;
for(const [name,entry] of Object.entries(manifest.files))assert.equal(hash(await readFile(path.join(assets,name))),entry.sha256,name);
assert.ok(manifest.files['web/vendor/shaka-player.js']);
for(const name of ['vod-manifest.js','streaming-manifest.js','segmented-subtitles.js'])assert.equal(manifest.files['web/'+name],undefined);
run(process.execPath,[path.join(assets,'bin/demuxe.mjs'),'copy-assets',path.join(root,'copied')]);
const media=path.join(root,'media');await mkdir(media);
run('ffmpeg',['-nostdin','-v','error','-f','lavfi','-i','testsrc2=size=320x180:rate=30:duration=8','-f','lavfi','-i','sine=frequency=440:sample_rate=48000:duration=8','-c:v','libx264','-pix_fmt','yuv420p','-g','60','-keyint_min','60','-sc_threshold','0','-c:a','aac','-ac','2','-movflags','+faststart',path.join(media,'direct.mp4')]);
for(const kind of ['hls-ts','hls-fmp4','dash']){
  const folder=path.join(media,kind);await mkdir(folder);
  run('ffmpeg',['-nostdin','-v','error','-i',path.join(media,'direct.mp4'),'-map','0','-c','copy',...(kind==='dash'?['-f','dash','-seg_duration','2',path.join(folder,'index.mpd')]:['-f','hls','-hls_time','2','-hls_playlist_type','vod','-hls_segment_type',kind==='hls-ts'?'mpegts':'fmp4',path.join(folder,'index.m3u8')])]);
}
async function inventory(folder){for(const entry of await readdir(folder,{withFileTypes:true})){const file=path.join(folder,entry.name);if(entry.isDirectory())await inventory(file);else result.fixtures[path.relative(media,file)]={sha256:hash(await readFile(file))};}}
await inventory(media);await save();
const mime={'.js':'text/javascript','.mjs':'text/javascript','.wasm':'application/wasm','.mp4':'video/mp4','.m4s':'video/mp4','.ts':'video/mp2t','.m3u8':'application/vnd.apple.mpegurl','.mpd':'application/dash+xml'};
const requests=[];
const server=http.createServer(async(req,res)=>{
  for(const [name,value] of Object.entries({'Cross-Origin-Opener-Policy':'same-origin','Cross-Origin-Embedder-Policy':'require-corp','Cross-Origin-Resource-Policy':'same-origin','Cache-Control':'no-store'}))res.setHeader(name,value);
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self' blob: 'wasm-unsafe-eval' 'nonce-demuxe-smoke'; connect-src 'self'; media-src 'self' blob:; style-src 'self' 'unsafe-inline'; worker-src 'self' blob:");
  try{
    const url=new URL(req.url,'http://localhost');requests.push(url.pathname);
    if(url.pathname==='/'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><div id="host"></div><script type="module" nonce="demuxe-smoke">import {Player} from "/package/index.js";window.Player=Player;</script>');return;}
    const mount=url.pathname.startsWith('/package/')?assets:url.pathname.startsWith('/runtime/')?path.join(root,'copied'):url.pathname.startsWith('/media/')?media:null;
    if(!mount){res.writeHead(404).end();return;}
    const file=path.resolve(mount,decodeURIComponent(url.pathname.split('/').slice(2).join('/')));
    if(!file.startsWith(mount+path.sep)){res.writeHead(403).end();return;}
    const bytes=await readFile(file);res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.setHeader('Accept-Ranges','bytes');res.setHeader('ETag','"'+hash(bytes)+'"');
    const range=/^bytes=(\d+)-(\d*)$/.exec(req.headers.range||'');
    if(range){const start=Number(range[1]),end=Math.min(bytes.length-1,range[2]?Number(range[2]):bytes.length-1);if(start>end){res.writeHead(416).end();return;}res.writeHead(206,{'Content-Range':`bytes ${start}-${end}/${bytes.length}`,'Content-Length':end-start+1});res.end(bytes.subarray(start,end+1));}
    else {res.setHeader('Content-Length',bytes.length);res.end(bytes);}
  }catch(error){res.writeHead(404).end(String(error));}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${server.address().port}`;
let browser;
try{
  browser=await ({chrome:chromium,firefox})[family].launch({headless:process.env.HEADLESS==='1',...(family==='chrome'?{channel:'chrome',ignoreDefaultArgs:['--mute-audio'],args:['--autoplay-policy=no-user-gesture-required']}:{})});
  result.browser=browser.version();
  for(const name of ['native-direct','hls-ts','hls-fmp4','dash']){
    const entry={name,passed:false};result.cases.push(entry);const page=await browser.newPage();const errors=[];page.on('pageerror',error=>errors.push(String(error)));page.setDefaultTimeout(30000);const before=requests.length;
    try{
      await page.goto(origin);await page.waitForFunction(()=>window.Player);
      await page.evaluate(async name=>{window.errors=[];window.player=new Player(document.querySelector('#host'),{assetBase:'/runtime/'});player.addEventListener('error',event=>errors.push(String(event.detail?.message||event.detail)));await player.openRemote({url:location.origin+'/media/'+(name==='native-direct'?'direct.mp4':name+'/index.'+(name==='dash'?'mpd':'m3u8')),...(name==='native-direct'?{}:{format:name==='dash'?'dash':'hls',streaming:{maxBandwidth:4000000}})});await player.play();},name);
      await page.waitForFunction(()=>Number(player.properties.get('time-pos'))>.3);
      entry.diagnostics=await page.evaluate(()=>player.diagnostics);
      assert.equal(entry.diagnostics.plan.id,name==='native-direct'?'native-direct':'shaka-mse');
      await page.evaluate(()=>player.pause());const paused=await page.evaluate(()=>Number(player.properties.get('time-pos')));await page.waitForTimeout(300);assert.ok(Math.abs(await page.evaluate(()=>Number(player.properties.get('time-pos')))-paused)<.1);
      await page.evaluate(async()=>{await player.seek(3);await player.play();});await page.waitForFunction(()=>Number(player.properties.get('time-pos'))>3.2);
      await page.evaluate(()=>player.destroy());await page.waitForTimeout(250);
      assert.equal(page.workers().length,0);assert.equal(await page.locator('#host video,#host canvas,iframe').count(),0);assert.deepEqual(await page.evaluate(()=>errors),[]);assert.deepEqual(errors,[]);
      const afterDestroy=requests.length;await page.waitForTimeout(300);assert.equal(requests.length,afterDestroy,'network continued after destroy');
      entry.requests=requests.slice(before);
      if(name==='native-direct')assert.equal(entry.requests.some(url=>url.includes('shaka-player')),false,'ordinary file loaded Shaka');
      else assert.ok(entry.requests.some(url=>url==='/runtime/web/vendor/shaka-player.js'),'Shaka did not load from copied assetBase');
      entry.passed=true;console.log('PASS',name);
    }catch(error){entry.error=String(error.stack);entry.state=await page.evaluate(()=>({diagnostics:window.player?.diagnostics,errors:window.errors})).catch(()=>null);process.exitCode=1;console.error('FAIL',name,entry.error);}
    finally{await page.evaluate(()=>window.player?.destroy()).catch(()=>{});await page.close();await save();}
  }
}finally{await browser?.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));result.passed=result.cases.length===4&&result.cases.every(entry=>entry.passed);await save();console.log(output);}
