// SPDX-License-Identifier: Apache-2.0
// Runtime labels require observed execution, independently of successful playback.
export function remuxEvidence(config,state) {
  if(!['jspi','asyncify'].includes(config.lane))return {requested:false};
  const runtime=state.diagnostics?.backend?.remux?.remux;
  if(config.forceRemux&&['native-direct','native-direct-ass'].includes(state.route))
    throw Error('Forced remux reference unexpectedly used a direct-playback bypass');
  if(['native-direct','native-direct-ass'].includes(state.route)&&!runtime)
    return {requested:true,bypass:true,route:state.route};
  const expect=(condition,message)=>{if(!condition)throw Error(message);};
  expect(runtime?.transport===config.lane,'Wrong actual remux runtime: '+JSON.stringify(runtime));
  expect(runtime.sharedHeap===false&&runtime.crossOriginIsolated===false&&runtime.sharedArrayBuffer==='undefined','Private runtime requires non-isolated private memory');
  if(config.lane==='asyncify')expect(runtime.jspiSuspending==='undefined'&&runtime.jspiPromising==='undefined','Asyncify must execute without either JSPI API');
  expect(['native-remux','native-transcode','native-remux-ass','native-remux-mpv','native-transcode-mpv','native-video-mpv-audio','native-video-mpv-audio-subtitles'].includes(state.route),'Private runtime fell back to another route: '+state.route);
  const services={};
  for(const name of ['mpvAudio','mpvSubtitles']){
    const service=state.diagnostics?.backend?.[name];
    if(!service)continue;
    const facts=service.privateRuntime;
    expect(facts?.runtime===config.lane&&facts.memory==='ArrayBuffer'&&facts.crossOriginIsolated===false,'Wrong private '+name+' runtime: '+JSON.stringify(facts));
    if(config.lane==='asyncify')expect(facts.jspiSuspending==='undefined'&&facts.jspiPromising==='undefined','Asyncify '+name+' must execute without JSPI APIs');
    services[name]=facts;
  }
  if(['native-remux-mpv','native-transcode-mpv','native-video-mpv-audio-subtitles'].includes(state.route))expect(services.mpvSubtitles,'Missing private subtitle runtime evidence');
  if(state.route.startsWith('native-video-mpv-audio'))expect(services.mpvAudio,'Missing private audio runtime evidence');
  return {requested:true,bypass:false,route:state.route,runtime,services};
}

export function requireRemuxCPU(config,state) {
  const evidence=remuxEvidence(config,state);
  if(evidence.bypass)throw Error('Requested remux runtime was bypassed; CPU cannot qualify '+config.lane);
  return evidence;
}
