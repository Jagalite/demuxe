import {chromium,firefox} from 'playwright';
import http from 'node:http';
import {spawn} from 'node:child_process';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const family=process.env.BROWSER||'chrome',out=`results/hybrid-startup/${family}-${new Date().toISOString().replaceAll(':','-')}`;
await mkdir(out,{recursive:true});console.log(out);
const worker=await readFile('web/retained-decoder-worker.js','utf8'),fixture=await readFile('fixtures/example.mp4');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const record={family,workerSHA256:hash(worker),fixtureSHA256:hash(fixture),scope:'Controlled Hybrid startup with real WebCodecs and test-only first-packet delay; not the reported user file',checks:[]};
const server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,PORT:'0'},stdio:['ignore','pipe','inherit']});
let browser;
try{
 const origin=await new Promise((resolve,reject)=>{server.once('error',reject);server.stdout.on('data',d=>{const m=/http:\/\/127\.0\.0\.1:\d+/.exec(String(d));if(m)resolve(m[0]);});});
 browser=await(family==='firefox'?firefox:chromium).launch({headless:true,...(family==='chrome'?{channel:'chrome',args:['--autoplay-policy=no-user-gesture-required']}:{})});record.browser=browser.version();
 for(const delay of [0,4000]){
  const context=await browser.newContext(),page=await context.newPage();const errors=[];page.on('pageerror',error=>errors.push(String(error)));let injected=false;
  // Intercept on the server: browser routing does not reliably see nested workers.
  const proxy=http.createServer(async(req,res)=>{try{
   const response=await fetch(origin+req.url);let body=Buffer.from(await response.arrayBuffer());
   if(delay&&new URL(req.url,origin).pathname==='/web/retained-decoder-worker.js'){
    const needle='   if(operation===2){';assert.ok(worker.includes(needle));injected=true;
    body=Buffer.from(worker.replace(needle,needle+`\n    if(stats.submitted===0)await new Promise(resolve=>setTimeout(resolve,${delay}));`));
   }
   const headers=Object.fromEntries(response.headers);delete headers['content-encoding'];headers['content-length']=String(body.length);res.writeHead(response.status,headers);res.end(body);
  }catch(error){res.writeHead(500);res.end(String(error));}});
  await new Promise(resolve=>proxy.listen(0,'127.0.0.1',resolve));const testOrigin=`http://127.0.0.1:${proxy.address().port}`;
  try{
   await page.goto(testOrigin+'/');await page.waitForFunction(()=>window.player);
   await page.evaluate(async()=>{window.startupErrors=[];player.addEventListener('error',e=>startupErrors.push(e.detail));await player.setMode('hybrid');const file=new File([await(await fetch('/fixtures/example.mp4')).arrayBuffer()],'example.mp4',{type:'video/mp4'});await document.querySelector('deplexr-player').open(file);});
   await page.getByRole('button',{name:'Play',exact:true}).click();await page.waitForFunction(()=>player.state.currentTime>.4&&player.state.status==='playing');
   await page.evaluate(()=>player.seek(3));await page.waitForFunction(()=>player.state.currentTime>=3&&!player.state.pendingOperation);
   const result=await page.evaluate(()=>({mode:player.mode,errors:startupErrors,diagnostics:player.diagnostics}));assert.equal(result.mode,'hybrid');assert.deepEqual(result.errors,[]);assert.deepEqual(errors,[]);assert.equal(injected,delay>0);
   await page.evaluate(()=>document.querySelector('deplexr-player').destroy());await page.waitForFunction(()=>!document.querySelector('deplexr-player').player);assert.equal(page.workers().length,0);
   record.checks.push({delayMs:delay,passed:true,...result});console.log('PASS Hybrid startup, seek and cleanup; first packet delay',delay);
  }catch(error){record.checks.push({delayMs:delay,passed:false,error:String(error.stack)});throw error;}finally{await context.close();proxy.closeAllConnections();await new Promise(resolve=>proxy.close(resolve));}
 }
}finally{await browser?.close();server.kill();await writeFile(out+'/result.json',JSON.stringify(record,null,2)+'\n');}
