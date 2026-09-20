// SPDX-License-Identifier: Apache-2.0
// LAB ONLY: bounded component substitutions. Never imported by production routing.
const fail=message=>{throw Error('UNQUALIFIED component trial: '+message);};
const utf8=bytes=>new TextDecoder('utf-8',{fatal:true}).decode(bytes);
const stamp=seconds=>{const ms=Math.round(seconds*1000);return `${String(Math.floor(ms/3600000)).padStart(2,'0')}:${String(Math.floor(ms/60000)%60).padStart(2,'0')}:${String(Math.floor(ms/1000)%60).padStart(2,'0')}.${String(ms%1000).padStart(3,'0')}`;};
function plain(cues){
 if(!cues.length||cues.some(c=>!(c.end>c.start)||c.start<0||/[<>&\0]/.test(c.text)))fail('non-plain or invalid cue');
 return 'WEBVTT\n\n'+cues.map(c=>`${stamp(c.start)} --> ${stamp(c.end)}\n${c.text}`).join('\n\n')+'\n';
}
export function matroskaCaptions(bytes){
 const b=new Uint8Array(bytes);let elements=0;
 const vint=(p,id=false)=>{const first=b[p];let n=1;while(n<=8&&!(first&(128>>(n-1))))n++;if(n>8||p+n>b.length)fail('EBML vint');let v=id?first:first&((128>>(n-1))-1);for(let i=1;i<n;i++)v=v*256+b[p+i];if(!Number.isSafeInteger(v))fail('unbounded EBML');return [v,p+n];};
 const elems=(start,end)=>{const out=[];while(start<end){if(++elements>100000)fail('EBML element budget');const [id,p]=vint(start,true),[size,q]=vint(p);if(size<0||q+size>end)fail('EBML bounds');out.push({id,p:q,n:size,end:q+size});start=q+size;}return out;};
 const fields=e=>new Map(elems(e.p,e.end).map(x=>[x.id,x]));
 const uint=e=>{if(!e||e.n>6)fail('EBML integer');let n=0;for(let i=e.p;i<e.end;i++)n=n*256+b[i];return n;};
 const text=e=>e?utf8(b.subarray(e.p,e.end)):'';
 const segment=elems(0,b.length).find(e=>e.id===0x18538067);if(!segment)fail('missing Segment');
 const roots=elems(segment.p,segment.end),info=fields(roots.find(e=>e.id===0x1549a966));
 const scale=info.has(0x2ad7b1)?uint(info.get(0x2ad7b1)):1000000;
 const tracks=roots.find(e=>e.id===0x1654ae6b);const subs=elems(tracks.p,tracks.end).filter(e=>e.id===0xae).map(fields).filter(t=>uint(t.get(0x83))===17);
 if(subs.length!==1)fail('requires one subtitle stream');const t=subs[0],codec=text(t.get(0x86));
 if(!['S_TEXT/UTF8','S_TEXT/ASS'].includes(codec)||t.has(0x6d80)||t.has(0x23314f))fail('subtitle codec/encoding/timestamp scale');
 const id=uint(t.get(0xd7)),cues=[];
 for(const cluster of roots.filter(e=>e.id===0x1f43b675)){
  const children=elems(cluster.p,cluster.end),clock=uint(children.find(e=>e.id===0xe7));
  for(const group of children.filter(e=>e.id===0xa0)){
   const f=fields(group),block=f.get(0xa1);if(!block)continue;const [track,q]=vint(block.p);if(track!==id)continue;
   if(q+3>block.end||b[q+2]&6||!f.has(0x9b))fail('laced/undelimited subtitle block');
   const start=(clock+new DataView(b.buffer,b.byteOffset+q,2).getInt16(0))*scale/1e9,end=start+uint(f.get(0x9b))*scale/1e9;
   cues.push({start,end,text:utf8(b.subarray(q+3,block.end))});
  }
  for(const block of children.filter(e=>e.id===0xa3))if(vint(block.p)[0]===id)fail('subtitle SimpleBlock duration not established');
 }
 if(!cues.length)fail('no subtitle cues');
 const fonts=[];for(const container of roots.filter(e=>e.id===0x1941a469))for(const e of elems(container.p,container.end)){const f=fields(e),name=text(f.get(0x466e)),data=f.get(0x465c);if(!/\.(ttf|otf)$/i.test(name)||!data||data.n>8*1024*1024)fail('unsupported attachment');fonts.push({name,bytes:b.slice(data.p,data.end)});}
 if(codec==='S_TEXT/UTF8')return {format:'vtt',text:plain(cues),cues,fonts,readBytes:b.length};
 const time=s=>{if(Math.abs(s*100-Math.round(s*100))>1e-6)fail('ASS timestamp precision');return stamp(s).replace(/^0/,'').slice(0,-1);};
 const header=text(t.get(0x63a2));if(!header.includes('[Events]'))fail('ASS header');
 const script=header.trimEnd()+'\n'+cues.map(c=>{const parts=c.text.split(',');if(parts.length<9)fail('ASS packet');return `Dialogue: ${parts[1]},${time(c.start)},${time(c.end)},${parts.slice(2).join(',')}`;}).join('\n')+'\n';
 return {format:'ass',text:script,cues,fonts,readBytes:b.length};
}
export function mp4Captions(bytes){
 const b=new Uint8Array(bytes),v=new DataView(bytes),u=p=>v.getUint32(p),str=(p,n)=>String.fromCharCode(...b.subarray(p,p+n));
 const boxes=(p,end)=>{const out=[];while(p<end){if(p+8>end)fail('MP4 box header');const n=u(p);if(n<8||p+n>end)fail('MP4 box bounds');out.push({type:str(p+4,4),p:p+8,end:p+n});p+=n;}return out;};
 const child=(box,name)=>boxes(box.p,box.end).find(x=>x.type===name);
 const moov=boxes(0,b.length).find(x=>x.type==='moov');if(!moov)fail('no moov');
 const tracks=boxes(moov.p,moov.end).filter(x=>x.type==='trak').map(trak=>({trak,mdia:child(trak,'mdia')}));
 const sub=tracks.filter(x=>['sbtl','text'].includes(str(child(x.mdia,'hdlr').p+8,4)));if(sub.length!==1)fail('requires one MP4 text track');
 const {trak,mdia}=sub[0],mdhd=child(mdia,'mdhd');if(b[mdhd.p]!==0)fail('mdhd version');const timescale=u(mdhd.p+12);
 let bias=0;const edts=child(trak,'edts');if(edts){const elst=child(edts,'elst');if(b[elst.p]!==0||u(elst.p+4)!==1||v.getInt32(elst.p+12)<0||u(elst.p+16)!==65536)fail('MP4 edit timeline');bias=-v.getInt32(elst.p+12)/timescale;}
 const stbl=child(child(mdia,'minf'),'stbl'),stsd=child(stbl,'stsd');if(u(stsd.p+4)!==1||str(stsd.p+12,4)!=='tx3g')fail('non-tx3g sample description');
 const stts=child(stbl,'stts'),stsz=child(stbl,'stsz'),stsc=child(stbl,'stsc'),stco=child(stbl,'stco');
 if(!stco||child(stbl,'ctts')||child(stbl,'stz2'))fail('unsupported text sample tables');
 const count=u(stsz.p+8);if(count>10000)fail('cue budget');const sizes=Array.from({length:count},(_,i)=>u(stsz.p+4)||u(stsz.p+12+4*i));
 const durations=[];for(let i=0;i<u(stts.p+4);i++){const n=u(stts.p+8+i*8),d=u(stts.p+12+i*8);if(durations.length+n>count)fail('stts count');for(let j=0;j<n;j++)durations.push(d);}
 if(durations.length!==count||u(stsc.p+4)!==1||u(stsc.p+8)!==1||u(stsc.p+16)!==1)fail('text sample mapping');
 const perChunk=u(stsc.p+12),cues=[];let sample=0,clock=0;
 for(let i=0;i<u(stco.p+4);i++){let p=u(stco.p+8+i*4);for(let j=0;j<perChunk&&sample<count;j++,sample++){
  const n=sizes[sample];if(n<2||p+n>b.length||v.getUint16(p)!==n-2)fail('styled or invalid tx3g sample');
  const text=utf8(b.subarray(p+2,p+n)),start=clock/timescale+bias;clock+=durations[sample];if(text)cues.push({start,end:clock/timescale+bias,text});p+=n;
 }}
 if(sample!==count)fail('sample count');return {format:'vtt',text:plain(cues),cues,fonts:[],readBytes:b.length};
}
export async function extractCaptions(url){const response=await fetch(url);if(!response.ok)fail('subtitle source transport');const n=Number(response.headers.get('content-length'));if(!(n>0&&n<=32*1024*1024))fail('32 MiB extraction profile');const bytes=await response.arrayBuffer();if(bytes.byteLength!==n)fail('source length changed');return new URL(url).pathname.endsWith('.mp4')?mp4Captions(bytes):matroskaCaptions(bytes);}

