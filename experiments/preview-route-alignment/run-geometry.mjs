// SPDX-License-Identifier: Apache-2.0
import {chromium} from 'playwright';
import {writeFile} from 'node:fs/promises';
import {serve} from './server.mjs';
const server=await serve();let browser;
console.log(JSON.stringify({origin:server.origin,output:server.output}));
try{
 browser=await chromium.launch({headless:true,channel:'chrome',args:['--autoplay-policy=no-user-gesture-required']});
 const page=await browser.newPage({viewport:{width:1280,height:800}});await page.goto(server.origin);
 const configs=await page.evaluate(async()=>{const {matrix}=await import('/experiment/matrix.js');return [
  ...['direct','remux','hybrid','software'].map(path=>({id:'anamorphic-'+path,path,remote:true,file:'anamorphic.mp4',expectedWidth:120,expectedHeight:90})),
  ...['jspi','asyncify'].flatMap(runtime=>['hybrid','software'].map(path=>({id:`anamorphic-${path}-${runtime}`,path,runtime,remote:true,file:'anamorphic.mp4',expectedWidth:120,expectedHeight:90}))),
  ...matrix.map(x=>({...x,id:'production-'+x.id,productionBaseline:false}))
 ];});
 const results=[];
 for(const config of configs){const result=await page.evaluate(async config=>(await import('/experiment/production.js')).runCase(config),config);await fetch(server.origin+'/receipt',{method:'POST',body:JSON.stringify(result)});const row={id:config.id,status:result.status,failure:result.failure,checks:result.checks};results.push(row);console.log(JSON.stringify(row));}
 let guards=[],maintained;
 if(process.env.PREVIEW_REVIEW==='1'){
  guards=await page.evaluate(async()=>(await import('/experiment/guards.js')).runGuards([
   {id:'guard-defer',path:'remux',policy:'defer'},
   {id:'guard-policy-snapshot',path:'remux',policy:'defer',mutatePolicy:true},
   {id:'guard-software-1080p',path:'software',file:'1080p.mp4'},
   {id:'guard-software-4k',path:'software',file:'4k.mp4'},
   {id:'guard-expired-auth',path:'remux',expire:true}
  ]));
  maintained=await page.evaluate(async()=>{const m=await import('/web/generated/maintained-preview.js'),results={sourceHashes:m.sourceHashes};for(const [name,run]of [['native',m.nativeCase],['software',m.softwareCase]])try{results[name]={status:'pass',result:await run()};}catch(e){results[name]={status:'fail',error:String(e.stack??e)};}return results;});
  await writeFile(server.output+'/maintained-browser.json',JSON.stringify(maintained,null,2)+'\n');
 }
 await writeFile(server.output+'/run.json',JSON.stringify({browser:await browser.version(),results,guards,maintained},null,2)+'\n');
 await writeFile(server.output+'/served-assets.json',JSON.stringify([...server.receipts.values()],null,2)+'\n');
 const failures=[...results,...guards].filter(row=>row.status!=='pass').map(row=>row.id);
 if(maintained)for(const name of ['native','software'])if(maintained[name].status!=='pass')failures.push('maintained-'+name);
 console.log(JSON.stringify({output:server.output,cases:results.length+guards.length,failures}));
 if(failures.length)throw Error('Browser checks failed: '+failures.join(', '));
}finally{await browser?.close();await server.close();}
