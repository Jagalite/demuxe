// SPDX-License-Identifier: Apache-2.0
import {chromium} from 'playwright';
import {spawn,execFileSync} from 'node:child_process';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const out='results/full-completion/continuity',fixture=out+'/green-ordered.webm',forced=process.env.FORCE_WEBM==='1',capturePath=out+(forced?'/maintained-webm.webm':'/maintained-mp4.mp4');
const result={forcedWebMPackaging:forced,scope:'Current maintained forced Native remux, actual Wasm worker and MSE; captured output retains packet and final sample semantics.'};
const server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,PORT:'0'},stdio:['ignore','pipe','inherit']});let browser;
try{
 const origin=await new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(Error('Server timeout')),10000);server.stdout.on('data',b=>{const m=String(b).match(/http:\/\/127\.0\.0\.1:\d+/);if(m){clearTimeout(t);resolve(m[0]);}});});
 browser=await chromium.launch({channel:'chrome',headless:true});result.browser=browser.version();const page=await browser.newPage();page.setDefaultTimeout(12000);await page.goto(origin+'/examples/custom-controls.html');
 await page.evaluate(async forced=>{await player.destroy();if(forced){const supported=MediaSource.isTypeSupported.bind(MediaSource);MediaSource.isTypeSupported=t=>t.startsWith('video/mp4')&&t.includes('vp09')?false:supported(t);}const {Player}=await import('/web/generated/index.js');window.player=new Player(document.querySelector('#surface'),{mode:'native',nativeRemux:'always'});window.captures=[];window.errors=[];player.addEventListener('error',e=>errors.push(e.detail));const append=SourceBuffer.prototype.appendBuffer;SourceBuffer.prototype.appendBuffer=function(b){captures.push(new Uint8Array(b.buffer??b,b.byteOffset??0,b.byteLength).slice());return append.call(this,b);};const input=document.createElement('input');input.type='file';input.id='probe-file';document.body.append(input);},forced);
 await page.locator('#probe-file').setInputFiles(fixture);await page.evaluate(()=>player.open(document.querySelector('#probe-file').files[0]));await page.evaluate(()=>player.play());await page.waitForFunction(()=>player.state.currentTime>.25);
 await page.waitForFunction(()=>{const r=player.current.backend.remux;return r.eof&&!r.pending&&!r.busy&&!r.sb.updating;});
 result.diagnostics=await page.evaluate(()=>player.diagnostics);assert.equal(result.diagnostics.plan.id,'native-remux');const capture=await page.evaluate(()=>captures.map(b=>[...b]));result.appendSizes=capture.map(a=>a.length);const output=Buffer.concat(capture.map(a=>Buffer.from(a)));await writeFile(capturePath,output);result.captureSHA256=createHash('sha256').update(output).digest('hex');result.inputSHA256=createHash('sha256').update(await readFile(fixture)).digest('hex');
 const packets=p=>JSON.parse(execFileSync('ffprobe',['-v','error','-show_packets','-show_data_hash','sha256','-of','json',p])).packets;
 const before=packets(fixture),after=packets(capturePath);result.packetChecks=[];for(const type of ['video','audio']){const a=before.filter(p=>p.codec_type===type),b=after.filter(p=>p.codec_type===type);assert.deepEqual(a.map(p=>p.data_hash),b.map(p=>p.data_hash));result.packetChecks.push({type,count:a.length,exact:true,lastInputSideData:a.at(-1).side_data_list,lastOutputSideData:b.at(-1).side_data_list});}
 await page.evaluate(()=>player.seek(1.25));await page.waitForFunction(()=>player.state.currentTime>=1.25);result.seek=true;result.errors=await page.evaluate(()=>errors);assert.deepEqual(result.errors,[]);await page.evaluate(()=>player.destroy());await page.waitForTimeout(100);assert.equal(page.workers().length,0);result.cleanup=true;result.passed=true;
}catch(e){result.error=String(e.stack);process.exitCode=1;}
finally{await browser?.close();server.kill();await writeFile(out+(forced?'/maintained-webm-result.json':'/maintained-result.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({passed:result.passed,error:result.error,appendSizes:result.appendSizes,packets:result.packetChecks},null,2));}
