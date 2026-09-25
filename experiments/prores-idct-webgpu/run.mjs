// SPDX-License-Identifier: Apache-2.0
// Isolated FFmpeg 9.0.2 one-block WebGPU parity and timing runner.
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFile,writeFile} from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

const here=dirname(fileURLToPath(import.meta.url));
const root=dirname(dirname(here));
const build=join(root,'build/experiments/prores-idct-webgpu');
const hash=data=>createHash('sha256').update(data).digest('hex');
const iterations=Number(process.env.ITERATIONS||150);
if (!Number.isInteger(iterations)||iterations<1)throw Error('ITERATIONS must be a positive integer');
execFileSync('python3',[join(here,'prepare.py')],{cwd:root,stdio:'inherit'});
const casesBytes=await readFile(join(build,'cases.json'));
const dataset=JSON.parse(await readFile(join(build,'dataset.json'),'utf8'));
if(hash(casesBytes)!==dataset.cases_sha256)throw Error('prepared case hash changed');
const cases=JSON.parse(casesBytes);
const shaderHash=hash(await readFile(join(here,'idct.wgsl')));
const files=new Map([
  ['/page.html',{file:'page.html',type:'text/html'}],
  ['/gpu.js',{file:'gpu.js',type:'text/javascript'}],
  ['/idct.wgsl',{file:'idct.wgsl',type:'text/plain'}],
]);
const server=http.createServer(async(req,res)=>{
  res.setHeader('Cross-Origin-Opener-Policy','same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy','require-corp');
  res.setHeader('Cross-Origin-Resource-Policy','same-origin');
  const pathname=new URL(req.url,'http://localhost').pathname;
  if(pathname==='/favicon.ico'){res.writeHead(204).end();return;}
  const entry=files.get(pathname);
  if(!entry){res.writeHead(404).end('not found');return;}
  try{
    res.setHeader('Content-Type',entry.type);
    res.setHeader('Cache-Control','no-store');
    res.end(await readFile(join(here,entry.file)));
  }catch(error){res.writeHead(500).end(String(error));}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const result={date:new Date().toISOString(),ffmpeg:'9.0.2',dataset,shaderSha256:shaderHash,
  host:{platform:os.platform(),release:os.release(),arch:os.arch(),cpu:os.cpus()[0].model},
  node:process.version,playwright:JSON.parse(await readFile(join(root,'node_modules/playwright/package.json'),'utf8')).version,
  pageErrors:[],consoleErrors:[]};
let browser;
try{
  browser=await chromium.launch({channel:'chrome',headless:process.env.HEADED!=='1'});
  result.browserVersion=browser.version();
  const page=await browser.newPage();
  page.on('pageerror',error=>result.pageErrors.push(String(error)));
  page.on('console',message=>{if(message.type()==='error')result.consoleErrors.push(message.text());});
  await page.goto(`http://127.0.0.1:${server.address().port}/page.html`);
  await page.waitForFunction(()=>typeof window.runProof==='function');
  result.gpu=await page.evaluate(([cases,iterations])=>window.runProof(cases,iterations),[cases,iterations]);
  result.passed=result.gpu.mismatches===0&&result.gpu.checkedSamples===dataset.samples&&
    !result.gpu.deviceLost&&result.gpu.validationErrors.length===0&&
    result.pageErrors.length===0&&result.consoleErrors.length===0;
  await page.close();
}catch(error){result.passed=false;result.error=String(error?.stack||error);}
finally{
  if(browser)await browser.close();
  server.closeAllConnections();
  await new Promise(resolve=>server.close(resolve));
  await writeFile(join(here,'result.json'),JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify({passed:result.passed,error:result.error,
    cases:result.gpu?.cases,samples:result.gpu?.checkedSamples,
    timing:result.gpu?.timing,adapter:result.gpu?.adapter},null,2));
  if(!result.passed)process.exitCode=1;
}
