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
  expect(['native-remux','native-transcode'].includes(state.route),'Private runtime fell back to another route: '+state.route);
  return {requested:true,bypass:false,route:state.route,runtime};
}

export function requireRemuxCPU(config,state) {
  const evidence=remuxEvidence(config,state);
  if(evidence.bypass)throw Error('Requested remux runtime was bypassed; CPU cannot qualify '+config.lane);
  return evidence;
}
