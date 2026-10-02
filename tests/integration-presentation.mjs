// SPDX-License-Identifier: Apache-2.0
import {chromium,firefox} from 'playwright';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out=`results/api-integration/presentation-${Date.now()}`;await mkdir(out,{recursive:true});
let server,browser;const checks=[];
try{
 server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,PORT:'0'},stdio:['ignore','pipe','inherit']});
 const origin=await new Promise(resolve=>server.stdout.on('data',data=>{const match=/http:\/\/127\.0\.0\.1:\d+/.exec(String(data));if(match)resolve(match[0]);}));
 browser=await(process.env.BROWSER==='firefox'?firefox:chromium).launch({headless:true,...(process.env.BROWSER==='firefox'?{}:{channel:'chrome',args:['--autoplay-policy=no-user-gesture-required']})});const page=await browser.newPage();
 await page.goto(origin+'/examples/player-element.html');await page.evaluate(async()=>{window.a=document.querySelectorAll('demuxe-player')[0];window.b=document.querySelectorAll('demuxe-player')[1];await Promise.all([a.ready,b.ready]);await a.open('/fixtures/example.mp4');window.stable=a.player.host;window.identity=a.player.state.sourceId;});
 await page.locator('demuxe-player').first().getByRole('button',{name:'Fullscreen',exact:true}).click();
 assert.equal(await page.evaluate(()=>a.player.presentation.state.fullscreen&&document.fullscreenElement===a),true);
 await page.evaluate(()=>{b.player.presentation.setFullscreenTarget(b);return a.player.presentation.exitFullscreen();});
 const result=await page.evaluate(async()=>{
  const player=a.player;let invalid;try{player.presentation.setFullscreenTarget(b);}catch(error){invalid=error.code;}
  a.style.width='320px';a.style.display='none';await new Promise(r=>requestAnimationFrame(r));a.style.display='block';await new Promise(r=>requestAnimationFrame(r));
  if(player.host!==stable||player.state.sourceId!==identity||b.player.state.sourceId!==null)throw Error('Layout or multi-instance isolation failed');
  const originalTarget=player.host.parentNode,elsewhere=document.createElement('div');document.body.append(elsewhere);elsewhere.append(player.host);let stale;try{await player.presentation.requestFullscreen();}catch(error){stale=error.code;}if(stale!=='INVALID_ARGUMENT')throw Error('Stale fullscreen target accepted');originalTarget.append(player.host);elsewhere.remove();
  const originalRequest=a.requestFullscreen;let finish;a.requestFullscreen=()=>new Promise(resolve=>finish=resolve);const pending=player.presentation.requestFullscreen().catch(error=>error.code);let changed;try{player.presentation.setFullscreenTarget(null);}catch(error){changed=error.code;}await player.presentation.exitFullscreen();finish();if(await pending!=='ABORTED'||changed!=='UNSUPPORTED_FEATURE')throw Error('Pending fullscreen retirement failed');a.requestFullscreen=originalRequest;
  const owned=a.destroy();if(!player.isDestroyed)throw Error('Owned destruction was deferred');await owned;if(stable.isConnected)throw Error('Host leaked');await b.destroy();return {invalid,ownedCleanup:true,sourceRetained:true};
 });assert.equal(result.invalid,'INVALID_ARGUMENT');checks.push({name:'IC-11/12/14/15/22 built-in fullscreen, responsive host, ownership and multiple instances',passed:true,result});
}catch(error){checks.push({passed:false,error:String(error.stack)});process.exitCode=1;}
finally{await writeFile(out+'/result.json',JSON.stringify({browser:browser?.version(),checks},null,2));await browser?.close();server?.kill();console.log(out,JSON.stringify(checks));}
