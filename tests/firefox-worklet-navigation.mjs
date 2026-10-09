// SPDX-License-Identifier: Apache-2.0
// Isolate the production AudioWorklet from every playback engine and iframe.
import {firefox} from 'playwright';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const root=resolve('.'),out='results/firefox-worklet-navigation';await mkdir(out,{recursive:true});
const html=`<!doctype html><button id="start">Start</button><script>
window.ready=null;document.querySelector('button').onclick=()=>window.ready=(async()=>{
 for(let iteration=0;iteration<3;iteration++){
  const context=new AudioContext({sampleRate:48000}),buffer=new SharedArrayBuffer(64+8192*2*4);
  const header=new Int32Array(buffer,0,16);Atomics.store(header,2,1);
  await context.audioWorklet.addModule('/web/audio-worklet.js');
  const node=new AudioWorkletNode(context,'demuxe-pcm',{numberOfInputs:0,numberOfOutputs:1,outputChannelCount:[2],processorOptions:{buffer,capacity:8192,channels:2}});
  node.connect(context.destination);await context.resume();
  await new Promise(resolve=>setTimeout(resolve,30));
  if(iteration<2){node.port.postMessage('close');node.disconnect();node.port.close();await context.close();}
  else{window.activeContext=context;window.activeNode=node;}
 }
})();
</script>`;
const server=createServer(async(req,res)=>{res.setHeader('Cross-Origin-Opener-Policy','same-origin');res.setHeader('Cross-Origin-Embedder-Policy','require-corp');try{if(req.url==='/'){res.setHeader('Content-Type','text/html');res.end(html);}else if(req.url.startsWith('/web/')&&!req.url.includes('..')){res.setHeader('Content-Type','application/javascript');res.end(await readFile(root+req.url));}else{res.statusCode=404;res.end();}}catch(error){res.statusCode=500;res.end(String(error));}});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port,report={scope:'Actual production worklet, no Demuxe player, iframe, Wasm, or decoder',cycles:[],events:[],passed:false};let browser;
const save=()=>writeFile(out+'/result.json',JSON.stringify(report,null,2)+'\n');
try{browser=await firefox.launch({headless:true,firefoxUserPrefs:{'media.autoplay.default':0}});report.browser=browser.version();const page=await browser.newPage();page.on('crash',()=>report.events.push('crash'));page.on('pageerror',error=>report.events.push(String(error)));
for(let cycle=0;cycle<80;cycle++){const row={cycle,passed:false};report.cycles.push(row);await save();await page.goto(origin);await page.locator('button').click();await page.evaluate(()=>ready);await page.screenshot({path:out+'/latest.png'});row.passed=true;console.log('PASS isolated worklet navigation',cycle);await save();}
await page.evaluate(async()=>{activeNode.port.postMessage('close');activeNode.disconnect();activeNode.port.close();await activeContext.close();});report.passed=report.events.length===0;if(!report.passed)process.exitCode=1;
}catch(error){report.error=String(error.stack);process.exitCode=1;}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));await save();}
