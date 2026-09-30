// SPDX-License-Identifier: Apache-2.0
// Browser-side candidate test; run in the collaborative preview or a CI browser.
export async function exercise({bundleName,delivery,item}) {
 const base='/'+bundleName+'/',sha=async b=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',b)),v=>v.toString(16).padStart(2,'0')).join('');
 const bytes=await(await fetch(base+'bundle-manifest.json')).arrayBuffer(),manifest=JSON.parse(new TextDecoder().decode(bytes)),binding={manifestSHA256:await sha(bytes),outputs:{}};
 for(const [name,expected]of Object.entries(manifest.outputs)){const data=await(await fetch(base+name)).arrayBuffer(),actual={bytes:data.byteLength,sha256:await sha(data)};if(actual.sha256!==expected.sha256||actual.bytes!==expected.bytes)throw Error('Bundle integrity mismatch');binding.outputs[name]=actual;}
 const bundle=await import(base+'demuxe.mjs'),runtime=delivery==='embedded'?await bundle.createDemuxeRuntime():undefined,Player=runtime?.api.Player??bundle.Player;
 const host=document.createElement('div');host.style.cssText='width:320px;height:180px';document.body.append(host);
 // Observe destination-bound nodes without replacing the player's connections.
 const taps=[],connect=AudioNode.prototype.connect,disconnect=AudioNode.prototype.disconnect;
 AudioNode.prototype.connect=function(destination,...args){
  const returned=connect.call(this,destination,...args);
  if(destination===this.context.destination){const analyser=this.context.createAnalyser(),sink=this.context.createGain();sink.gain.value=0;connect.call(this,analyser,args[0]??0);connect.call(analyser,sink);connect.call(sink,destination);taps.push({source:this,analyser,sink,active:true});}
  return returned;
 };
 AudioNode.prototype.disconnect=function(...args){const returned=disconnect.apply(this,args);if(!args.length||typeof args[0]==='number'||args[0]===this.context.destination)for(const tap of taps)if(tap.source===this)tap.active=false;return returned;};
 const player=new Player(host,{assetBase:runtime?.assetBase??bundle.assetBase,preview:false,...item.options}),errors=[];
 player.addEventListener('error',e=>errors.push(e.detail));const result={bundleName,delivery,item,binding,audio:[],seeks:[]};
 try{
  const response=await fetch(item.file==='example.mp4'?'/example.mp4':'/fixtures/'+item.file);if(!response.ok)throw Error('Fixture missing');const data=await response.arrayBuffer();result.fixtureSHA256=await sha(data);
  await player.open(new File([data],item.file));await player.play();
  const sample=()=>{let peak=0;for(const {analyser,active} of taps){if(!active)continue;const data=new Float32Array(analyser.fftSize);analyser.getFloatTimeDomainData(data);for(const value of data)peak=Math.max(peak,Math.abs(value));}return peak;};
  const wait=async(target,stage)=>{let peak=0;const start=player.state.currentTime,until=performance.now()+15000;do{if(player.state.currentTime>=start+.1)peak=Math.max(peak,sample());await new Promise(r=>setTimeout(r,25));}while((player.state.currentTime<target||peak<.001)&&performance.now()<until);if(player.state.currentTime<target)throw Error('Playback stalled');if(peak<.001)throw Error('Missing audio output: '+stage);result.audio.push({stage,peak,start,end:player.state.currentTime});};
  await wait(.5,'initial');await player.pause();const paused=player.state.currentTime;await new Promise(r=>setTimeout(r,150));if(Math.abs(player.state.currentTime-paused)>.15)throw Error('Pause failed');await player.play();
  for(const target of [2,.5]){
   // Paused arrival makes the target assertion independent of seek latency.
   await player.pause();await player.seek(target);const arrival=player.state.currentTime;
   if(Math.abs(arrival-target)>.25)throw Error('Seek missed target: '+JSON.stringify({target,arrival}));
   result.seeks.push({target,arrival});await player.play();await wait(arrival+.3,'seek-'+target);
  }
  const canvas=document.createElement('canvas');canvas.width=160;canvas.height=90;const context=canvas.getContext('2d');context.drawImage(player.surface,0,0,160,90);const rgba=context.getImageData(0,0,160,90).data;
  const nonblack=rgba.some((v,i)=>i%4!==3&&v>60);if(!nonblack)throw Error('Black video');
  result.plan=player.getPlaybackExplanation().planId;result.time=player.state.currentTime;result.nonblack=nonblack;result.diagnostics=player.diagnostics;result.errors=errors;
  if(result.plan!==item.plan)throw Error('Unexpected plan '+result.plan);if(errors.length)throw Error('Playback emitted errors');
  return result;
 }catch(error){throw Error(String(error)+'; '+JSON.stringify({diagnostics:player.diagnostics,explanation:player.getPlaybackExplanation(),errors}));}
 finally{AudioNode.prototype.connect=connect;AudioNode.prototype.disconnect=disconnect;try{await player.destroy();}finally{for(const tap of taps){tap.analyser.disconnect();tap.sink.disconnect();}runtime?.dispose();result.after=runtime?.diagnostics();host.remove();}}
}