function waitEvent(target,event,signal){
 return new Promise((resolve,reject)=>{
  const finish=error=>{clearTimeout(timer);target.removeEventListener(event,ok);target.removeEventListener('error',bad);signal.removeEventListener('abort',abort);error?reject(error):resolve();};
  const ok=()=>finish(),bad=()=>finish(Error(event+' failed')),abort=()=>finish(Error('trial cancelled'));
  const timer=setTimeout(()=>finish(Error(event+' deadline')),10000);
  target.addEventListener(event,ok,{once:true});target.addEventListener('error',bad,{once:true});signal.addEventListener('abort',abort,{once:true});if(signal.aborted)abort();
 });
}
export async function installDASHTrial(){
 const {NativePlayer}=await import('/demuxe/web/generated/internal/native-player.js');
 const original=NativePlayer.prototype.openRemote,destroy=NativePlayer.prototype.destroy;
 NativePlayer.prototype.openRemote=async function(source){
  if(source.format!=='dash')return original.call(this,source);
  const controller=new AbortController();this.componentController=controller;this.opening=true;
  const fetchBytes=async url=>{const r=await fetch(url,{signal:controller.signal});if(!r.ok)fail('DASH transport');const bytes=await r.arrayBuffer();this.componentBytes=(this.componentBytes??0)+bytes.byteLength;if(this.componentBytes>32*1024*1024)fail('32 MiB manifest buffer');return bytes;};
  const xml=new DOMParser().parseFromString(utf8(await fetchBytes(source.url)),'application/xml');
  const mpd=xml.documentElement;if(mpd.tagName!=='MPD'||mpd.getAttribute('type')!=='static'||xml.querySelectorAll('Period').length!==1||xml.querySelector('ContentProtection,BaseURL,EventStream,parsererror'))fail('finite simple DASH only');
  const ms=new MediaSource();this.objectURL=URL.createObjectURL(ms);this.expectedOutput={video:true,audio:true};
  try{
   const ready=this.load(this.objectURL);ready.catch(()=>{});
   await waitEvent(ms,'sourceopen',controller.signal);
   const definitions=[];
   for(const adaptation of xml.querySelectorAll('AdaptationSet')){
    const reps=adaptation.querySelectorAll('Representation');if(reps.length!==1)fail('multiple representations');const rep=reps[0],template=rep.querySelector('SegmentTemplate');if(!template)fail('segment template');
    const mime=`${rep.getAttribute('mimeType')}; codecs="${rep.getAttribute('codecs')}"`;if(!MediaSource.isTypeSupported(mime))fail('MSE MIME '+mime);const sb=ms.addSourceBuffer(mime);definitions.push({rep,template,sb});
   }
   if(definitions.length!==2)fail('selected A/V destinations');
   for(const {rep,template,sb} of definitions){
    const id=rep.getAttribute('id'),expand=(s,n)=>new URL(s.replaceAll('$RepresentationID$',id).replace(/\$Number(?:%0(\d+)d)?\$/g,(_,w)=>String(n).padStart(Number(w??0),'0')),source.url).href;
    let number=Number(template.getAttribute('startNumber')??1),count=0;
    for(const s of template.querySelectorAll('S')){const r=Number(s.getAttribute('r')??0);if(!Number.isInteger(r)||r<0||count+r+1>100)fail('unbounded timeline');count+=r+1;}
    const append=async bytes=>{const done=waitEvent(sb,'updateend',controller.signal);try{sb.appendBuffer(bytes);}catch(e){controller.abort();await done.catch(()=>{});throw e;}await done;};
    await append(await fetchBytes(expand(template.getAttribute('initialization'),number)));
    for(let i=0;i<count;i++)await append(await fetchBytes(expand(template.getAttribute('media'),number++)));
   }
   ms.endOfStream();await ready;
  }finally{this.opening=false;}
 };
 NativePlayer.prototype.destroy=function(){this.componentController?.abort();return destroy.call(this);};
}
