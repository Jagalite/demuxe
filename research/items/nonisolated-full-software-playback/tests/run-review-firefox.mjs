// SPDX-License-Identifier: MIT
// Firefox was explicitly requested; Chromium runs through the T3 preview.
import {firefox} from 'playwright';
const [url]=process.argv.slice(2);if(!url)throw Error('Preview URL required');
const browser=await firefox.launch({headless:true,firefoxUserPrefs:{'media.autoplay.default':0,'media.autoplay.block-webaudio':false}});
try{
 const page=await browser.newPage();await page.goto(url);await page.waitForFunction(()=>typeof reviewCheck==='function');
 console.log(JSON.stringify({browser:browser.version()}));
 for(const modular of [false,true])for(const mode of ['software','hybrid']){
  const result=await page.evaluate(({mode,modular})=>reviewCheck('asyncify',mode,modular),{mode,modular});console.log(JSON.stringify(result));if(!result.passed)process.exitCode=1;
 }
 for(const fault of ['manifest.json','player.wasm','player.mjs']){
  const result=await page.evaluate(fault=>reviewCheck('asyncify','software',true,fault),fault);console.log(JSON.stringify(result));if(!result.passed)process.exitCode=1;
 }
}finally{await browser.close();}
