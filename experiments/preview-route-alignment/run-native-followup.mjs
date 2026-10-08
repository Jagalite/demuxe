// SPDX-License-Identifier: Apache-2.0
import {chromium} from 'playwright';
import {writeFile} from 'node:fs/promises';
import {serve} from './server.mjs';
const server=await serve();let browser;
console.log(JSON.stringify({origin:server.origin,output:server.output}));
try{
 browser=await chromium.launch({headless:true,channel:'chrome',args:['--autoplay-policy=no-user-gesture-required']});
 const page=await browser.newPage({viewport:{width:1280,height:800}});await page.goto(server.origin);
 const control=await page.evaluate(async()=>(await import('/experiment/control-native.js')).control({id:'control-anamorphic-direct',path:'direct',file:'anamorphic.mp4'}));
 const result=await page.evaluate(async()=>(await import('/experiment/production.js')).runCase({id:'anamorphic-direct-rerun',path:'direct',file:'anamorphic.mp4',remote:true,expectedWidth:120,expectedHeight:90}));
 await fetch(server.origin+'/receipt',{method:'POST',body:JSON.stringify(result)});
 const summary={browser:await browser.version(),control:{status:control.status,pace:control.pace,failure:control.failure},rerun:{status:result.status,failure:result.failure,checks:result.checks}};
 await writeFile(server.output+'/followup.json',JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify(summary));
}finally{await browser?.close();await server.close();}
