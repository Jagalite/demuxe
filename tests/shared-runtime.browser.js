// SPDX-License-Identifier: Apache-2.0
import {DemuxeRuntime,Player} from '/web/generated/index.js';

export async function runSharedRuntimeBrowser(){
  const assert=(value,message)=>{if(!value)throw Error(message);};
  const configuration=await (await fetch('/runtime-test/config')).json();
  const runtime=new DemuxeRuntime({assetBase:location.origin+'/',qualifiedProviders:configuration.qualified});
  const hosts=[0,1].map(()=>{const host=document.createElement('div');host.style.cssText='width:320px;height:180px;display:inline-block';document.body.append(host);return host;});
  const players=[];const checks=[];
  try{
    await Promise.all([runtime.providers.load('/runtime-test/native.json'),runtime.providers.load('/runtime-test/native.json')]);
    players.push(...hosts.map(host=>new Player(host,{runtime,preview:false,watchdogs:false,remuxRuntime:'off'})));
    await Promise.all(players.map(player=>player.openRemote({url:location.origin+'/fixtures/example.mp4'})));
    assert(players.every(player=>player.diagnostics.plan.id==='native-direct'),'Both real players must accept native playback');
    await Promise.all(players.map(player=>player.setMuted(true)));
    await Promise.all(players.map(player=>player.play()));
    const before=players.map(player=>player.state.currentTime);
    await runtime.providers.load('/runtime-test/extra.json',{preload:true});
    await runtime.providers.preload(['cache-test']);
    await new Promise(resolve=>setTimeout(resolve,900));
    assert(players.every((player,index)=>player.state.currentTime>before[index]),'Catalog additions must leave both native players advancing');
    assert(players.every(player=>player.diagnostics.plan.id==='native-direct'),'An irrelevant provider must not replace accepted native playback');
    checks.push('two native players keep advancing across provider publication');
    await players[0].destroy();
    const previous=players[1].state.currentTime;await new Promise(resolve=>setTimeout(resolve,500));
    assert(players[1].state.currentTime>previous,'Destroying one player must preserve the other');
    await runtime.providers.preload(['cache-test']);
    const requests=await (await fetch('/runtime-test/requests')).json();
    assert(requests['/runtime-test/native.json']===1,'Shared manifest must fetch once');
    assert(requests['/runtime-test/cache.wasm']===1,'Preloaded asset must fetch once across repeated acquisitions');
    checks.push('player destruction preserves shared cache and other playback');
    return {passed:true,checks,requests,cache:runtime.cacheStats,revision:runtime.snapshot.revision};
  }finally{await Promise.all(players.map(player=>player.destroy()));await runtime.destroy();hosts.forEach(host=>host.remove());}
}
