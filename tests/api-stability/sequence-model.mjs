// SPDX-License-Identifier: Apache-2.0
// Serialized into the browser by Playwright; keep all dependencies inside this function.
export async function checkSequenceModel({mode,seed,rounds}) {
  const {Player}=await import('/web/generated/index.js');
  const {bindPlayer}=await import('/web/generated/integration/index.js');
  const p=new Player(document.querySelector('#host'),{...(mode==='auto'?{}:{mode}),preview:{strategy:{type:'on-demand'},debounceMs:0}});
  let binding=bindPlayer(p),rng=seed>>>0;
  const next=()=>{rng^=rng<<13;rng^=rng>>>17;rng^=rng<<5;return(rng>>>0)/4294967296;};
  const expected={volume:1,muted:false,playbackRate:1,playbackIntent:'pause',automaticSelection:mode==='auto',...(mode==='auto'?{}:{activeMode:mode})};
  const permittedRoutes={native:['native-direct','native-direct-mpv','native-remux','native-remux-mpv'],hybrid:['hybrid','hybrid-private'],software:['software','software-private']};
  const trace=[],seenSources=new Set();let source,plan;
  const assert=(condition,message)=>{if(!condition)throw Error(message);};
  const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  // Passive readback: public snapshot() itself enters Player's operation queue
  // and changes preview/promotion pressure, so it cannot observe this model.
  const pixels=async()=>{
    const canvas=document.createElement('canvas');canvas.width=64;canvas.height=36;
    const ctx=canvas.getContext('2d');ctx.drawImage(p.surface,0,0,64,36);
    return ctx.getImageData(0,0,64,36).data;
  };
  const difference=(a,b)=>a.reduce((sum,value,i)=>sum+Math.abs(value-b[i]),0)/a.length;
  const assertState=()=>{
    const s=p.state;
    for(const [key,value]of Object.entries(expected))assert(typeof value==='number'?Math.abs(s[key]-value)<1e-9:s[key]===value,`${key}: expected ${value}, got ${s[key]}`);
    assert(s.sourceId===source,'Unexpected source replacement');
    assert(permittedRoutes[s.activeMode]?.includes(p.diagnostics.plan?.id),'Unexpected route for the finite H.264/AAC fixture');
    if(mode!=='auto')assert(p.diagnostics.plan?.id===plan,'Unrequested forced-mode route change');
    // Auto may legitimately promote or recover. Preview authority itself needs
    // effect-level assertions; simultaneous route change does not prove causation.
    assert(s.status===(expected.playbackIntent==='play'?'playing':'paused'),'Status disagrees with accepted intent');
    assert(!s.pendingOperation&&!s.error,'Operation did not settle cleanly');
    assert(Object.isFrozen(s)&&Object.isFrozen(s.mediaInfo),'Mutable public state');
  };
  const acceptSource=()=>{assert(p.state.sourceId!==null&&!seenSources.has(p.state.sourceId),'Source identity reused');source=p.state.sourceId;seenSources.add(source);};
  // Check output after every command, including non-transport actions. Position
  // alone would miss a frozen renderer while the playback clock keeps advancing.
  const observe=async entry=>{
    entry.expected={...expected,source,plan};
    const untilStatus=performance.now()+6000;
    while(p.state.status!==(expected.playbackIntent==='play'?'playing':'paused')&&performance.now()<untilStatus)await delay(40);
    assertState();const time=p.state.currentTime,before=await pixels();
    if(expected.playbackIntent==='play'){
      const until=performance.now()+6000;let movement=0;
      do{await delay(120);movement=difference(before,await pixels());}while((p.state.currentTime<time+.12||movement<.5)&&performance.now()<until);
      assert(p.state.currentTime>=time+.12&&movement>=.5,'Playing intent without advancing video output');
      entry.output={clockDelta:p.state.currentTime-time,pixelChange:movement};
    }else{
      await delay(150);const movement=difference(before,await pixels());
      assert(Math.abs(p.state.currentTime-time)<.12,'Paused clock kept moving');
      assert(movement<2,'Paused video kept changing');entry.output={clockDelta:p.state.currentTime-time,pixelChange:movement};
    }
    assertState();entry.expected={...expected,source,plan};entry.observed={status:p.state.status,currentTime:p.state.currentTime,mode:p.state.activeMode,plan:p.diagnostics.plan?.id};
  };
  try{
    const movie=new File([await(await fetch('/fixtures/example.mp4')).blob()],'sequence.mp4');
    await p.open(movie);acceptSource();plan=p.diagnostics.plan?.id;assert(plan,'Missing accepted route');
    const actions=['play','pause','seek','volume','mute','rate','burst','latest-seeks','preview','invalid','replace','reopen','rebind'];
    for(let round=0;round<rounds;round++){
      const order=[...actions];for(let i=order.length-1;i>0;i--){const j=Math.floor(next()*(i+1));[order[i],order[j]]=[order[j],order[i]];}
      for(const action of order){
        // Keep this synthetic movie away from EOF, recording this extra action.
        if(p.state.currentTime>8){const entry={action:'seek-away-from-end',target:1};trace.push(entry);await p.seek(1);await observe(entry);}
        const value=next(),entry={round,action,value};trace.push(entry);
        if(action==='play'||action==='pause'){await binding[action]();expected.playbackIntent=action;}
        if(action==='seek'){entry.target=.5+value*5;await p.seek(entry.target);assert(Math.abs(p.state.currentTime-entry.target)<.3,'Seek missed requested position');}
        if(action==='volume'){expected.volume=Math.round(value*100)/100;await binding.setVolume(expected.volume);}
        if(action==='mute'){expected.muted=value>.5;await binding.setMuted(expected.muted);}
        if(action==='rate'){expected.playbackRate=value>.5?1.5:1;await binding.setPlaybackRate(expected.playbackRate);}
        if(action==='burst'){
          entry.commands=Array.from({length:2+Math.floor(next()*5)},()=>next()>.5?'play':'pause');
          await Promise.all(entry.commands.map(command=>binding[command]()));expected.playbackIntent=entry.commands.at(-1);
        }
        if(action==='latest-seeks'){
          entry.targets=[1+value,2+value,3+value];
          const results=await Promise.allSettled(entry.targets.map(time=>p.seek(time,{policy:'latest'})));
          assert(results.at(-1).status==='fulfilled','Latest seek rejected');
          assert(results.every(result=>result.status==='fulfilled'||result.reason.code==='ABORTED'),'Unexpected concurrent seek failure');
          assert(Math.abs(p.state.currentTime-entry.targets.at(-1))<.3,'Concurrent seeks lost final target');
          entry.results=results.map(result=>result.status);
        }
        if(action==='preview'){
          const time=p.state.currentTime,preview=await p.preview.getFrame({time:.5+value*5,width:160});
          if(preview)assert(preview.image.blob?.size>0,'Preview produced an empty image');
          entry.preview=preview?'image':'unavailable-or-suspended';
          if(expected.playbackIntent==='pause')assert(Math.abs(p.state.currentTime-time)<.12,'Preview moved paused playback');
          // Playback source/intent remain unchanged; forced routes stay fixed and
          // Automatic routes remain inside the explicit fixture allowance.
        }
        if(action==='invalid'){let code;try{p.setVolume(-1);}catch(error){code=error.code;}assert(code==='INVALID_ARGUMENT','Invalid volume was accepted');}
        if(action==='replace'||action==='reopen'){
          if(action==='reopen'){await p.close();assert(p.state.status==='idle'&&p.state.sourceId===null&&!p.state.pendingOperation,'Close did not reach idle');}
          await p.open(movie);acceptSource();expected.playbackIntent='pause';
        }
        if(action==='rebind'){const retired=binding;await retired.dispose();binding=bindPlayer(p);const code=await retired.play().then(()=>null,e=>e.code);assert(code==='ABORTED'&&!p.isDestroyed,'Borrowed binding teardown changed ownership');}
        await observe(entry);
      }
    }
    return {mode,seed,trace,scope:'Public state, playback clock and video readback; not audio fidelity'};
  }catch(error){throw Error(String(error)+' mode='+mode+' seed='+seed+' trace='+JSON.stringify(trace));}
  finally{await binding.dispose();await p.destroy();}
}
