// SPDX-License-Identifier: Apache-2.0
// Independent research owner for plain, ordered, nonoverlapping native captions.
export async function installCueOwner(player, asset, cues, mode) {
  if (!['window','eager'].includes(mode) || player.remux) throw Error('R048 requires direct native route');
  let previous=-Infinity;
  for (const cue of cues) {
    if (!Number.isFinite(cue.start) || !Number.isFinite(cue.end) || cue.start < previous || cue.end <= cue.start || /[<>&\0]/.test(cue.text)) throw Error('R048 unsupported cue contract');
    previous=cue.end;
  }
  const url=URL.createObjectURL(new Blob(['WEBVTT\n\n'],{type:'text/vtt'}));player.captionURLs.add(url);
  let element;try{element=await player.loadTextTrack({src:url,label:asset.label,language:asset.language,default:false},true);player.assertActive();}catch(e){URL.revokeObjectURL(url);player.captionURLs.delete(url);throw e;}
  const track=element.track;track.mode='hidden';
  const live=new Map(),stats={mode,sourceCues:cues.length,instantiated:0,removed:0,live:0,peak:0,refreshes:0,closed:false};
  const update=()=>{
    if(stats.closed||player.stopped||(mode==='eager'&&stats.refreshes))return;
    const t=player.video.currentTime,lower=t-5,upper=t+15;let from=0,to=cues.length;
    if(mode==='window'){
      let lo=0,hi=cues.length;while(lo<hi){const m=(lo+hi)>>>1;if(cues[m].end<=lower)lo=m+1;else hi=m;}from=lo;
      lo=from;hi=cues.length;while(lo<hi){const m=(lo+hi)>>>1;if(cues[m].start<upper)lo=m+1;else hi=m;}to=lo;
    }
    for(const [index,cue] of live)if(index<from||index>=to){track.removeCue(cue);live.delete(index);stats.removed++;}
    for(let i=from;i<to;i++)if(!live.has(i)){const c=cues[i],cue=new VTTCue(c.start,c.end,c.text);track.addCue(cue);if(mode==='window')live.set(i,cue);stats.instantiated++;}
    stats.live=mode==='eager'?cues.length:live.size;stats.peak=Math.max(stats.peak,stats.live);stats.refreshes++;
  };
  const events=['timeupdate','seeking','seeked','loadedmetadata'];
  const owner={element,track,stats,update,destroy(){if(stats.closed)return;stats.closed=true;for(const e of events)player.video.removeEventListener(e,update);track.mode='hidden';for(const cue of mode==='eager'?Array.from(track.cues??[]):live.values()){track.removeCue(cue);stats.removed++;}live.clear();stats.live=0;element.remove();}};
  try{update();if(mode==='window')for(const e of events)player.video.addEventListener(e,update);}
  catch(e){owner.destroy();throw e;}
  (player.researchCueWindows??=[]).push(owner);
  player.captionAssets.set(track,{asset,index:player.captionAssets.size+1});
  if(asset.select){for(const old of Array.from(player.video.querySelectorAll('track')))old.default=false;element.default=true;}
  player.applySubtitles();player.refresh();return owner;
}
