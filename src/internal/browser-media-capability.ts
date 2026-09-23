// SPDX-License-Identifier: Apache-2.0
import type {Probe, ProbeTrack} from './selection.js';

export type BrowserMediaCapability = {
  status:'supported'|'unsupported'|'unknown';
  api:'canPlayType'|'isTypeSupported';
  tracks:Array<{index:number;type:string;codec:string;codecString?:string}>;
  queries:Array<{mime:string;result:string|boolean}>;
  unqueriedAudio?:boolean;
  reason?:string;
};
type BrowserQueries = {canPlayType:(mime:string)=>string;isTypeSupported?:(mime:string)=>boolean};

// These are MIME/configuration mappings, never a table of browser support.
// Profile-dependent codecs require source-derived configuration, not a guessed profile.
function codec(track:ProbeTrack,format?:string):string|undefined {
  if(track.codecString)return track.codecString;
  if(track.codec==='aac')return track.aacObject?`mp4a.40.${track.aacObject}`:undefined;
  if(format?.split(',').includes('wav')){
    if(/^pcm_(?:[su](?:16|24|32)le|u8)$/.test(track.codec))return '1';
    if(/^pcm_f(?:32|64)le$/.test(track.codec))return '3';
  }
  return ({ac3:'ac-3',eac3:'ec-3',mp3:'mp3',opus:'opus',vorbis:'vorbis',flac:'flac',alac:'alac',vp8:'vp8'} as Record<string,string>)[track.codec];
}
function containers(probe:Probe,video:boolean):string[] {
  const formats=probe.format?.split(',')??[],kind=video?'video':'audio';
  if(formats.some(f=>['mov','mp4','m4a','3gp','3g2','mj2'].includes(f)))return [`${kind}/mp4`];
  if(formats.includes('matroska'))return ['video/x-matroska'];
  if(formats.includes('webm'))return [`${kind}/webm`];
  if(formats.includes('ogg'))return [`${kind}/ogg`];
  if(formats.includes('mpegts'))return ['video/mp2t'];
  if(formats.includes('mp3'))return ['audio/mpeg'];
  if(formats.includes('aac'))return ['audio/aac'];
  if(formats.includes('flac'))return ['audio/flac'];
  if(formats.includes('wav'))return ['audio/wav'];
  return [];
}

/** Query the browser for the actual selected streams and the destination of each
 * Native plan before allocating a playback backend. Unknowns remain explicit and
 * must be resolved by preparation/startup; a negative answer excludes the plan. */
export function nativeBrowserCapabilities(probe:Probe,aid:string,browser:BrowserQueries) {
  const video=probe.tracks.find(t=>t.type==='video'&&!t.attachedPicture);
  const audioTracks=probe.tracks.filter(t=>t.type==='audio');
  const audio=aid==='no'?undefined:aid==='auto'?(audioTracks.find(t=>t.default)??audioTracks[0]):audioTracks.find(t=>t.id===aid);
  const selected=[video,audio].filter((t):t is ProbeTrack=>!!t);
  const evaluate=(prepared:boolean,adaptation?:'flac'|'opus',audioVariant?:string):BrowserMediaCapability=>{
    const api=prepared?'isTypeSupported':'canPlayType';
    const tracks=selected.map(t=>({index:t.index,type:t.type,codec:t.codec,codecString:t===audio&&(adaptation||audioVariant)?adaptation??audioVariant:codec(t,probe.format)}));
    const queries:BrowserMediaCapability['queries']=[];
    const evidence:BrowserMediaCapability={status:'unknown',api,tracks,queries};
    if(!selected.length){evidence.reason='No selected streams to query';return evidence;}
    // Remux packaging has its own later packet-construction checks. Query only
    // formats that can carry these selected codecs; adaptation queries its output.
    const webm=tracks.every(t=>!t.codecString||(t.type==='video'?/^(vp8$|vp09\.|av01\.)/:/^(opus|vorbis)$/).test(t.codecString));
    const types=prepared?[`${video?'video':'audio'}/mp4`,...(webm?[`${video?'video':'audio'}/webm`]:[])]:containers(probe,!!video);
    // Raw FLAC and ADTS identify their codec in the MIME type. Adding an MP4
    // codecs parameter makes otherwise supported raw files fail canPlayType.
    const bare=!prepared&&tracks.length===1&&((types[0]==='audio/flac'&&audio?.codec==='flac')||(types[0]==='audio/aac'&&audio?.codec==='aac'));
    const mapped=tracks.filter(t=>t.codecString);
    const missing=tracks.filter(t=>!t.codecString&&!bare);
    evidence.unqueriedAudio=missing.some(t=>t.type==='audio');
    if(!types.length){evidence.reason=`No MIME mapping for inspected container ${probe.format??'unknown'}`;return evidence;}
    if(!mapped.length&&!bare){evidence.reason='Selected codec configuration is unavailable';return evidence;}
    let unknown=false,accepted=false;
    for(const type of types){
      // A per-track query also catches missing audio when the video profile is unknown.
      const combinations=bare?[[]]:[...mapped.map(t=>[t.codecString!]),...(missing.length?[]:[mapped.map(t=>t.codecString!)])];
      let rejected=false,uncertain=false;
      for(const codecs of combinations){
        const mime=bare?type:`${type}; codecs="${codecs.join(',')}"`;
        let result:string|boolean;
        try{
          if(prepared&&!browser.isTypeSupported){uncertain=true;continue;}
          result=prepared?browser.isTypeSupported!(mime):browser.canPlayType(mime);
        }catch{uncertain=true;continue;}
        if(!queries.some(q=>q.mime===mime))queries.push({mime,result});
        if(result===false||result==='')rejected=true;
        else if(result!==true&&result!=='probably')uncertain=true;
      }
      if(!rejected){if(uncertain||missing.length)unknown=true;else accepted=true;}
    }
    evidence.status=accepted?'supported':unknown?'unknown':'unsupported';
    if(evidence.status==='unsupported')evidence.reason=`Browser ${api} rejects selected ${tracks.map(t=>`${t.type} ${t.codecString??t.codec}`).join(' + ')} for ${types.join(' or ')}`;
    else if(evidence.status==='unknown')evidence.reason=missing.length?'Selected codec configuration is incomplete; runtime verification is required':'Browser capability is inconclusive; runtime verification is required';
    return evidence;
  };
  const plan=(prepared:boolean,adaptation?:'flac'|'opus'):BrowserMediaCapability=>{
    if(audio?.codec!=='dts'||codec(audio)||adaptation)return evaluate(prepared,adaptation);
    // The inspector currently reports the DTS family, not its profile. Query
    // the registered variants instead of guessing that every DTS track is core.
    // A family-wide negative is decisive; one positive does not prove this file.
    const variants=['dtsc','dtsh','dtsl','dtse','dtsx','dtsy'].map(value=>evaluate(prepared,undefined,value));
    const unsupported=variants.every(v=>v.status==='unsupported');
    return {...variants[0],status:unsupported?'unsupported':'unknown',
      tracks:variants[0].tracks.map(t=>t.type==='audio'?{...t,codecString:undefined}:t),
      queries:variants.flatMap(v=>v.queries).filter((q,i,all)=>all.findIndex(p=>p.mime===q.mime)===i),
      reason:unsupported?`Browser ${variants[0].api} rejects selected DTS audio in every queried profile`:'DTS profile is unknown; runtime verification is required'};
  };
  return {direct:plan(false),remux:plan(true),flac:plan(true,'flac'),opus:plan(true,'opus')};
}
