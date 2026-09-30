// SPDX-License-Identifier: Apache-2.0
// Isolated browser packet/decode probe. It is a component screen, not a real-time player CPU test.
import http from 'node:http';
import {createReadStream} from 'node:fs';
import {stat,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium,firefox,webkit} from 'playwright';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'../../..');
const fixtures=process.argv.slice(2).filter(x=>!x.startsWith('--')).map(x=>path.resolve(x));
const requested=(process.argv.find(x=>x.startsWith('--browsers='))?.split('=')[1]??'chromium,firefox,webkit').split(',');
const extensions=process.argv.includes('--extensions');
const catalog={chromium,firefox,webkit};
if(!fixtures.length)fixtures.push(path.join(root,'fixtures/example.mp4'),path.join(root,'fixtures/m0.mkv'),path.join(root,'experiments/webgpu-compute-decoder/raw/prores-proxy.mov'));
const requests=[];
const server=http.createServer(async(req,res)=>{
  res.setHeader('Cross-Origin-Opener-Policy','same-origin');res.setHeader('Cross-Origin-Embedder-Policy','require-corp');
  res.setHeader('Cross-Origin-Resource-Policy','same-origin');res.setHeader('Cache-Control','no-store');
  const url=new URL(req.url,'http://localhost');
  const file=url.pathname.startsWith('/media/')?fixtures[Number(url.pathname.split('/')[2])]:path.resolve(root,'.'+url.pathname);
  if(!file||!(file===root||file.startsWith(root+path.sep)||fixtures.includes(file))){res.writeHead(403).end();return;}
  try{const info=await stat(file);if(!info.isFile())throw Error('not file');
    let start=0,end=info.size-1,status=200;const match=/^bytes=(\d+)-(\d*)$/.exec(req.headers.range??'');
    if(match){start=Number(match[1]);end=match[2]?Math.min(end,Number(match[2])):end;status=206;res.setHeader('Content-Range',`bytes ${start}-${end}/${info.size}`);}
    if(start<0||end<start||start>=info.size){res.writeHead(416).end();return;}
    requests.push({path:url.pathname,range:req.headers.range??null,status,bytes:end-start+1});
    res.setHeader('Accept-Ranges','bytes');res.setHeader('Content-Length',end-start+1);
    res.setHeader('Content-Type',file.endsWith('.mjs')||file.endsWith('.js')?'text/javascript':file.endsWith('.html')?'text/html':'application/octet-stream');
    res.writeHead(status);createReadStream(file,{start,end}).pipe(res);
  }catch{res.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base=`http://127.0.0.1:${server.address().port}`;
const output={schema:1,scope:'component PoC; packet lookup plus finite decode, not playback',mediabunny:'1.60.0',createdAt:new Date().toISOString(),fixtures,browserVersions:{},results:[]};
for(const name of requested){
  if(!catalog[name])continue;
  let browser;
  try{browser=await catalog[name].launch({headless:true,...(name==='chromium'?{executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--autoplay-policy=no-user-gesture-required']}:{} )});
    output.browserVersions[name]=browser.version();
    const context=await browser.newContext();const page=await context.newPage();
    await page.goto(`${base}/experiments/mediabunny-investigation/benchmark/page.html`);
    await page.waitForFunction(()=>typeof globalThis.mediabunnyProbe==='function');
    for(let index=0;index<fixtures.length;index++){
      const before=requests.length;
      const result=await page.evaluate(async({url,extensions})=>globalThis.mediabunnyProbe(url,{decodePackets:90,seeks:[0.5,1,2,3],extensions}),{url:`${base}/media/${index}`,extensions});
      const traffic=requests.slice(before).filter(x=>x.path===`/media/${index}`);
      output.results.push({browser:name,fixture:fixtures[index],result,traffic,requestCount:traffic.length,bytes:traffic.reduce((a,x)=>a+x.bytes,0)});
      console.log(name,path.basename(fixtures[index]),result.errors[0]??result.decode?.error??`${result.decode?.decoded??0} frames`);
    }
    await context.close();
  }catch(error){output.results.push({browser:name,error:String(error)});console.error(name,error);}
  finally{await browser?.close();}
}
await new Promise(resolve=>server.close(resolve));
const target=path.resolve(process.argv.find(x=>x.startsWith('--out='))?.slice(6)??path.join(here,'../notes/latest-run.json'));await writeFile(target,JSON.stringify(output,null,2)+'\n');
console.log(target);
