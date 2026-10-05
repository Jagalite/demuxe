// SPDX-License-Identifier: Apache-2.0
import {chromium,firefox,webkit} from 'playwright';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import {closeTestBrowser} from './head-to-head/browser-exit.mjs';
const family=process.env.BROWSER||'chrome';
if(!['chrome','chromium','firefox','webkit'].includes(family))throw Error(`Unsupported BROWSER: ${family}`);
const server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,PORT:'0'},stdio:['ignore','pipe','inherit']});
let browser;
try{
 const origin=await new Promise((resolve,reject)=>{server.once('error',reject);server.stdout.on('data',data=>{const match=/http:\/\/127\.0\.0\.1:\d+/.exec(String(data));if(match)resolve(match[0]);});});
 browser=await(family==='firefox'?firefox:family==='webkit'?webkit:chromium).launch({headless:true,...(family==='chrome'?{channel:'chrome'}:{})});
 const page=await browser.newPage();const errors=[];page.on('pageerror',error=>errors.push(String(error)));
 await page.goto(origin+'/');await page.waitForFunction(()=>window.player);
 await page.evaluate(async()=>{window.viewer=document.querySelector('demuxe-player');viewer.autoplay=false;document.body.tabIndex=-1;await viewer.open(location.origin+'/fixtures/example.mp4');await player.setVolume(.5);});
 const outside=()=>page.locator('body').focus();
 await outside();await page.keyboard.press('ArrowDown');await page.waitForFunction(()=>player.state.volume===.45);
 assert.equal(await page.evaluate(()=>document.activeElement===document.body),true);
 await page.keyboard.press('ArrowRight');await page.waitForFunction(()=>!player.state.pendingOperation&&Math.abs(player.state.currentTime-5)<.15);
 await page.keyboard.press(']');await page.waitForFunction(()=>player.state.playbackRate===1.25);
 await page.keyboard.press('m');await page.waitForFunction(()=>player.state.muted);
 await page.keyboard.press('k');await page.waitForFunction(()=>player.state.playbackIntent==='play');
 await outside();await page.keyboard.press('Space');await page.waitForFunction(()=>player.state.playbackIntent==='pause');
 console.log('PASS page shortcuts control playback, seek, volume, mute and rate with focus outside');
 await page.locator('demuxe-player #stage').focus();await page.keyboard.press('ArrowDown');await page.waitForFunction(()=>player.state.volume===.4);
 assert.equal(await page.evaluate(()=>player.state.volume),.4);
 console.log('PASS focused player shortcuts are handled once');
 for(const focused of [false,true]){
   await page.evaluate(async()=>{await player.seek(2);await player.play();viewer.dispatchEvent(new PointerEvent('pointermove',{pointerType:'mouse',bubbles:true}));});
   if(focused)await page.locator('demuxe-player #stage').focus();else await outside();
   await page.keyboard.press('ArrowRight');
   await page.waitForFunction(()=>!player.state.pendingOperation&&player.state.currentTime>=7);
   await page.waitForTimeout(300);
   assert.deepEqual(await page.evaluate(()=>{const $=id=>viewer.shadowRoot.getElementById(id);return {idle:$('shell').classList.contains('idle'),timeline:$('shell').classList.contains('seek-preview'),transport:getComputedStyle($('transport')).opacity,topbar:getComputedStyle($('topbar')).opacity};}),{idle:true,timeline:true,transport:'0',topbar:'0'});
   await page.evaluate(()=>player.pause());
   await page.keyboard.press('ArrowLeft');
   await page.waitForFunction(()=>!player.state.pendingOperation&&player.state.currentTime<4);
   await page.waitForTimeout(300);
   assert.deepEqual(await page.evaluate(()=>{const $=id=>viewer.shadowRoot.getElementById(id);return {intent:player.state.playbackIntent,idle:$('shell').classList.contains('idle'),transport:getComputedStyle($('transport')).opacity,topbar:getComputedStyle($('topbar')).opacity};}),{intent:'pause',idle:false,transport:'1',topbar:'1'});
 }
 console.log('PASS arrow seeking hides visible transport and topbar during playback, and keeps them visible while paused, with page or player focus');
 const ignored=await page.evaluate(()=>{
   let forwarded=0;const count=()=>forwarded++;viewer.addEventListener('keydown',count);
   const send=(target,key='m',extra={})=>{const event=new KeyboardEvent('keydown',{key,bubbles:true,composed:true,cancelable:true,...extra});target.dispatchEvent(event);return event.defaultPrevented;};
   const prevented=[];
   for(const markup of ['<input>','<textarea></textarea>','<select><option>A</option></select>','<input type="range">','<button>Button</button>','<a href="#">Link</a>','<div contenteditable="true"><span>Text</span></div>','<div role="slider" tabindex="0"></div>']){
     const holder=document.createElement('div');holder.innerHTML=markup;document.body.append(holder);prevented.push(send(holder.querySelector('span')||holder.firstElementChild));holder.remove();
   }
   for(const extra of [{ctrlKey:true},{metaKey:true},{altKey:true},{isComposing:true}])prevented.push(send(document.body,'m',extra));
   const cancel=event=>event.preventDefault();document.addEventListener('keydown',cancel,{once:true});send(document.body);
   viewer.shadowRoot.getElementById('settings-toggle').click();prevented.push(send(document.body));viewer.shadowRoot.getElementById('settings-close').click();
   const dialog=document.createElement('dialog');document.body.append(dialog);dialog.showModal();prevented.push(send(document.body));dialog.close();dialog.remove();
   prevented.push(send(document.body,'x'));
   viewer.removeEventListener('keydown',count);return {forwarded,prevented};
 });
 assert.equal(ignored.forwarded,0);assert.ok(ignored.prevented.every(value=>!value));
 console.log('PASS forms, editable content, buttons, links, menus, dialogs, modifiers and handled events stay untouched');
 await outside();await page.keyboard.press('?');assert.equal(await page.locator('demuxe-player #settings').isVisible(),true);await page.keyboard.press('Escape');
 await outside();await page.keyboard.press('f');await page.waitForFunction(()=>document.fullscreenElement===viewer);await page.evaluate(()=>document.exitFullscreen());
 await page.evaluate(async()=>{await viewer.close();document.body.focus();});
 assert.equal(await page.evaluate(()=>{const event=new KeyboardEvent('keydown',{key:' ',bubbles:true,cancelable:true});document.body.dispatchEvent(event);return event.defaultPrevented;}),false);
 assert.deepEqual(errors,[]);
 console.log(`PASS ${family}: page settings/fullscreen shortcuts and empty-player guard; no page errors`);
}finally{try{if(browser)await closeTestBrowser(browser,family);}finally{server.kill();}}
