// SPDX-License-Identifier: Apache-2.0
// Preloaded by the suite runner, including for older browser harnesses.
import {writeFileSync} from 'node:fs';
if(!['chromium','chrome','firefox'].includes(process.env.BROWSER??'chromium'))throw Error('Unsupported browser family for API guard: '+process.env.BROWSER);
const {chromium,firefox}=await import('playwright');
const errors=[],seen=new WeakSet();let pages=0,launches=0;
function observe(page){if(seen.has(page))return;seen.add(page);pages++;page.on('pageerror',error=>errors.push(String(error.stack)));page.on('crash',()=>errors.push('Browser page crashed'));}
for(const [family,type]of [['chromium',chromium],['firefox',firefox]]){
  const launch=type.launch.bind(type);
  type.launch=async options=>{
    const requested=process.env.BROWSER==='firefox'?'firefox':'chromium';
    if(family!==requested)throw Error(`Harness launched ${family}, matrix requires ${requested}`);
    const configured={...options};
    if(family==='chromium'){
      if(process.env.BROWSER!=='chrome')delete configured.channel;
      configured.args=[...(configured.args??[]),'--autoplay-policy=no-user-gesture-required'];
    }else configured.firefoxUserPrefs={...configured.firefoxUserPrefs,'media.autoplay.default':0};
    const browser=await launch(configured);launches++;
    const newContext=browser.newContext.bind(browser),newPage=browser.newPage.bind(browser);
    browser.newContext=async(...args)=>{const context=await newContext(...args);context.on('page',observe);return context;};
    browser.newPage=async(...args)=>{const page=await newPage(...args);observe(page);return page;};
    return browser;
  };
}
process.on('exit',()=>{
  if(!launches||!pages)errors.push('No browser pages exercised');
  if(errors.length){process.exitCode=1;console.error('API browser guard:',JSON.stringify(errors));}
  writeFileSync(process.env.API_GUARD_REPORT,JSON.stringify({launches,pages,errors},null,2)+'\n');
});
