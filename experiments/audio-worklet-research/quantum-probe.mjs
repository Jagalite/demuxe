// SPDX-License-Identifier: Apache-2.0
// API capability check only: no Demuxe playback, CPU benchmark or quality qualification.
import http from 'node:http';
import {writeFile,mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const out=process.env.OUT??'results/audio-worklet-research/quantum-capability.json';
const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html');res.end('<!doctype html><title>Audio render quantum capability</title>');});
await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
try{
 browser=await chromium.launch({channel:'chrome',headless:false,args:['--autoplay-policy=no-user-gesture-required']});const page=await browser.newPage();await page.goto(`http://127.0.0.1:${server.address().port}`);
 const result={purpose:'Confirm actual processing block sizes only; no CPU saving or playback qualification claimed',browser:browser.version(),cases:[]};
 for(const options of [{renderSizeHint:128,latencyHint:'interactive'},{renderSizeHint:512,latencyHint:'interactive'},{renderSizeHint:1024,latencyHint:'interactive'},{renderSizeHint:128,latencyHint:'playback'},{renderSizeHint:'hardware',latencyHint:'interactive'}]){
  result.cases.push(await page.evaluate(async options=>{
   const context=new AudioContext({...options,sampleRate:48000});let node,url;
   try{
    const source=`class Probe extends AudioWorkletProcessor {constructor(){super();this.blocks=[];}process(i,o){if(this.blocks.length<8){this.blocks.push({frame:currentFrame,length:o[0][0].length});if(this.blocks.length===8)this.port.postMessage(this.blocks);}return true;}}registerProcessor('probe',Probe);`;
    url=URL.createObjectURL(new Blob([source],{type:'text/javascript'}));await context.audioWorklet.addModule(url);node=new AudioWorkletNode(context,'probe',{numberOfInputs:0,numberOfOutputs:1,outputChannelCount:[2]});
    const received=new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('No worklet callbacks')),5000);node.port.onmessage=e=>{clearTimeout(timer);resolve(e.data);};});
    node.connect(context.destination);await context.resume();const blocks=await received;
    return {options,sampleRate:context.sampleRate,renderQuantumSize:context.renderQuantumSize??null,baseLatency:context.baseLatency,outputLatency:context.outputLatency,blocks};
   }catch(error){return {options,error:String(error)};}finally{node?.disconnect();node?.port.close();await context.close();if(url)URL.revokeObjectURL(url);}
  },options));
 }
 await mkdir(new URL('../../results/audio-worklet-research/',import.meta.url),{recursive:true});await writeFile(out,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
}finally{await browser?.close();await new Promise(r=>server.close(r));}
