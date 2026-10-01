// SPDX-License-Identifier: Apache-2.0
// Runtime labels require observed execution, independently of successful playback.
export const nonisolatedPlaybackLanes=['hybrid-jspi','hybrid-asyncify','software-jspi','software-asyncify'];
export function playbackLane(lane){
  if(!nonisolatedPlaybackLanes.includes(lane))return null;
  const [mode,runtime]=lane.split('-');return {mode,runtime};
}
export const requiresNonisolated=lane=>['jspi','asyncify',...nonisolatedPlaybackLanes].includes(lane);
export function demuxeLaneOptions(lane){
  const playback=playbackLane(lane);
  if(playback)return {mode:playback.mode,remuxRuntime:playback.runtime};
  return ['jspi','asyncify'].includes(lane)?{experimentalRemuxRuntime:lane}:lane!=='auto'?{mode:lane}:{};
}
export function remuxEvidence(config,state) {
  const playback=playbackLane(config.lane);
  if(playback){
    const backend=state.diagnostics?.backend,selection=state.diagnostics?.remuxRuntime,environment=state.environment;
    const expect=(condition,message)=>{if(!condition)throw Error('UNQUALIFIED: '+message);};
    expect(environment?.crossOriginIsolated===false&&environment.sharedArrayBuffer==='undefined','Playback page is not nonisolated');
    expect(state.diagnostics?.mode===playback.mode,'Wrong requested playback mode');
    expect(selection?.runtime===playback.runtime&&selection.isolated===false,'Wrong selected nonisolated runtime');
    expect(state.route===playback.mode+'-private'&&backend?.plan===playback.mode+'-private','Requested nonisolated playback route was not observed');
    expect(backend?.runtime===playback.runtime&&backend.path==='wasm','Wrong actual private playback runtime');
    if(config.video!==false)expect(backend.decoderBackend===(playback.mode==='hybrid'?'webcodecs':'ffmpeg'),'Wrong actual private video decoder backend');
    return {requested:true,bypass:false,kind:'nonisolated-playback',mode:playback.mode,route:state.route,runtime:backend.runtime,decoderBackend:config.video===false?'not-applicable':backend.decoderBackend,environment,selection};
  }
  if(!['jspi','asyncify'].includes(config.lane))return {requested:false};
  const runtime=state.diagnostics?.backend?.remux?.remux;
  if(config.forceRemux&&['native-direct','native-direct-ass'].includes(state.route))
    throw Error('Forced remux reference unexpectedly used a direct-playback bypass');
  if(['native-direct','native-direct-ass'].includes(state.route)&&!runtime)
    return {requested:true,bypass:true,route:state.route};
  const expect=(condition,message)=>{if(!condition)throw Error(message);};
  if(!runtime)throw Error('UNQUALIFIED: requested remux runtime was not observed on '+state.route);
  expect(runtime?.transport===config.lane,'Wrong actual remux runtime: '+JSON.stringify(runtime));
  expect(runtime.sharedHeap===false&&runtime.crossOriginIsolated===false&&runtime.sharedArrayBuffer==='undefined','Private runtime requires non-isolated private memory');
  if(config.lane==='asyncify')expect(runtime.jspiSuspending==='undefined'&&runtime.jspiPromising==='undefined','Asyncify must execute without either JSPI API');
  expect(['native-remux','native-transcode','native-remux-ass','native-transcode-ass','native-remux-mpv','native-transcode-mpv','native-video-mpv-audio','native-video-mpv-audio-subtitles'].includes(state.route),'Private runtime fell back to another route: '+state.route);
  const services={};
  for(const name of ['mpvAudio','mpvSubtitles']){
    const service=state.diagnostics?.backend?.[name];
    if(!service)continue;
    const facts=service.privateRuntime;
    expect(facts?.runtime===config.lane&&facts.memory==='ArrayBuffer'&&facts.crossOriginIsolated===false,'Wrong private '+name+' runtime: '+JSON.stringify(facts));
    if(config.lane==='asyncify'&&!config.forceRemux)expect(facts.jspiSuspending==='undefined'&&facts.jspiPromising==='undefined','Asyncify '+name+' must execute without JSPI APIs');
    expect(facts.sharedArrayBuffer==='undefined','Private '+name+' requires unavailable SharedArrayBuffer');
    services[name]=facts;
  }
  if(['native-remux-mpv','native-transcode-mpv','native-transcode-ass','native-video-mpv-audio-subtitles'].includes(state.route))expect(services.mpvSubtitles,'Missing private subtitle runtime evidence');
  if(state.route.startsWith('native-video-mpv-audio'))expect(services.mpvAudio,'Missing private audio runtime evidence');
  return {requested:true,bypass:false,route:state.route,runtime,services};
}

export function requireRemuxCPU(config,state) {
  const evidence=remuxEvidence(config,state);
  if(evidence.bypass)throw Error('Requested remux runtime was bypassed; CPU cannot qualify '+config.lane);
  return evidence;
}
