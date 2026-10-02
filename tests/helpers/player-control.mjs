// SPDX-License-Identifier: Apache-2.0
// Projection fixtures supply physical backend handles separately. Advance the
// real control transition through acceptance instead of mutating its counters.
export function acceptSourceIdentity(player,serial){
  while(player.sourceSerial<serial){
    const {id:attempt}=player.dispatchControl({type:'source.begin',operationEpoch:player.operationEpoch,mode:player.mode,preserve:false,planId:'fixture'});
    for(const type of ['source.created','source.configured','source.opened','source.applied','source.positioned'])player.dispatchControl({type,attempt});
    player.dispatchControl({type:'source.accept',attempt,operationEpoch:player.operationEpoch,settings:player.settings,planMatches:true});
    player.dispatchControl({type:'source.finished',attempt});
  }
}
