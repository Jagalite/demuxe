// SPDX-License-Identifier: Apache-2.0
/** Runs directly in a browser page, including the collaborative browser. */
export async function checkLivePresentation({axeURL}={}){
 const assert=(ok,message)=>{if(!ok)throw Error(message);};
 const wait=async fn=>{const end=performance.now()+5000;while(!fn()){if(performance.now()>end)throw Error('Presentation observation deadline');await new Promise(r=>setTimeout(r,20));}};
 const {definePlayerElement}=await import('/web/generated/player/index.js');definePlayerElement();
 const viewer=document.createElement('demuxe-player');viewer.controls=true;viewer.previewOptions=false;viewer.style.cssText='display:block;width:640px;max-width:100%';document.body.append(viewer);await viewer.ready;
 const report={ua:navigator.userAgent,cases:[]};let stop;
 try{
  await viewer.setMuted(true);await viewer.open('/fixtures/example.mp4');const p=viewer.player,source=p.state.sourceId,surface=p.surface;
  const stage=viewer.shadowRoot.getElementById('stage');assert(stage.getAttribute('role')==='region'&&stage.getAttribute('aria-label'),'Playback landmark semantics absent');
  report.cases.push({name:'Named playback region',passed:true,role:stage.getAttribute('role')});
  const observations=[];stop=p.presentation.subscribe(s=>observations.push(s));viewer.requestFullscreen=()=>Promise.reject(new DOMException('Injected denial','NotAllowedError'));
  viewer.shadowRoot.getElementById('fullscreen').click();await wait(()=>p.presentation.state.viewportExpanded);
  assert(!p.presentation.state.fullscreen&&observations.at(-1).viewportExpanded,'Expanded state not observed');assert(p.surface===surface&&p.state.sourceId===source,'Expansion replaced playback');
  p.presentation.exitViewportExpansion();assert(!observations.at(-1).viewportExpanded&&!viewer.shadowRoot.getElementById('shell').matches(':popover-open'),'External exit did not restore UI');
  p.presentation.requestViewportExpansion();assert(viewer.shadowRoot.getElementById('fullscreen').getAttribute('aria-pressed')==='true','External entry did not update built-in control');p.presentation.exitViewportExpansion();
  report.cases.push({name:'Shared viewport state, subscription and external commands',passed:true,observations});
  p.presentation.setMediaSessionMetadata({title:'Integration source',artist:'Demuxe'},source);p.presentation.setMediaSessionEnabled(true);assert(navigator.mediaSession.metadata.title==='Integration source','Metadata not published');
  await viewer.open('/fixtures/example.mp4');assert(navigator.mediaSession.metadata===null,'Replacement retained stale OS metadata');
  let rejected;try{p.presentation.setMediaSessionMetadata({title:'Late'},source);}catch(e){rejected=e.code;}assert(rejected==='ABORTED','Retired metadata accepted');
  p.presentation.setMediaSessionMetadata({title:'Replacement'},p.state.sourceId);p.presentation.setMediaSessionEnabled(false);assert(navigator.mediaSession.metadata===null,'Disabled lease retained metadata');
  report.cases.push({name:'Browser metadata source fencing and release',passed:true,staleError:rejected});
  if(axeURL){
   await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=axeURL;script.onload=resolve;script.onerror=reject;document.head.append(script);});
   for(const mode of ['desktop','mobile'])for(const settings of [false,true]){
    viewer.controlsMode=mode;viewer.settings(settings,false);const result=await globalThis.axe.run(viewer,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});
    report.cases.push({name:`axe ${mode} settings=${settings}`,passed:result.violations.length===0,violations:result.violations.map(v=>({id:v.id,impact:v.impact,targets:v.nodes.map(n=>n.target)})),incomplete:result.incomplete.map(v=>v.id)});
   }
   viewer.settings(false,false);
  }
  const count=observations.length;stop();p.presentation.requestViewportExpansion();assert(observations.length===count,'Disposed observer called');await viewer.destroy();assert(document.body.style.overflow!=='hidden','Destruction left document scroll locked');
  report.cases.push({name:'Expanded destruction and observer cleanup',passed:true});
 }finally{stop?.();await viewer.destroy();viewer.remove();}
 report.passed=report.cases.every(c=>c.passed);return report;
}
