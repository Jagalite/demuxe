// SPDX-License-Identifier: Apache-2.0
import {chromium,firefox} from 'playwright';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const family=process.env.BROWSER??'chromium',out=process.env.API_ADVANCED_OUTPUT??`results/api-stability/advanced/${family}-${Date.now()}`;
await mkdir(out,{recursive:true});let browser;const report={family,passed:false,checks:[]};
const server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,PORT:'0'},stdio:['ignore','pipe','inherit']});
try{
  const origin=await new Promise((resolve,reject)=>{server.once('error',reject);server.stdout.on('data',data=>{const match=/http:\/\/127\.0\.0\.1:\d+/.exec(String(data));if(match)resolve(match[0]);});});
  browser=await(family==='firefox'?firefox:chromium).launch({headless:true});report.browser=browser.version();const page=await browser.newPage();
  const errors=[];page.on('pageerror',error=>errors.push(String(error.stack)));
  await page.route('**/__advanced__',route=>route.fulfill({contentType:'text/html',body:'<div id="test"></div>'}));await page.goto(origin+'/__advanced__');
  report.checks=await page.evaluate(async()=>{
    const {Player}=await import('/web/generated/index.js');
    const {AdvancedSettings,advancedSettings,advancedLabels}=await import('/web/generated/player/advanced-settings.js');
    const idle=new Player(document.querySelector('#test'),{preview:false,watchdogs:false});const initial=structuredClone(idle.state);await idle.destroy();
    const assert=(condition,message)=>{if(!condition)throw Error(message);},checks=[];
    const setup=()=>{
      const host=document.createElement('div');document.body.append(host);const root=host.attachShadow({mode:'open'});root.innerHTML='<section id="settings">'+advancedSettings()+'</section>';
      const state=structuredClone(initial);Object.assign(state,{sourceId:1,duration:12,currentTime:2,activeMode:'native',automaticSelection:true,subtitleTracks:[{id:'sub-1',selected:true}],mediaInfo:{...state.mediaInfo,video:{width:640,height:360},chapters:[]}});
      for(const key of Object.keys(state.capabilities.features))state.capabilities.features[key]={availability:'available'};
      const calls=[],failures=[],tasks=[];
      const p={state,isDestroyed:false,surface:document.createElement('video'),diagnostics:{videoFilters:'',audioFilters:'',toneMapping:'off',audioGain:1},presentation:{state:{pictureInPicture:null,mediaSession:false}}};
      for(const name of ['setVideoFilters','setAudioFilters','setAudioGain','setAudioDelay','setSubtitleDelay','setSubtitleStyle','subtitleVisible','setLoop','setPlaybackRange','setQuality','seekToLive','setMode','setAutomaticSelection','addFont','seekChapter','stepFrame','setAudioOutputDevice'])p[name]=async(...args)=>{calls.push([name,...args]);};
      const ui=new AdvancedSettings(root,()=>p,task=>tasks.push(task.catch(error=>failures.push(String(error)))));ui.label(advancedLabels);ui.update(state);
      const get=id=>root.getElementById('advanced-'+id);
      const set=(id,value,event='input')=>{const node=get(id);if(typeof value==='boolean')node.checked=value;else node.value=String(value);node.dispatchEvent(new Event(event,{bubbles:true}));};
      const drain=async()=>{while(tasks.length)await tasks.shift();};
      return {host,root,p,state,ui,calls,failures,get,set,drain,submit:async id=>{get(id).dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));await drain();},click:async id=>{get(id).click();await drain();}};
    };
    const check=async(name,fn)=>{const f=setup();try{await fn(f);checks.push({name,passed:true});}catch(error){checks.push({name,passed:false,error:String(error.stack)});}finally{f.host.remove();}};
    await check('idle, terminal, feature availability and accessible labels',async f=>{
      for(const node of f.root.querySelectorAll('[data-advanced-label]'))assert(node.textContent.trim(),'Empty label');
      for(const node of f.root.querySelectorAll('[aria-describedby]'))assert(f.root.getElementById(node.getAttribute('aria-describedby')),'Missing description');
      f.state.sourceId=null;f.ui.update(f.state);assert([...f.root.querySelectorAll('input,select,button')].every(n=>n.disabled),'Idle controls enabled');
      f.state.sourceId=1;f.state.capabilities.features.videoFilters={availability:'unavailable',reason:'No provider'};f.ui.update(f.state);assert(f.get('vf').disabled,'Unavailable filter enabled');
      f.state.capabilities.features.videoFilters={availability:'switch',mode:'software',reason:'Requires software'};f.ui.update(f.state);assert(!f.get('vf').disabled,'Switchable filter disabled');
      f.p.isDestroyed=true;f.ui.update(f.state);assert([...f.root.querySelectorAll('input,select,button')].every(n=>n.disabled),'Destroyed controls enabled');
    });
    await check('filter presets are drafts until Apply and survive state updates',async f=>{
      f.set('preset','hflip','change');f.ui.update({...f.state,currentTime:3});assert(f.get('vf').value==='hflip'&&!f.calls.length,'Preset applied prematurely or erased');
      await f.submit('video-form');assert(JSON.stringify(f.calls)==='[["setVideoFilters","hflip"]]','Wrong filter command');
    });
    await check('failed filter apply preserves draft and accepted diagnostics',async f=>{
      f.p.setVideoFilters=async()=>{throw Error('Unsupported filter');};f.set('vf','unknown-filter');await f.submit('video-form');
      assert(f.failures.length===1&&f.get('vf').value==='unknown-filter'&&f.p.diagnostics.videoFilters==='','Failure erased draft or changed acceptance');
      assert(!f.get('vf').disabled,'Failure left controls busy');
    });
    await check('successful filter apply, external changes and Reset synchronize',async f=>{
      f.p.setVideoFilters=async value=>{f.p.diagnostics.videoFilters=value;f.ui.update(f.state);};
      f.set('vf','hflip');await f.submit('video-form');f.p.diagnostics.videoFilters='vflip';f.ui.update(f.state);assert(f.get('vf').value==='vflip','Committed draft masked public state');
      await f.click('clear-vf');assert(f.get('vf').value===''&&f.get('preset').value==='','Reset not reflected');
      f.set('af','volume=0.5');await f.submit('audio-form');assert(f.calls.some(c=>c[0]==='setAudioFilters'&&c[1]==='volume=0.5'),'Audio filter not forwarded');
    });
    await check('numeric validation rejects invalid gain and accepts zero',async f=>{
      f.set('gain',2,'change');await f.drain();assert(!f.calls.length&&f.failures.length===1,'Invalid gain dispatched');
      f.set('gain',0,'change');await f.drain();assert(f.calls[0][0]==='setAudioGain'&&f.calls[0][1]===0,'Zero gain rejected');
    });
    await check('immediate failed setting restores accepted value',async f=>{
      f.p.setAudioDelay=async()=>{throw Error('Delay unsupported');};f.set('audio-delay',2,'change');await f.drain();
      assert(f.get('audio-delay').value==='0'&&f.failures.length===1,'Rejected immediate value remained displayed');
    });
    await check('source replacement clears drafts and refreshes identities',async f=>{
      f.set('vf','old draft');f.set('start',5);f.state.sourceId=2;f.state.mediaInfo.chapters=[{id:'chapter-2',start:1,title:'<b>Plain text</b>'}];f.ui.update(f.state);
      assert(f.get('vf').value===''&&f.get('start').value==='0','Retired drafts survived');
      assert(f.get('chapter').options[1].value==='chapter-2'&&!f.get('chapter').querySelector('b'),'Chapter identity or escaping lost');
    });
    await check('subtitle style uses typed optional values and resets',async f=>{
      f.set('sub-size',32);f.set('sub-border',0);f.set('sub-color','#ff00ff');f.set('sub-font','Test Font');await f.submit('style-form');
      const style=f.calls[0][1];assert(style.fontSize===32&&style.borderSize===0&&style.color==='#ff00ff'&&style.fontFamily==='Test Font','Incorrect style');
      await f.click('style-reset');assert(JSON.stringify(f.calls.at(-1))==='["setSubtitleStyle",{}]','Style reset not empty');
      f.state.trackPolicy={subtitles:{locked:true}};f.ui.update(f.state);assert(f.get('sub-visible').disabled,'Locked subtitle visibility enabled');
    });
    await check('range, loop, chapter and frame actions use public identities',async f=>{
      f.set('start',0);f.set('end',5);await f.click('range');await f.click('loop-range');await f.click('clear-range');await f.click('frame-forward');
      assert(JSON.stringify(f.calls.slice(0,3))==='[["setPlaybackRange",{"start":0,"end":5}],["setLoop",{"start":0,"end":5}],["setPlaybackRange",null]]','Incorrect range commands');
      assert(f.calls.at(-1)[0]==='stepFrame'&&f.calls.at(-1)[1]===1,'Frame step not forwarded');
    });
    await check('quality auto limits and forced/automatic modes are distinct',async f=>{
      f.set('max-height',720);f.set('max-bandwidth',1000000);await f.submit('quality-form');f.set('mode','software','change');await f.drain();f.set('mode','auto','change');await f.drain();
      assert(f.calls[0][1].mode==='auto'&&f.calls[0][1].maxHeight===720,'Quality limits wrong');
      assert(JSON.stringify(f.calls.slice(1))==='[["setMode","software"],["setAutomaticSelection",true]]','Mode policy wrong');
    });
    await check('pending action blocks duplicate changes and recovers after rejection',async f=>{
      let reject;f.p.setVideoFilters=()=>new Promise((_,r)=>reject=r);f.set('vf','hflip');f.get('video-form').dispatchEvent(new Event('submit',{cancelable:true}));
      assert(f.get('gain').disabled,'Busy controls enabled');f.get('clear-af').click();assert(!f.calls.length,'Duplicate action dispatched');reject(Error('Failed'));await f.drain();assert(!f.get('gain').disabled,'Busy flag leaked');
    });
    await check('late snapshot from a retired source never starts a download',async f=>{
      let finish;f.p.snapshot=()=>new Promise(resolve=>finish=resolve);let urls=0;const create=URL.createObjectURL,click=HTMLAnchorElement.prototype.click;URL.createObjectURL=()=>{urls++;return 'blob:test';};HTMLAnchorElement.prototype.click=()=>{};
      try{f.get('snapshot').click();f.state.sourceId=2;f.ui.update(f.state);finish({blob:new Blob(['image']),mediaTime:2});await f.drain();assert(urls===0,'Stale source image downloaded');}finally{if(urls)await new Promise(resolve=>setTimeout(resolve,1100));URL.createObjectURL=create;HTMLAnchorElement.prototype.click=click;}
    });
    await check('detached controls cannot dispatch owner operations',async f=>{
      f.host.remove();f.get('clear-vf').click();await f.drain();assert(!f.calls.length,'Detached control mutated owner');
    });
    await check('labels remain plain text and drafts survive relabeling',async f=>{
      f.set('vf','hflip');f.ui.label({...advancedLabels,videoSettings:'<img src=x> Video'});f.ui.update(f.state);
      assert(!f.root.querySelector('img')&&f.get('vf').value==='hflip','Label injection or draft lost');
    });
    await check('font attachment forwards the file and clears the chooser on failure',async f=>{
      const transfer=new DataTransfer(),font=new File(['font'],'example.ttf');transfer.items.add(font);f.get('font-file').files=transfer.files;
      f.p.addFont=async file=>{assert(file.name==='example.ttf','Wrong font');throw Error('Rejected font');};
      f.get('font-file').dispatchEvent(new Event('change',{bubbles:true}));await f.drain();
      assert(f.failures.length===1&&f.get('font-file').value==='','Failed font cannot be selected again');
    });
    await check('manual quality, chapter and live actions forward source-scoped IDs',async f=>{
      f.state.streaming={qualities:[{id:'1:quality',height:720}],requested:{mode:'auto'}};f.state.mediaInfo.chapters=[{id:'1:chapter',start:1,title:'Chapter'}];f.ui.update(f.state);
      f.set('quality','1:quality','change');await f.drain();f.set('chapter','1:chapter','change');await f.drain();await f.click('live');
      assert(JSON.stringify(f.calls)==='[["setQuality",{"mode":"manual","id":"1:quality"}],["seekChapter","1:chapter"],["seekToLive"]]','Source IDs lost');
    });
    await check('presentation actions preserve immediate gesture forwarding',async f=>{
      let invoked=false;f.p.presentation.requestPictureInPicture=async()=>{invoked=true;};f.get('pip').disabled=false;f.get('pip').click();assert(invoked,'Gesture was deferred');await f.drain();
      f.p.presentation.exitPictureInPicture=async()=>f.calls.push(['exitPiP']);f.get('pip-exit').disabled=false;await f.click('pip-exit');
      f.p.presentation.setMediaSessionEnabled=value=>f.calls.push(['mediaSession',value]);f.get('media-session').disabled=false;f.set('media-session',true,'change');await f.drain();
      assert(JSON.stringify(f.calls)==='[["exitPiP"],["mediaSession",true]]','Presentation command lost');
    });
    await check('pending output permission cannot modify a detached or replaced source',async f=>{
      const devices=navigator.mediaDevices,previous=Object.getOwnPropertyDescriptor(devices,'selectAudioOutput');let finish;
      Object.defineProperty(devices,'selectAudioOutput',{configurable:true,value:()=>new Promise(resolve=>finish=resolve)});
      try{
        f.ui.update(f.state);f.get('output').click();f.state.sourceId=2;finish({deviceId:'retired'});await f.drain();assert(!f.calls.length,'Retired source output changed');
        f.get('output').click();f.host.remove();finish({deviceId:'detached'});await f.drain();assert(!f.calls.length,'Detached owner output changed');
        document.body.append(f.host);f.ui.update(f.state);await f.click('output-default');assert(JSON.stringify(f.calls)==='[["setAudioOutputDevice",""]]','Default output not restored');
      }finally{if(previous)Object.defineProperty(devices,'selectAudioOutput',previous);else delete devices.selectAudioOutput;}
    });
    await check('accepted snapshot downloads once and releases its object URL',async f=>{
      const create=URL.createObjectURL,revoke=URL.revokeObjectURL,click=HTMLAnchorElement.prototype.click;let made=0,retired=0,downloads=0;
      URL.createObjectURL=blob=>{assert(blob.size>0,'Empty image');made++;return 'blob:api-test';};URL.revokeObjectURL=()=>retired++;HTMLAnchorElement.prototype.click=function(){downloads++;};
      f.p.snapshot=async options=>{assert(options.includeSubtitles===false,'Snapshot checkbox not honored');return {blob:new Blob(['image']),mediaTime:2};};
      try{await f.click('snapshot');assert(made===1&&downloads===1&&!f.root.querySelector('a'),'Download lifecycle failed');await new Promise(resolve=>setTimeout(resolve,1100));assert(retired===1,'Download URL leaked');}
      finally{URL.createObjectURL=create;URL.revokeObjectURL=revoke;HTMLAnchorElement.prototype.click=click;}
    });
    return checks;
  });
  report.pageErrors=errors;assert.deepEqual(errors,[]);assert.equal(report.checks.length,19);assert.ok(report.checks.every(c=>c.passed),JSON.stringify(report.checks.filter(c=>!c.passed)));report.passed=true;
}finally{await browser?.close();server.kill();await writeFile(out+'/result.json',JSON.stringify(report,null,2)+'\n');}
