// SPDX-License-Identifier: Apache-2.0
import {firefox,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {serve} from './server.mjs';
const server=await serve();const results=[];let browser;
console.log(JSON.stringify({output:server.output}));
try{
 for(const [name,engine]of Object.entries({firefox,webkit})){
  browser=await engine.launch({headless:true});const page=await browser.newPage();await page.goto(server.origin);
  const result=await page.evaluate(async()=>(await import('/experiment/lifecycle.js')).capability());result.config.id+='-'+name;result.browser=name;result.version=await browser.version();
  assert.equal(result.supported,false);assert.equal(result.status,'pass');assert.equal(result.errors.length,3);for(const value of Object.values(result.checks))assert.equal(value,true);
  await fetch(server.origin+'/receipt',{method:'POST',body:JSON.stringify(result)});results.push(result);await browser.close();browser=undefined;
 }
 await writeFile(server.output+'/rejection-summary.json',JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify(results));
}finally{await browser?.close();await server.close();}
