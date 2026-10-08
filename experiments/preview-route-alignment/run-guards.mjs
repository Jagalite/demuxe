// SPDX-License-Identifier: Apache-2.0
const {firefox,webkit}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
import {serve} from './server.mjs';
import {writeFile} from 'node:fs/promises';
const server=await serve();let browser;console.log(JSON.stringify({output:server.output}));
try{
 const name=process.env.BROWSER??'webkit';browser=await {firefox,webkit}[name].launch({headless:true});const page=await browser.newPage();await page.exposeBinding('previewGesture',async({page},id)=>{await page.locator('[data-preview-gesture=\"'+id+'\"]').click();});await page.goto(server.origin);
 const configs=[{id:'guard-defer',path:'remux',policy:'defer'},{id:'guard-policy-snapshot',path:'remux',policy:'defer',mutatePolicy:true},{id:'guard-software-1080p',path:'software',file:'1080p.mp4'},{id:'guard-software-4k',path:'software',file:'4k.mp4'},{id:'guard-expired-auth',path:'remux',expire:true}];
 const batches=process.env.ISOLATED==='1'?configs.map(c=>[c]):[configs],results=[];
 for(const batch of batches)results.push(...await page.evaluate(async c=>(await import('/experiment/guards.js')).runGuards(c),batch));
 await writeFile(server.output+'/run.json',JSON.stringify({browser:name,version:await browser.version(),results},null,2)+'\n');
}finally{await browser?.close();await server.close();}
