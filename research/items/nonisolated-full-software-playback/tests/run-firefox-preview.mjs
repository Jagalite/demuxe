// SPDX-License-Identifier: MIT
// Firefox-only qualification for the agreed browser matrix. Chromium uses T3 preview.
import {firefox} from 'playwright';
const [url,kind='public']=process.argv.slice(2);if(!url)throw Error('Preview server URL required');
const browser=await firefox.launch({headless:true,firefoxUserPrefs:{'media.autoplay.default':0,'media.autoplay.block-webaudio':false}});
try{
 const entry={public:'publicCheck','public-track':'trackCheck','hybrid-rejection':'publicHybridRejectionCheck',feature:'featureCheck','public-feature':'publicFeatureCheck',subtitle:'subtitleCheck',font:'fontCheck'}[kind];if(!entry)throw Error('Unknown qualification kind');
 const page=await browser.newPage();await page.goto(url);await page.waitForFunction(name=>typeof window[name]==='function',entry);
 console.log(JSON.stringify({browser:browser.version(),url,kind}));
 const keyed=['public','subtitle','hybrid-rejection','public-track'].includes(kind);const profiles=keyed?await page.evaluate(async()=>await(await fetch('/profiles')).json()):[null];
 for(const mode of (kind==='hybrid-rejection'?['hybrid']:(process.env.PLAYBACK_MODES??'software,hybrid').split(',')))for(const profile of profiles){
  const result=await page.evaluate(async({entry,keyed,mode,key,kind})=>kind==='public-track'?await window[entry](key,'asyncify',mode,'stereo',true):keyed?await window[entry](key,'asyncify',mode):await window[entry]('asyncify',mode),{entry,keyed,mode,key:profile?.key,kind});
  console.log(JSON.stringify({key:result.key,mode,passed:result.passed,error:result.error}));if(!result.passed)process.exitCode=1;
 }
}finally{await browser.close();}
