// SPDX-License-Identifier: Apache-2.0
// Replay captured seek fragments in fresh MediaSources. Diagnostic only.
import {readFile,writeFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {createHash} from 'node:crypto';
import {chromium,firefox} from 'playwright';
import {closeTestBrowser,closeBrowserObserved} from './head-to-head/browser-exit.mjs';
const directory=process.env.DEMUXE_CAPTURE_DIR,receiptPath=process.env.DEMUXE_REPLAY_RECEIPT;
if(!directory||!receiptPath)throw Error('Set DEMUXE_CAPTURE_DIR and DEMUXE_REPLAY_RECEIPT');
const events=JSON.parse(await readFile(directory+'/events.json'));
const appends=events.filter(e=>e.type==='append'&&e.buffer===2).sort((a,b)=>a.serial-b.serial);
if(!appends.length||appends.some((e,i)=>e.serial!==i+1||e.mime!==appends[0].mime))throw Error('Invalid capture');
const sha=b=>createHash('sha256').update(b).digest('hex');
const fragments=await Promise.all(appends.map(async e=>{const data=await readFile(`${directory}/2-${e.serial}.bin`);if(data.length!==e.bytes)throw Error('Fragment length mismatch');return data;}));
const requests=[];const server=createServer((req,res)=>{const name=new URL(req.url,'http://localhost').pathname;if(name==='/'){res.setHeader('Content-Type','text/html');res.end('<video></video>');return;}const m=name.match(/^\/fragment\/(\d+)$/),index=m?Number(m[1])-1:-1;if(index<0||index>=fragments.length){res.writeHead(404).end();return;}requests.push(index);res.setHeader('Content-Type','application/octet-stream');res.end(fragments[index]);});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const output={scope:'isolated MSE replay of exact captured HEVC/FLAC seek appends; not release qualification',harnessSHA256:sha(await readFile(new URL(import.meta.url))),captureEventsSHA256:sha(await readFile(directory+'/events.json')),fragmentSHA256:fragments.map(sha),joinedSHA256:sha(Buffer.concat(fragments)),mime:appends[0].mime,runs:[]};
try{
 for(const family of ['chrome','firefox']){
  let browser,serverProcess;try{
   if(family==='chrome')browser=await chromium.launch({channel:'chrome',headless:true});
   else{serverProcess=await firefox.launchServer({headless:true});browser=await firefox.connect(serverProcess.wsEndpoint());}
   for(const offset of [0,-2]){
    const page=await browser.newPage();await page.goto(`http://127.0.0.1:${server.address().port}/`);
    const result=await page.evaluate(async ({mime,count,offset})=>{
     const video=document.querySelector('video'),media=new MediaSource();video.src=URL.createObjectURL(media);
     await new Promise((resolve,reject)=>{media.addEventListener('sourceopen',resolve,{once:true});media.addEventListener('error',reject,{once:true});});
     media.duration=37;const sb=media.addSourceBuffer(mime);sb.mode='segments';sb.timestampOffset=offset;const ranges=[];
     for(let i=1;i<=count;i++){
      const data=await (await fetch('/fragment/'+i)).arrayBuffer();
      await new Promise((resolve,reject)=>{sb.addEventListener('updateend',resolve,{once:true});sb.addEventListener('error',()=>reject(Error('SourceBuffer error')),{once:true});sb.appendBuffer(data);});
      ranges.push(Array.from({length:sb.buffered.length},(_,j)=>[sb.buffered.start(j),sb.buffered.end(j)]));
     }
     return {supported:MediaSource.isTypeSupported(mime),ranges,videoError:video.error?.code??null,mediaReadyState:media.readyState};
    },{mime:appends[0].mime,count:fragments.length,offset});
    output.runs.push({family,browser:browser.version(),offset,...result});await page.close();
   }
  }finally{if(browser){const cleanup=serverProcess?await closeBrowserObserved({close:()=>serverProcess.close()},[serverProcess.process().pid],{attempts:450}):await closeTestBrowser(browser,family,{attempts:450});output.runs.at(-1).cleanup=cleanup;}}
 }
}catch(error){output.error=String(error.stack);process.exitCode=1;}
finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));output.requests=requests;await writeFile(receiptPath,JSON.stringify(output,null,2)+'\n');}
