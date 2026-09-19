// SPDX-License-Identifier: Apache-2.0
import {chromium} from 'playwright';
import {spawn,execFileSync} from 'node:child_process';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const root='results/full-completion/r332';
const hash=b=>createHash('sha256').update(b).digest('hex');
function ivf(b){assert.equal(b.toString('ascii',0,4),'DKIF');let p=32;const out=[];while(p<b.length){const n=b.readUInt32LE(p),t=Number(b.readBigUInt64LE(p+4));p+=12;assert.ok(p+n<=b.length);out.push({data:b.subarray(p,p+n),timestamp:Math.round(t*1e6/24)});p+=n;}return out;}
function split(b){const m=b.at(-1);if((m&224)!==192)return [b];const count=(m&7)+1,width=((m>>3)&3)+1,index=b.length-2-count*width;if(index<0||b[index]!==m)throw Error('Invalid superframe marker');let p=index+1,offset=0;const out=[];for(let j=0;j<count;j++){let n=0;for(let k=0;k<width;k++)n+=b[p++]*2**(8*k);if(n<=0||offset+n>index)throw Error('Invalid superframe size');out.push(b.subarray(offset,offset+n));offset+=n;}if(offset!==index)throw Error('Unclaimed superframe payload');return out;}
const bytes=await readFile(root+'/altref.ivf'),packets=ivf(bytes),components=packets.flatMap(p=>split(p.data));
assert.deepEqual(components.map(hash),(await readFile(root+'/split-reference.sha256','utf8')).split('\n').filter(l=>l&&!l.startsWith('#')).map(l=>l.split(',').at(-1).trim()));
const superframe=packets.find(p=>split(p.data).length>1).data;
const m=superframe.at(-1),index=superframe.length-2-(1+(m&7))*(1+((m>>3)&3));
const corrupt=Buffer.from(superframe);corrupt.fill(255,index+1,index+1+1+((m>>3)&3));assert.throws(()=>split(corrupt),/size/);
const badMarker=Buffer.from(superframe);badMarker[index]^=1;assert.throws(()=>split(badMarker),/marker/);
assert.throws(()=>split(superframe.subarray(superframe.length-2)),/marker/);
const frameBytes=160*96*3/2,raw=await readFile(root+'/oracle.yuv'),oracle=[];for(let p=0;p<raw.length;p+=frameBytes)oracle.push(hash(raw.subarray(p,p+frameBytes)));
const result={scope:'Actual maintained decoder worker; aggregate versus split packet framing. Synthetic VP9 profile0/8-bit, no audio, 160x96 24fps. Not full player/compositor qualification.',fixtureSHA256:hash(bytes),workerSHA256:hash(await readFile('web/retained-decoder-worker.js')),ffmpeg:execFileSync('ffmpeg',['-version'],{encoding:'utf8'}).split('\n')[0],packets:packets.length,components:components.length,superframes:packets.filter(p=>split(p.data).length>1).length,hidden:components.filter(b=>!(b[0]&8)&&!(b[0]&2)).length,oracleFrames:oracle.length,componentIdentityMatchesFFmpeg:true,parserAdverseControls:3,cases:[]};
const server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,PORT:'0'},stdio:['ignore','pipe','inherit']});let browser;
try{
 const origin=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Server timeout')),10000);server.stdout.on('data',b=>{const m=String(b).match(/http:\/\/127\.0\.0\.1:\d+/);if(m){clearTimeout(timer);resolve(m[0]);}});});
 browser=await chromium.launch({channel:'chrome',headless:true});result.browser=browser.version();const page=await browser.newPage();await page.goto(origin+'/examples/custom-controls.html');
 for(const [name,source,dropHidden] of [['aggregate',packets,false],['split',packets,false],['split-seek-key24',packets.slice(24),false],['split-missing-hidden',packets,true],['dependent-cold-start',packets.slice(2),false]]){
  const splitMode=name.startsWith('split');const input=source.flatMap(p=>(splitMode?split(p.data):[p.data]).filter(b=>!dropHidden||(b[0]&8)||(b[0]&2)).map(b=>({bytes:[...b],timestamp:p.timestamp,key:!(b[0]&4),duration:((b[0]&8)||(b[0]&2))?41667:0})));
  const run=await page.evaluate(async input=>{
   const memory=new SharedArrayBuffer(80+8*1024*1024+16),h=new Int32Array(memory,0,16),v=new DataView(memory),out=[],errors=[],stats=[];let serial=0,ready=false;
   const w=new Worker('/web/retained-decoder-worker.js',{type:'module'});
   w.onmessage=({data})=>{if(data.ready)ready=true;if(data.error)errors.push(data.error);if(data.stats)stats.push(data.stats);if(data.retainedFrame){const f=data.retainedFrame;const stamp=f.timestamp,duration=f.duration;out.push((async()=>{try{if(f.format!=='I420')throw Error('Oracle needs native I420, got '+f.format);const b=new Uint8Array(160*96*3/2);await f.copyTo(b,{layout:[{offset:0,stride:160},{offset:15360,stride:80},{offset:19200,stride:80}]});const digest=await crypto.subtle.digest('SHA-256',b);return {timestamp:stamp,duration,hash:[...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('')};}finally{f.close();}})());}};
   const pause=()=>new Promise(r=>setTimeout(r,1));
   const wait=async fn=>{const end=performance.now()+5000;while(!fn()){if(performance.now()>end)throw Error('Worker deadline');await pause();}};
   const request=async op=>{h[2]=op;const ticket=++serial*4+1;Atomics.store(h,0,ticket);Atomics.notify(h,0);await wait(()=>Atomics.load(h,0)===ticket+1);return h[3];};
   let failed=null,eof=false;
   try{
    w.postMessage({memory,pointer:0});await wait(()=>ready);h[4]=0;h[5]=160;h[6]=96;h[13]=4;h[14]=0;h[15]=10;h[8]=8;if(await request(1)!==0)throw Error('Configuration rejected');
    for(const p of input){
     let code;
     for(let retry=0;retry<5000;retry++){
      h[4]=p.bytes.length;h[7]=+p.key;v.setFloat64(64,p.timestamp,true);v.setFloat64(72,p.duration,true);new Uint8Array(memory,80,p.bytes.length).set(p.bytes);code=await request(2);if(code!==-6)break;
      await request(4);await pause();
     }
     if(code!==0)throw Error('Decode submit '+code);
     for(let j=0;j<32;j++){const c=await request(4);if(c===-29)throw Error('Receive rejected');if(c!==1)break;}
    }
    if(await request(3)!==0)throw Error('Drain rejected');
    for(let j=0;j<5000;j++){const c=await request(4);if(c===-541478725){eof=true;break;}if(c===-29)throw Error('Drain receive rejected');await pause();}
    if(!eof)throw Error('EOF deadline');
   }catch(e){failed=String(e);}
   finally{w.postMessage({type:'cancel'});await pause();w.terminate();}
   return {frames:await Promise.all(out),errors,failed,eof,stats:stats.at(-1),terminated:true};
  },input);
  const expected=name==='split-seek-key24'?oracle.slice(24):oracle;run.name=name;run.expectedFrames=expected.length;run.exact=JSON.stringify(run.frames.map(f=>f.hash))===JSON.stringify(expected);run.visibleTimestampsExact=run.frames.every((f,i)=>f.timestamp===Math.round((i+(name==='split-seek-key24'?24:0))*1e6/24));result.cases.push(run);
 }
 for(const name of ['aggregate','split','split-seek-key24']){const run=result.cases.find(r=>r.name===name);assert.equal(run.failed,null,JSON.stringify(run));assert.ok(run.exact,name+' exact decoded pixels');assert.ok(run.visibleTimestampsExact,name+' visible timestamps');assert.ok(run.eof);}
 assert.equal(result.cases.find(r=>r.name==='split-missing-hidden').exact,false,'hidden pictures must affect oracle');assert.ok(result.cases.find(r=>r.name==='dependent-cold-start').failed,'cold dependent frame must reject');
 await page.evaluate(()=>player.destroy());await page.waitForTimeout(100);assert.equal(page.workers().length,0);result.cleanup=true;result.passed=true;
}catch(e){result.error=String(e.stack);process.exitCode=1;}
finally{await browser?.close();server.kill();await writeFile(root+'/result.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({...result,cases:result.cases.map(({frames,...r})=>({...r,frameCount:frames.length}))},null,2));}
